/**
 * Date ranges are inclusive ISO calendar dates ("YYYY-MM-DD") in the ad account's
 * timezone. Arithmetic is done in UTC on purpose: these are calendar days, not
 * instants, so DST and the server's timezone must not shift them.
 */

export interface DateRange {
  from: string;
  to: string;
}

export const PERIOD_PRESETS = [
  "last_7d",
  "last_14d",
  "last_30d",
  "this_month",
  "last_month",
] as const;

export type PeriodPreset = (typeof PERIOD_PRESETS)[number];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function toUtc(date: string): number {
  if (!ISO_DATE.test(date)) throw new Error(`Invalid ISO date: ${date}`);
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid ISO date: ${date}`);
  }
  return ms;
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** Number of calendar days in an inclusive range. */
export function rangeLength(range: DateRange): number {
  const days = (toUtc(range.to) - toUtc(range.from)) / DAY_MS + 1;
  if (days < 1) throw new Error(`Range ends before it starts: ${range.from}..${range.to}`);
  return days;
}

/** The equivalent period immediately before `range`, with the same number of days. */
export function previousPeriod(range: DateRange): DateRange {
  const length = rangeLength(range);
  const to = addDays(range.from, -1);
  return { from: addDays(to, -(length - 1)), to };
}

/**
 * Resolve a preset relative to `today` (the current date in the account timezone).
 * "Last N days" excludes today, matching Meta's `last_Nd` presets: today's data is
 * still incomplete.
 */
export function resolvePreset(preset: PeriodPreset, today: string): DateRange {
  const yesterday = addDays(today, -1);
  switch (preset) {
    case "last_7d":
      return { from: addDays(yesterday, -6), to: yesterday };
    case "last_14d":
      return { from: addDays(yesterday, -13), to: yesterday };
    case "last_30d":
      return { from: addDays(yesterday, -29), to: yesterday };
    case "this_month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "last_month": {
      const firstOfThisMonth = `${today.slice(0, 7)}-01`;
      const lastOfPrev = addDays(firstOfThisMonth, -1);
      return { from: `${lastOfPrev.slice(0, 7)}-01`, to: lastOfPrev };
    }
  }
}

/** Today's calendar date in an IANA timezone, e.g. "America/Sao_Paulo". */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
