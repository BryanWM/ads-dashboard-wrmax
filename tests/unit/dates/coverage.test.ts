import { describe, expect, it } from "vitest";

import { comparableRanges } from "@/lib/dates/coverage";

const range = { from: "2026-10-03", to: "2026-10-09" };
const previous = { from: "2026-09-26", to: "2026-10-02" };

describe("comparableRanges", () => {
  it("compares full periods when data covers the whole range", () => {
    expect(comparableRanges(range, previous, "2026-10-09")).toEqual({
      covered: range,
      comparison: previous,
      partial: false,
    });
  });

  it("trims the comparison to the same number of covered days", () => {
    // Sync stopped on the 7th: 5 covered days vs the first 5 days of the previous period.
    expect(comparableRanges(range, previous, "2026-10-07")).toEqual({
      covered: { from: "2026-10-03", to: "2026-10-07" },
      comparison: { from: "2026-09-26", to: "2026-09-30" },
      partial: true,
    });
  });

  it("handles 'this month' including an incomplete today", () => {
    const thisMonth = { from: "2026-10-01", to: "2026-10-10" };
    const prev = { from: "2026-09-21", to: "2026-09-30" };
    const r = comparableRanges(thisMonth, prev, "2026-10-09");
    expect(r.partial).toBe(true);
    expect(r.comparison).toEqual({ from: "2026-09-21", to: "2026-09-29" });
  });

  it("reports no coverage when there is no data in the range", () => {
    expect(comparableRanges(range, previous, null).covered).toBeNull();
    expect(comparableRanges(range, previous, "2026-10-01").covered).toBeNull();
  });
});
