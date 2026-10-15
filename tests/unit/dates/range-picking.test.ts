import { describe, expect, it } from "vitest";

import { pickDay } from "@/lib/dates/range-picking";

const d = (iso: string) => new Date(`${iso}T00:00:00`);
const iso = (date: Date) => date.toISOString().slice(0, 10);
const show = (r: { from: Date; to: Date }) => `${iso(r.from)}→${iso(r.to)}`;

describe("calendar: 1st tap = end, 2nd tap = start", () => {
  const current = { from: d("2026-09-15"), to: d("2026-10-14") };

  it("first tap moves the end and keeps the start when it is still before it", () => {
    const step1 = pickDay(current, d("2026-09-27"), "end");
    expect(show(step1.range)).toBe(show({ from: d("2026-09-15"), to: d("2026-09-27") }));
    expect(step1.next).toBe("start");
  });

  it("second tap sets the start and goes back to choosing the end", () => {
    const step1 = pickDay(current, d("2026-09-27"), "end");
    const step2 = pickDay(step1.range, d("2026-09-20"), step1.next);
    expect(show(step2.range)).toBe(show({ from: d("2026-09-20"), to: d("2026-09-27") }));
    expect(step2.next).toBe("end");
  });

  it("an end before the current start becomes a one-day range until the start is picked", () => {
    const step1 = pickDay(current, d("2026-09-01"), "end");
    expect(show(step1.range)).toBe(show({ from: d("2026-09-01"), to: d("2026-09-01") }));
  });

  it("a start tapped after the end swaps them (never an inverted range)", () => {
    const step2 = pickDay({ from: d("2026-09-01"), to: d("2026-09-10") }, d("2026-09-20"), "start");
    expect(show(step2.range)).toBe(show({ from: d("2026-09-10"), to: d("2026-09-20") }));
  });
});
