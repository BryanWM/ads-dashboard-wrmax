import type { PeriodPreset } from "@/lib/dates/periods";
import type { DailyPoint, DashboardData, TypedDay } from "@/lib/domain/types";
import { METRICS, type MetricKey } from "@/lib/metrics/definitions";
import { percentChange, safeRatio } from "@/lib/metrics/derive";
import { isPurchaseIndicator, resultNames } from "@/lib/metrics/result-types";

import { buildFunnel, type FunnelStep } from "./funnel";
import { choosePrimaryIndicator, primaryResultFor, type PrimaryResult } from "./primary-result";
import { evaluateHealth, isHighFrequency, type Health } from "./signals";
import { buildSummary, type SummaryPart } from "./summary";
import { aggregateByWeekday, type WeekdayCell } from "./weekday";

/**
 * Presentation model of the overview, composed ONLY from fields the data source
 * already returns (no new calculation of business numbers).
 */

export type CardMetric = Extract<
  MetricKey,
  "spend" | "results" | "costPerResult" | "roas" | "reach"
>;

export interface TrendSeriesPoint {
  date: string;
  current: number | null;
  previous: number | null;
}

export interface OverviewCard {
  metric: CardMetric;
  label: string;
  value: number | null;
  previous: number | null;
  change: number | null;
  /** Daily series for the sparkline and the details sheet. Empty = no daily data. */
  series: TrendSeriesPoint[];
  /** Note shown under the value when something needs context. */
  note: string | null;
}

export interface OverviewModel {
  primary: PrimaryResult;
  previousPrimary: PrimaryResult;
  resultLabel: string;
  isSales: boolean;
  cards: OverviewCard[];
  summary: SummaryPart[];
  health: Health | null;
  frequency: number | null;
  highFrequency: boolean;
  funnel: FunnelStep[];
  weekday: WeekdayCell[];
}

type Picker = (d: DailyPoint) => { current: number | null; previous: number | null };

function series(daily: readonly DailyPoint[], pick: Picker): TrendSeriesPoint[] {
  return daily.map((d) => ({ date: d.date, ...pick(d) }));
}

function typed(indicator: string | null, fn: (t: TypedDay | undefined) => number | null): Picker {
  return (d) => ({
    current: indicator ? fn(d.currentByType[indicator]) : null,
    previous: indicator ? fn(d.previousByType[indicator]) : null,
  });
}

function card(
  metric: CardMetric,
  label: string,
  value: number | null,
  previous: number | null,
  points: TrendSeriesPoint[],
  note: string | null = null,
): OverviewCard {
  return {
    metric,
    label,
    value,
    previous,
    change: percentChange(value, previous),
    series: points,
    note,
  };
}

export function buildOverview(data: DashboardData, preset: PeriodPreset | null): OverviewModel {
  const { indicator, source } = choosePrimaryIndicator(data.client, data.current);
  const primary = primaryResultFor(data.current, indicator, source);
  const previousPrimary = primaryResultFor(data.previous, indicator, source);
  const names = resultNames(indicator);
  const isSales = isPurchaseIndicator(indicator) && primary.roas !== null;
  const otherTypesNote = primary.hasOtherTypes ? "Só campanhas deste tipo" : null;

  const cards: OverviewCard[] = [
    card(
      "spend",
      METRICS.spend.label,
      data.current.metrics.spend,
      data.previous.metrics.spend,
      series(data.daily, (d) => ({
        current: d.current?.spend ?? null,
        previous: d.previous?.spend ?? null,
      })),
    ),
    card(
      "results",
      names.plural,
      primary.results,
      previousPrimary.results,
      series(
        data.daily,
        typed(indicator, (t) => t?.results ?? null),
      ),
      otherTypesNote,
    ),
    card(
      "costPerResult",
      `Custo por ${names.singular}`,
      primary.costPerResult,
      previousPrimary.costPerResult,
      series(
        data.daily,
        typed(indicator, (t) => safeRatio(t?.spend ?? null, t?.results ?? null)),
      ),
      otherTypesNote,
    ),
    isSales
      ? card(
          "roas",
          METRICS.roas.label,
          primary.roas,
          previousPrimary.roas,
          series(
            data.daily,
            typed(indicator, (t) => safeRatio(t?.purchaseValue ?? null, t?.spend ?? null)),
          ),
        )
      : card(
          "reach",
          METRICS.reach.label,
          data.current.metrics.reach,
          data.previous.metrics.reach,
          [], // deduplicated reach has no daily series
          data.reachAvailable ? null : "Indisponível em período personalizado",
        ),
  ];

  const frequency = data.current.metrics.frequency;

  return {
    primary,
    previousPrimary,
    resultLabel: names.plural,
    isSales,
    cards,
    summary: buildSummary({
      preset,
      range: data.range,
      currency: data.client.currency,
      totalSpend: data.current.metrics.spend,
      current: primary,
      previous: previousPrimary,
    }),
    health: evaluateHealth(primary.costPerResult, data.client.costPerResultGoal),
    frequency,
    highFrequency: isHighFrequency(frequency),
    funnel: buildFunnel(primary, data.current.metrics.reach),
    weekday: aggregateByWeekday(data.daily, indicator),
  };
}
