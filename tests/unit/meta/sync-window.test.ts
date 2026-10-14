import { describe, expect, it } from "vitest";

import { reachRanges, splitRange, syncWindow } from "@/lib/meta/sync-window";

describe("sync window", () => {
  it("backfills 90 days on the first sync, ending yesterday", () => {
    expect(syncWindow("2026-10-14", null)).toEqual({ from: "2026-07-16", to: "2026-10-13" });
  });

  it("reprocesses the last 28 days afterwards", () => {
    expect(syncWindow("2026-10-14", "2026-10-12")).toEqual({
      from: "2026-09-16",
      to: "2026-10-13",
    });
  });

  it("lists each preset period and its comparison once", () => {
    const ranges = reachRanges("2026-10-14");
    expect(ranges).toContainEqual({ from: "2026-10-07", to: "2026-10-13" }); // last 7 days
    expect(ranges).toContainEqual({ from: "2026-09-30", to: "2026-10-06" }); // the 7 before
    expect(ranges).toContainEqual({ from: "2026-09-01", to: "2026-09-30" }); // last month
    expect(new Set(ranges.map((r) => `${r.from}:${r.to}`)).size).toBe(ranges.length);
  });

  it("halves a range without losing or repeating days", () => {
    expect(splitRange({ from: "2026-10-01", to: "2026-10-10" })).toEqual([
      { from: "2026-10-01", to: "2026-10-05" },
      { from: "2026-10-06", to: "2026-10-10" },
    ]);
    expect(splitRange({ from: "2026-10-01", to: "2026-10-01" })).toBeNull();
  });
});
