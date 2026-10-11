import { describe, expect, it } from "vitest";

import {
  addDays,
  previousPeriod,
  rangeLength,
  resolvePreset,
  todayInTimeZone,
} from "@/lib/dates/periods";

describe("addDays / rangeLength", () => {
  it("crosses month and leap-year boundaries", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("counts inclusive days", () => {
    expect(rangeLength({ from: "2026-10-01", to: "2026-10-01" })).toBe(1);
    expect(rangeLength({ from: "2026-10-01", to: "2026-10-07" })).toBe(7);
  });

  it("rejects inverted and malformed ranges", () => {
    expect(() => rangeLength({ from: "2026-10-07", to: "2026-10-01" })).toThrow();
    expect(() => addDays("2026-02-30", 1)).toThrow();
    expect(() => addDays("10/10/2026", 1)).toThrow();
  });
});

describe("previousPeriod", () => {
  it("returns the adjacent range with the same length", () => {
    expect(previousPeriod({ from: "2026-10-03", to: "2026-10-09" })).toEqual({
      from: "2026-09-26",
      to: "2026-10-02",
    });
  });

  it("handles a single day", () => {
    expect(previousPeriod({ from: "2026-10-01", to: "2026-10-01" })).toEqual({
      from: "2026-09-30",
      to: "2026-09-30",
    });
  });
});

describe("resolvePreset", () => {
  const today = "2026-10-10";

  it("excludes today from 'last N days'", () => {
    expect(resolvePreset("last_7d", today)).toEqual({
      from: "2026-10-03",
      to: "2026-10-09",
    });
    expect(resolvePreset("last_30d", today)).toEqual({
      from: "2026-09-10",
      to: "2026-10-09",
    });
  });

  it("resolves calendar months", () => {
    expect(resolvePreset("this_month", today)).toEqual({
      from: "2026-10-01",
      to: "2026-10-10",
    });
    expect(resolvePreset("last_month", today)).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(resolvePreset("last_month", "2026-01-15")).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });
});

describe("todayInTimeZone", () => {
  it("uses the account timezone, not the server's", () => {
    // 02:30 UTC on Oct 11 is still Oct 10 in São Paulo (UTC-3).
    const instant = new Date("2026-10-11T02:30:00Z");
    expect(todayInTimeZone("America/Sao_Paulo", instant)).toBe("2026-10-10");
    expect(todayInTimeZone("UTC", instant)).toBe("2026-10-11");
  });
});
