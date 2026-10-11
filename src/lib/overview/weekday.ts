import type { DailyPoint } from "@/lib/domain/types";
import { safeRatio, sumNullable } from "@/lib/metrics/derive";

export interface WeekdayCell {
  /** 0 = segunda … 6 = domingo (Brazilian week order). */
  index: number;
  label: string;
  results: number | null;
  spend: number | null;
  costPerResult: number | null;
  days: number;
}

const LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/**
 * Totals per day of the week for ONE result type (summed components, cost
 * recomputed from the sums — never an average of daily costs).
 */
export function aggregateByWeekday(
  daily: readonly DailyPoint[],
  indicator: string | null,
): WeekdayCell[] {
  return LABELS.map((label, index) => {
    // getUTCDay: 0 = Sunday → shift so Monday is 0.
    const days = daily.filter(
      (d) => (new Date(`${d.date}T00:00:00Z`).getUTCDay() + 6) % 7 === index,
    );
    const typed = days.map((d) => (indicator ? d.currentByType[indicator] : undefined));
    const results = sumNullable(typed.map((t) => t?.results));
    const spend = sumNullable(typed.map((t) => t?.spend));
    return {
      index,
      label,
      results,
      spend,
      costPerResult: safeRatio(spend, results),
      days: days.length,
    };
  });
}
