import { describe, expect, it } from "vitest";

import { parsePeriodSelection, withPeriod } from "@/lib/dates/period-params";

const today = "2026-10-10";

describe("parsePeriodSelection", () => {
  it("defaults to the last 30 days with comparison on", () => {
    const s = parsePeriodSelection({}, today);
    expect(s.preset).toBe("last_30d");
    expect(s.range).toEqual({ from: "2026-09-10", to: "2026-10-09" });
    expect(s.previous).toEqual({ from: "2026-08-11", to: "2026-09-09" });
    expect(s.compare).toBe(true);
  });

  it("accepts presets and disables comparison with compare=0", () => {
    const s = parsePeriodSelection({ period: "last_7d", compare: "0" }, today);
    expect(s.preset).toBe("last_7d");
    expect(s.compare).toBe(false);
  });

  it("accepts a valid custom range", () => {
    const s = parsePeriodSelection(
      { period: "custom", from: "2026-09-01", to: "2026-09-10" },
      today,
    );
    expect(s.preset).toBeNull();
    expect(s.range).toEqual({ from: "2026-09-01", to: "2026-09-10" });
    expect(s.previous).toEqual({ from: "2026-08-22", to: "2026-08-31" });
  });

  it.each([
    ["inverted", { period: "custom", from: "2026-09-10", to: "2026-09-01" }],
    ["future end", { period: "custom", from: "2026-10-01", to: "2026-10-20" }],
    ["too long", { period: "custom", from: "2024-01-01", to: "2026-01-01" }],
    ["malformed", { period: "custom", from: "01/09/2026", to: "2026-09-10" }],
    ["impossible date", { period: "custom", from: "2026-02-30", to: "2026-03-02" }],
    ["unknown preset", { period: "last_999d" }],
    ["injection attempt", { period: "custom'; drop table--" }],
  ])("falls back to the default for %s input", (_, params) => {
    expect(parsePeriodSelection(params, today).preset).toBe("last_30d");
  });

  it("uses the first value of repeated params", () => {
    expect(parsePeriodSelection({ period: ["last_7d", "last_14d"] }, today).preset).toBe("last_7d");
  });
});

describe("withPeriod", () => {
  it("switches to a preset and drops custom dates, keeping other params", () => {
    const next = withPeriod(new URLSearchParams("client=c1&period=custom&from=a&to=b"), {
      preset: "last_7d",
    });
    expect(next.toString()).toBe("client=c1&period=last_7d");
  });

  it("encodes a custom range", () => {
    const next = withPeriod(new URLSearchParams("client=c1"), {
      range: { from: "2026-09-01", to: "2026-09-10" },
    });
    expect(next.get("period")).toBe("custom");
    expect(next.get("from")).toBe("2026-09-01");
    expect(next.get("to")).toBe("2026-09-10");
    expect(next.get("client")).toBe("c1");
  });
});
