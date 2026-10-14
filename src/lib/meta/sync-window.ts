/**
 * Which days a sync fetches. Pure, so the rule is tested and shared with Phase 7.
 * - First sync of an account: BACKFILL_DAYS of history (dashboards compare periods).
 * - Afterwards: the last REPROCESS_DAYS (Meta keeps adjusting recent days for ~28 days).
 * Always ends YESTERDAY in the account timezone: today is still incomplete.
 */
import {
  addDays,
  PERIOD_PRESETS,
  previousPeriod,
  resolvePreset,
  type DateRange,
} from "@/lib/dates/periods";

export const BACKFILL_DAYS = 90;
export const REPROCESS_DAYS = 28;

export function syncWindow(today: string, dataThrough: string | null): DateRange {
  const to = addDays(today, -1);
  const days = dataThrough === null ? BACKFILL_DAYS : REPROCESS_DAYS;
  return { from: addDays(to, -(days - 1)), to };
}

/** Every preset period and its comparison period: where deduplicated reach is stored. */
export function reachRanges(today: string): DateRange[] {
  const seen = new Set<string>();
  const out: DateRange[] = [];
  for (const preset of PERIOD_PRESETS) {
    const range = resolvePreset(preset, today);
    for (const r of [range, previousPeriod(range)]) {
      const key = `${r.from}:${r.to}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(r);
      }
    }
  }
  return out;
}

/** Halves a range (used when Meta answers "too much data"). */
export function splitRange(range: DateRange): [DateRange, DateRange] | null {
  if (range.from === range.to) return null;
  const fromMs = Date.parse(`${range.from}T00:00:00Z`);
  const toMs = Date.parse(`${range.to}T00:00:00Z`);
  const days = Math.round((toMs - fromMs) / 86_400_000);
  const mid = addDays(range.from, Math.floor(days / 2));
  return [
    { from: range.from, to: mid },
    { from: addDays(mid, 1), to: range.to },
  ];
}
