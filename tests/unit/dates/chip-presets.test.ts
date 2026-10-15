import { describe, expect, it } from "vitest";

import { isChipPreset } from "@/lib/dates/period-params";

describe("overview period chips", () => {
  it("marks only the three chip presets; everything else belongs to the calendar", () => {
    expect(["last_7d", "last_30d", "this_month"].every((p) => isChipPreset(p as never))).toBe(true);
    expect(isChipPreset("last_14d")).toBe(false);
    expect(isChipPreset("last_month")).toBe(false);
    expect(isChipPreset(null)).toBe(false); // custom range
  });
});
