import { describe, expect, it } from "vitest";

import type { DailyPoint, MetricsSnapshot } from "@/lib/domain/types";
import { buildFunnel } from "@/lib/overview/funnel";
import {
  choosePrimaryIndicator,
  primaryResultFor,
  type PrimaryResult,
} from "@/lib/overview/primary-result";
import { evaluateHealth, isHighFrequency } from "@/lib/overview/signals";
import { buildSummary, summaryText } from "@/lib/overview/summary";
import { aggregateByWeekday } from "@/lib/overview/weekday";

const PURCHASE = "actions:offsite_conversion.fb_pixel_purchase";
const MESSAGES = "actions:onsite_conversion.messaging_conversation_started_7d";

const nbsp = (s: string) => s.replace(/ | /g, " ");

function breakdown(indicator: string, spend: number, results: number, extra = {}) {
  return {
    resultIndicator: indicator,
    spend,
    results,
    costPerResult: spend / results,
    impressions: null,
    linkClicks: null,
    purchaseValue: null,
    addToCart: null,
    initiateCheckout: null,
    ...extra,
  };
}

const snapshot = (resultTypes: MetricsSnapshot["resultTypes"]) =>
  ({ metrics: {} as MetricsSnapshot["metrics"], resultTypes }) as MetricsSnapshot;

describe("main result", () => {
  const mixed = snapshot([breakdown(MESSAGES, 600, 40), breakdown(PURCHASE, 400, 10)]);

  it("uses the declared objective even when another type has more spend", () => {
    const { indicator, source } = choosePrimaryIndicator({ objective: "purchases" }, mixed);
    expect(indicator).toBe(PURCHASE);
    expect(source).toBe("objective");
    const primary = primaryResultFor(mixed, indicator, source);
    expect(primary).toMatchObject({
      spend: 400,
      results: 10,
      costPerResult: 40,
      hasOtherTypes: true,
    });
  });

  it("falls back to the type with most spend, never summing types", () => {
    const { indicator } = choosePrimaryIndicator({ objective: null }, mixed);
    expect(indicator).toBe(MESSAGES);
    expect(primaryResultFor(mixed, indicator, "largest-spend").results).toBe(40);
  });

  it("reports missing (not zero) when the objective has no campaigns in the period", () => {
    const only = snapshot([breakdown(MESSAGES, 100, 5)]);
    const primary = primaryResultFor(only, PURCHASE, "objective");
    expect(primary.results).toBeNull();
    expect(primary.costPerResult).toBeNull();
  });
});

function primary(overrides: Partial<PrimaryResult>): PrimaryResult {
  return {
    indicator: PURCHASE,
    source: "objective",
    spend: 1240,
    results: 86,
    costPerResult: 1240 / 86,
    roas: null,
    impressions: 50000,
    linkClicks: 1300,
    addToCart: null,
    initiateCheckout: null,
    hasOtherTypes: false,
    ...overrides,
  };
}

describe("summary sentence", () => {
  const base = {
    preset: "last_7d" as const,
    range: { from: "2026-10-03", to: "2026-10-09" },
    currency: "BRL",
    totalSpend: 1240,
  };

  it("matches the brief's example shape", () => {
    const text = nbsp(
      summaryText(
        buildSummary({
          ...base,
          current: primary({}),
          previous: primary({ costPerResult: (1240 / 86) * 1.087 }),
        }),
      ),
    );
    expect(text).toBe(
      "Nos últimos 7 dias, R$ 1.240 investidos geraram 86 compras, a R$ 14,42 cada. Isso é 8% mais barato que nos 7 dias anteriores.",
    );
  });

  it("credits only the main objective's spend when objectives are mixed", () => {
    const text = nbsp(
      summaryText(
        buildSummary({
          ...base,
          totalSpend: 2000,
          current: primary({ spend: 1240, hasOtherTypes: true }),
          previous: null,
        }),
      ),
    );
    // Opens with the total (same as the Investimento card), then the main result's share.
    expect(text).toBe(
      "Nos últimos 7 dias, foram investidos R$ 2.000. Desse valor, R$ 1.240 foram em campanhas de compras, que geraram 86 compras, a R$ 14,42 cada.",
    );
  });

  it("does not invent results when there are none", () => {
    const text = nbsp(
      summaryText(buildSummary({ ...base, current: primary({ results: null }), previous: null })),
    );
    expect(text).toBe(
      "Nos últimos 7 dias, foram investidos R$ 1.240, mas ainda não há compras registradas no período.",
    );
  });

  it("calls tiny changes stable and handles no spend", () => {
    const stable = summaryText(
      buildSummary({
        ...base,
        current: primary({}),
        previous: primary({ costPerResult: (1240 / 86) * 1.004 }),
      }),
    );
    expect(stable).toContain("estável");
    expect(
      summaryText(
        buildSummary({ ...base, totalSpend: null, current: primary({}), previous: null }),
      ),
    ).toBe("Nos últimos 7 dias, não houve investimento em anúncios.");
  });
});

describe("signals", () => {
  it("rates cost per result against the goal", () => {
    expect(evaluateHealth(14, 16)).toBe("saudavel");
    expect(evaluateHealth(18, 16)).toBe("atencao");
    expect(evaluateHealth(20, 16)).toBe("critico");
    expect(evaluateHealth(14, null)).toBeNull();
  });

  it("flags high frequency only above the threshold", () => {
    expect(isHighFrequency(3.5)).toBe(false);
    expect(isHighFrequency(3.6)).toBe(true);
    expect(isHighFrequency(null)).toBe(false);
  });
});

describe("funnel", () => {
  it("builds the 5-step sales funnel with pass rates", () => {
    const steps = buildFunnel(
      primary({ linkClicks: 1000, addToCart: 200, initiateCheckout: 100, results: 60 }),
      20000,
    );
    expect(steps.map((s) => s.label)).toEqual([
      "Viram",
      "Clicaram",
      "Carrinho",
      "Pagamento",
      "Compra",
    ]);
    expect(steps[0]!.passRate).toBeNull();
    expect(steps[1]!.passRate).toBe(5);
    expect(steps[4]!.passRate).toBe(60);
  });

  it("uses 3 steps and impressions when objectives are mixed", () => {
    const steps = buildFunnel(
      primary({
        indicator: MESSAGES,
        hasOtherTypes: true,
        impressions: 9000,
        linkClicks: 300,
        results: 30,
      }),
      5000,
    );
    expect(steps.map((s) => s.label)).toEqual(["Viram (exibições)", "Clicaram", "Conversas"]);
    expect(steps[0]!.value).toBe(9000);
  });
});

describe("weekday heat map", () => {
  it("sums one result type per weekday and recomputes cost", () => {
    const day = (date: string, spend: number, results: number): DailyPoint => ({
      date,
      current: null,
      previous: null,
      currentByType: { [PURCHASE]: { spend, results, purchaseValue: null } },
      previousByType: {},
    });
    // 2026-10-05 and 2026-10-12 are Mondays.
    const cells = aggregateByWeekday(
      [day("2026-10-05", 30, 2), day("2026-10-12", 10, 2)],
      PURCHASE,
    );
    expect(cells[0]).toMatchObject({
      label: "Seg",
      spend: 40,
      results: 4,
      costPerResult: 10,
      days: 2,
    });
    expect(cells[1]!.results).toBeNull();
  });
});
