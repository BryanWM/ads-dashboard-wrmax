import { describe, expect, it } from "vitest";

import {
  campaignObjectiveLabel,
  campaignStatus,
  combineSyncStates,
  latestIndicator,
  num,
  toDatedRow,
} from "@/lib/read-model/db-rows";

const NOW = new Date("2026-10-13T15:00:00Z");
const ok = (at: string, through: string) => ({
  last_success_at: at,
  data_through_date: through,
  consecutive_failures: 0,
  last_error_message: null,
});

describe("database row mapping", () => {
  it("keeps missing values as null and parses numeric strings", () => {
    expect(num(null)).toBeNull();
    expect(num(undefined)).toBeNull();
    expect(num("12.5")).toBe(12.5);
    expect(num(0)).toBe(0);
    const row = toDatedRow({
      date: "2026-10-01",
      spend: "10.00",
      impressions: 1000,
      inline_link_clicks: null,
      results: null,
      result_indicator: null,
      purchase_value: null,
    });
    expect(row.spend).toBe(10);
    expect(row.linkClicks).toBeNull();
    expect(row.results).toBeNull();
    expect(row.addToCart).toBeNull();
  });

  it("maps Meta statuses to the three shown states", () => {
    expect(campaignStatus("ACTIVE", "ACTIVE")).toBe("active");
    expect(campaignStatus("CAMPAIGN_PAUSED", "ACTIVE")).toBe("paused");
    expect(campaignStatus(null, "ARCHIVED")).toBe("archived");
    expect(campaignStatus(null, null)).toBe("paused");
  });

  it("names the campaign by its optimised result before Meta's objective", () => {
    const messages = "actions:onsite_conversion.messaging_conversation_started_7d";
    expect(campaignObjectiveLabel("OUTCOME_ENGAGEMENT", messages)).toBe("Mensagens");
    expect(campaignObjectiveLabel("OUTCOME_SALES", null)).toBe("Vendas");
    expect(campaignObjectiveLabel("SOMETHING_NEW", null)).toBe("Outro");
  });

  it("uses the latest result type seen", () => {
    const base = { spend: 1, impressions: 1, linkClicks: 1, results: 1 };
    expect(
      latestIndicator([
        { ...base, date: "2026-10-02", resultIndicator: "actions:lead" },
        { ...base, date: "2026-10-03", resultIndicator: null },
        { ...base, date: "2026-10-01", resultIndicator: "actions:link_click" },
      ]),
    ).toBe("actions:lead");
  });
});

describe("combined sync status", () => {
  it("is 'never' without any success", () => {
    expect(combineSyncStates([], NOW).health).toBe("never");
  });

  it("is ok when every account synced recently", () => {
    const s = combineSyncStates([ok("2026-10-13T09:12:00Z", "2026-10-12")], NOW);
    expect(s).toMatchObject({ health: "ok", dataThrough: "2026-10-12" });
  });

  it("takes the most conservative view across accounts", () => {
    const s = combineSyncStates(
      [ok("2026-10-13T09:12:00Z", "2026-10-12"), ok("2026-10-12T09:12:00Z", "2026-10-11")],
      NOW,
    );
    expect(s.lastSuccessAt).toBe("2026-10-12T09:12:00Z");
    expect(s.dataThrough).toBe("2026-10-11");
  });

  it("reports failures with the sanitised message", () => {
    const s = combineSyncStates(
      [
        ok("2026-10-13T09:12:00Z", "2026-10-12"),
        {
          ...ok("2026-10-11T09:12:00Z", "2026-10-10"),
          consecutive_failures: 2,
          last_error_message: "Limite",
        },
      ],
      NOW,
    );
    expect(s).toMatchObject({ health: "failing", lastError: "Limite" });
  });

  it("is stale after a missed run or with an account never synced", () => {
    expect(combineSyncStates([ok("2026-10-11T09:12:00Z", "2026-10-10")], NOW).health).toBe("stale");
    const never = {
      ...ok("2026-10-13T09:12:00Z", "2026-10-12"),
      last_success_at: null,
      data_through_date: null,
    };
    expect(combineSyncStates([ok("2026-10-13T09:12:00Z", "2026-10-12"), never], NOW).health).toBe(
      "stale",
    );
  });
});
