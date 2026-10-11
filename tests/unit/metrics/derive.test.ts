import { describe, expect, it } from "vitest";

import {
  aggregateByResultType,
  aggregateComponents,
  deltaTone,
  deriveMetrics,
  percentChange,
  safeRatio,
  sumNullable,
  type DailyComponents,
} from "@/lib/metrics/derive";

const PURCHASE = "actions:offsite_conversion.fb_pixel_purchase";
const LEAD = "actions:lead";

function row(partial: Partial<DailyComponents>): DailyComponents {
  return {
    spend: null,
    impressions: null,
    linkClicks: null,
    results: null,
    resultIndicator: null,
    ...partial,
  };
}

describe("sumNullable", () => {
  it("returns null when every value is missing", () => {
    expect(sumNullable([null, null])).toBeNull();
    expect(sumNullable([])).toBeNull();
  });

  it("keeps a real zero distinct from missing", () => {
    expect(sumNullable([0, null])).toBe(0);
  });

  it("ignores non-finite values", () => {
    expect(sumNullable([1, Number.NaN, 2])).toBe(3);
  });
});

describe("safeRatio", () => {
  it("refuses to divide by zero or missing data", () => {
    expect(safeRatio(10, 0)).toBeNull();
    expect(safeRatio(null, 5)).toBeNull();
    expect(safeRatio(10, null)).toBeNull();
  });

  it("applies the multiplier", () => {
    expect(safeRatio(5, 1000, 1000)).toBe(5);
  });
});

describe("deriveMetrics", () => {
  it("recomputes rates from totals instead of averaging daily rates", () => {
    // Day 1 CTR = 10%, day 2 CTR = 1%. Averaging would give 5.5%; the correct
    // period CTR is (10 + 10) / (100 + 1000) = 1.818…%.
    const totals = aggregateComponents([
      row({ spend: 10, impressions: 100, linkClicks: 10 }),
      row({ spend: 30, impressions: 1000, linkClicks: 10 }),
    ]);
    const m = deriveMetrics(totals);

    expect(m.spend).toBe(40);
    expect(m.impressions).toBe(1100);
    expect(m.linkClicks).toBe(20);
    expect(m.linkCtr).toBeCloseTo((20 / 1100) * 100, 10);
    expect(m.linkCpc).toBe(2);
    expect(m.cpm).toBeCloseTo((40 / 1100) * 1000, 10);
  });

  it("does not report reach or frequency without a deduplicated snapshot", () => {
    const m = deriveMetrics(aggregateComponents([row({ spend: 5, impressions: 500 })]));
    expect(m.reach).toBeNull();
    expect(m.frequency).toBeNull();
  });

  it("computes frequency from the snapshot's own impressions and reach", () => {
    const totals = aggregateComponents([row({ spend: 5, impressions: 999 })]);
    const m = deriveMetrics(totals, { reach: 400, impressions: 1000 });
    expect(m.reach).toBe(400);
    expect(m.frequency).toBe(2.5);
  });

  it("refuses to sum different result types", () => {
    const totals = aggregateComponents([
      row({ spend: 50, results: 2, resultIndicator: PURCHASE }),
      row({ spend: 50, results: 10, resultIndicator: LEAD }),
    ]);
    const m = deriveMetrics(totals);

    expect(m.mixedResultTypes).toBe(true);
    expect(m.results).toBeNull();
    expect(m.costPerResult).toBeNull();
    expect(m.spend).toBe(100);
  });

  it("computes cost per result for a single result type", () => {
    const totals = aggregateComponents([
      row({ spend: 60, results: 2, resultIndicator: PURCHASE }),
      row({ spend: 40, results: 3, resultIndicator: PURCHASE }),
    ]);
    const m = deriveMetrics(totals);

    expect(m.resultIndicator).toBe(PURCHASE);
    expect(m.results).toBe(5);
    expect(m.costPerResult).toBe(20);
  });

  it("keeps results missing (not zero) when the campaign has no result type", () => {
    const m = deriveMetrics(aggregateComponents([row({ spend: 10, impressions: 100 })]));
    expect(m.results).toBeNull();
    expect(m.costPerResult).toBeNull();
  });

  it("returns null cost per result when results are zero", () => {
    const m = deriveMetrics(
      aggregateComponents([row({ spend: 10, results: 0, resultIndicator: LEAD })]),
    );
    expect(m.results).toBe(0);
    expect(m.costPerResult).toBeNull();
  });
});

describe("aggregateByResultType", () => {
  it("groups results by type and computes cost per result within each group", () => {
    const groups = aggregateByResultType([
      row({ spend: 100, results: 4, resultIndicator: PURCHASE }),
      row({ spend: 50, results: 10, resultIndicator: LEAD }),
      row({ spend: 20, results: 1, resultIndicator: PURCHASE }),
      row({ spend: 999, impressions: 10 }), // no result type: excluded
    ]);

    expect(groups).toEqual([
      { resultIndicator: PURCHASE, spend: 120, results: 5, costPerResult: 24 },
      { resultIndicator: LEAD, spend: 50, results: 10, costPerResult: 5 },
    ]);
  });
});

describe("percentChange", () => {
  it("computes relative change", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
  });

  it("is undefined against a zero or missing base", () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(null, 10)).toBeNull();
    expect(percentChange(10, null)).toBeNull();
  });
});

describe("deltaTone", () => {
  it("treats a cost decrease as good news", () => {
    expect(deltaTone(-10, "lower-is-better")).toBe("positive");
    expect(deltaTone(10, "lower-is-better")).toBe("negative");
  });

  it("treats a volume increase as good news", () => {
    expect(deltaTone(10, "higher-is-better")).toBe("positive");
  });

  it("stays neutral for neutral metrics, zero and missing changes", () => {
    expect(deltaTone(10, "neutral")).toBe("neutral");
    expect(deltaTone(0, "higher-is-better")).toBe("neutral");
    expect(deltaTone(null, "higher-is-better")).toBe("neutral");
  });
});
