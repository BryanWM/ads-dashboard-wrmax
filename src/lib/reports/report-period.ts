import { parsePeriodSelection, type PeriodSelection } from "@/lib/dates/period-params";
import { addDays, rangeLength, type DateRange } from "@/lib/dates/periods";
import { formatDateRange } from "@/lib/format";

/**
 * Period rules of the Reports tab (src/app/(app)/reports):
 * - no period in the URL → yesterday (the daily WhatsApp summary);
 * - a single day compares with the SAME weekday of the previous week ("quarta com
 *   quarta"), not with the day before; longer ranges keep the usual previous period.
 */

type Params = Record<string, string | string[] | undefined>;

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

export function yesterdayOf(today: string): string {
  return addDays(today, -1);
}

export function isSingleDay(range: DateRange): boolean {
  return range.from === range.to;
}

export function reportSelection(params: Params, today: string): PeriodSelection {
  const yesterday = yesterdayOf(today);
  const withDefault: Params = params.period
    ? params
    : { ...params, period: "custom", from: yesterday, to: yesterday };
  const selection = parsePeriodSelection(withDefault, today);
  if (rangeLength(selection.range) !== 1) return selection;
  const sameWeekday = addDays(selection.range.from, -7);
  return { ...selection, previous: { from: sameWeekday, to: sameWeekday } };
}

/** Which period control is "on" in the Reports tab. */
export type ReportPeriodKind = "ontem" | "last_7d" | "this_month" | "last_month" | "dia" | "outro";

export function reportPeriodKind(selection: PeriodSelection, today: string): ReportPeriodKind {
  const { preset, range } = selection;
  if (preset === "last_7d" || preset === "this_month" || preset === "last_month") return preset;
  if (preset === null && isSingleDay(range)) {
    return range.from === yesterdayOf(today) ? "ontem" : "dia";
  }
  return "outro";
}

/** "Quarta" for an ISO calendar date (independent of the server timezone). */
export function weekdayName(date: string): string {
  return WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()]!;
}

/** "14/10" */
export function dayMonth(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

/** "08/10 a 14/10/2026" (the title already uses a dash). */
export function rangeText(range: DateRange): string {
  return formatDateRange(range).replace(" – ", " a ");
}

/** Title part: "Quarta (14/10)" for one day, "08/10 a 14/10/2026" otherwise. */
export function periodTitle(range: DateRange): string {
  return isSingleDay(range)
    ? `${weekdayName(range.from)} (${dayMonth(range.from)})`
    : rangeText(range);
}

/** "à quarta passada (07/10)" · "ao período de 01/10 a 07/10/2026". */
export function comparisonLabel(range: DateRange, comparison: DateRange): string {
  if (isSingleDay(range) && isSingleDay(comparison)) {
    const name = weekdayName(comparison.from).toLowerCase();
    const article = name === "sábado" || name === "domingo" ? "ao" : "à";
    const past = article === "ao" ? "passado" : "passada";
    return `${article} ${name} ${past} (${dayMonth(comparison.from)})`;
  }
  return `ao período de ${rangeText(comparison)}`;
}
