import { describe, expect, it } from "vitest";

import { decodeKey, openToken, sealToken } from "@/lib/crypto/token-cipher";
import { classifyMetaError, isRetryable, sanitizeMetaMessage } from "@/lib/meta/errors";
import { parseInsightRows, toMetricColumns } from "@/lib/meta/insights";
import { chooseResultEvent, eventValue, LEAD, MESSAGES, PURCHASE } from "@/lib/meta/results";
import { parseMetaUsage } from "@/lib/meta/usage";

const day = (actions: { action_type: string; value: string }[], extra = {}) => ({
  date_start: "2026-10-01",
  date_stop: "2026-10-01",
  spend: "100.50",
  impressions: "12000",
  inline_link_clicks: "210",
  actions,
  ...extra,
});

describe("result event per campaign", () => {
  it("never sums duplicated variants of the same event", () => {
    const actions = [
      { action_type: "purchase", value: "7" },
      { action_type: "omni_purchase", value: "7" },
      { action_type: "offsite_conversion.fb_pixel_purchase", value: "7" },
    ];
    expect(eventValue(actions, PURCHASE)).toBe(7);
  });

  it("picks the event the campaign actually produced", () => {
    // A leads campaign optimised for WhatsApp conversations.
    const rows = [
      day([{ action_type: "onsite_conversion.messaging_conversation_started_7d", value: "4" }]),
    ];
    expect(chooseResultEvent("OUTCOME_LEADS", rows)).toBe(MESSAGES);
    expect(chooseResultEvent("OUTCOME_LEADS", [day([{ action_type: "lead", value: "2" }])])).toBe(
      LEAD,
    );
  });

  it("falls back to the objective's main event, or none for awareness", () => {
    expect(chooseResultEvent("OUTCOME_SALES", [day([])])).toBe(PURCHASE);
    expect(chooseResultEvent("OUTCOME_AWARENESS", [day([])])).toBeNull();
    expect(chooseResultEvent(null, [day([])])).toBeNull();
  });
});

describe("insight row → metric columns", () => {
  it("parses strings and keeps the sales funnel for purchase campaigns", () => {
    const { rows } = parseInsightRows([
      day(
        [
          { action_type: "purchase", value: "3" },
          { action_type: "add_to_cart", value: "11" },
        ],
        { action_values: [{ action_type: "purchase", value: "240.9" }] },
      ),
    ]);
    const m = toMetricColumns(rows[0]!, PURCHASE);
    expect(m).toMatchObject({
      date: "2026-10-01",
      spend: 100.5,
      impressions: 12000,
      inline_link_clicks: 210,
      results: 3,
      result_indicator: PURCHASE.indicator,
      purchase_value: 240.9,
      add_to_cart: 11,
      initiate_checkout: 0,
    });
  });

  it("counts a missing action as zero only when the campaign has a result event", () => {
    const { rows } = parseInsightRows([day([])]);
    expect(toMetricColumns(rows[0]!, LEAD).results).toBe(0);
    const awareness = toMetricColumns(rows[0]!, null);
    expect(awareness.results).toBeNull();
    expect(awareness.purchase_value).toBeNull();
  });

  it("reports invalid rows instead of inventing values", () => {
    const { rows, invalid } = parseInsightRows([{ date_start: "ontem" }, day([])]);
    expect(rows).toHaveLength(1);
    expect(invalid).toBe(1);
  });
});

describe("Meta errors", () => {
  it.each([
    [400, { code: 190, error_subcode: 463 }, "auth"],
    [403, { code: 200 }, "permission"],
    [400, { code: 17 }, "rate_limit"],
    [400, { code: 80004 }, "rate_limit"],
    [400, { code: 100, error_subcode: 1487534 }, "too_much_data"],
    [500, {}, "transient"],
    [400, { code: 1 }, "transient"],
    [400, { code: 100 }, "invalid"],
  ] as const)("HTTP %s %j → %s", (status, body, kind) => {
    expect(classifyMetaError(status, body)).toBe(kind);
  });

  it("retries only what can succeed later", () => {
    expect(isRetryable("rate_limit")).toBe(true);
    expect(isRetryable("auth")).toBe(false);
  });

  it("never lets a token through an error message", () => {
    const dirty =
      "Invalid request https://graph.facebook.com/v25.0/me?access_token=EAABsecret123&appsecret_proof=abc token EAAG1234567890abcdefghijklmnop";
    const clean = sanitizeMetaMessage(dirty);
    expect(clean).not.toContain("EAABsecret123");
    expect(clean).not.toContain("EAAG1234567890abcdefghijklmnop");
    expect(clean).not.toContain("appsecret_proof=abc");
  });
});

describe("usage headers", () => {
  it("reads the highest utilisation and the suggested wait", () => {
    const headers = new Headers({
      "x-fb-ads-insights-throttle": JSON.stringify({
        app_id_util_pct: 12,
        acc_id_util_pct: 81,
        ads_api_access_tier: "development_access",
      }),
      "x-business-use-case-usage": JSON.stringify({
        "123": [
          {
            type: "ads_insights",
            call_count: 40,
            total_cputime: 9,
            total_time: 5,
            estimated_time_to_regain_access: 3,
          },
        ],
      }),
    });
    expect(parseMetaUsage(headers)).toEqual({
      maxPercent: 81,
      waitMinutes: 3,
      accessTier: "development_access",
    });
  });

  it("survives missing or malformed headers", () => {
    expect(parseMetaUsage(new Headers({ "x-app-usage": "not json" }))).toEqual({
      maxPercent: null,
      waitMinutes: 0,
      accessTier: null,
    });
  });
});

describe("token encryption", () => {
  const key = decodeKey(Buffer.alloc(32, 7).toString("base64"));

  it("round-trips and never stores the plain token", () => {
    const sealed = sealToken("EAAtoken-de-teste", key, 1);
    expect(sealed.ciphertext).not.toContain("EAAtoken");
    expect(openToken(sealed, key)).toBe("EAAtoken-de-teste");
  });

  it("uses a fresh IV each time and rejects tampering or a wrong key", () => {
    const a = sealToken("x", key, 1);
    const b = sealToken("x", key, 1);
    expect(a.iv).not.toBe(b.iv);
    const tampered = { ...a, ciphertext: Buffer.from("y").toString("base64") };
    expect(() => openToken(tampered, key)).toThrow();
    expect(() => openToken(a, decodeKey(Buffer.alloc(32, 9).toString("base64")))).toThrow();
  });

  it("refuses keys of the wrong size", () => {
    expect(() => decodeKey(undefined)).toThrow();
    expect(() => decodeKey(Buffer.alloc(16).toString("base64"))).toThrow(/32 bytes/);
  });
});
