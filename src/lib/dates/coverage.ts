import { addDays, rangeLength, type DateRange } from "./periods";

export interface ComparableRanges {
  /** Part of the selected range that has synced data. null = no data at all. */
  covered: DateRange | null;
  /** Previous-period slice with the same number of days as `covered`. */
  comparison: DateRange;
  /** True when the selected range extends past the last synced day. */
  partial: boolean;
}

/**
 * Comparing an incomplete period with a complete one inflates every delta (e.g.
 * "this month" ends today, or a failing sync stopped two days ago). The fair
 * comparison is day-for-day: the covered days vs. the same number of days at the
 * start of the previous period.
 */
export function comparableRanges(
  range: DateRange,
  previous: DateRange,
  dataThrough: string | null,
): ComparableRanges {
  if (dataThrough === null || dataThrough < range.from) {
    return { covered: null, comparison: previous, partial: true };
  }
  if (dataThrough >= range.to) {
    return { covered: range, comparison: previous, partial: false };
  }
  const covered = { from: range.from, to: dataThrough };
  const days = rangeLength(covered);
  return {
    covered,
    comparison: { from: previous.from, to: addDays(previous.from, days - 1) },
    partial: true,
  };
}
