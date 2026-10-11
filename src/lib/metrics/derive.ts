import type { MetricKey, MetricPolarity } from "./definitions";

/**
 * One daily row of additive components, as stored in *_metrics_daily.
 * `null` means "the platform did not report this field", never zero.
 */
export interface DailyComponents {
  spend: number | null;
  impressions: number | null;
  linkClicks: number | null;
  results: number | null;
  /** e.g. "actions:offsite_conversion.fb_pixel_purchase"; null when the campaign has no result type. */
  resultIndicator: string | null;
}

export interface AggregatedComponents {
  spend: number | null;
  impressions: number | null;
  linkClicks: number | null;
  results: number | null;
  /** The single result type of the period, or null if none/mixed. */
  resultIndicator: string | null;
  /** True when rows carry different result types, so results cannot be summed. */
  mixedResultTypes: boolean;
  rowCount: number;
}

/** Deduplicated reach for exactly the same date range (see docs/data-model.md §6). */
export interface PeriodReach {
  reach: number | null;
  impressions: number | null;
}

export type DerivedMetrics = Record<MetricKey, number | null> & {
  mixedResultTypes: boolean;
  resultIndicator: string | null;
};

/** Sum that keeps "no data" distinct from zero: null only if every value is null. */
export function sumNullable(values: Iterable<number | null>): number | null {
  let total: number | null = null;
  for (const v of values) {
    if (v === null || !Number.isFinite(v)) continue;
    total = (total ?? 0) + v;
  }
  return total;
}

/** Ratio that refuses to divide by zero or by missing data. */
export function safeRatio(
  numerator: number | null,
  denominator: number | null,
  multiplier = 1,
): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return (numerator / denominator) * multiplier;
}

export function aggregateComponents(rows: readonly DailyComponents[]): AggregatedComponents {
  const indicators = new Set<string>();
  for (const row of rows) {
    if (row.resultIndicator !== null && row.results !== null) indicators.add(row.resultIndicator);
  }
  const mixedResultTypes = indicators.size > 1;

  return {
    spend: sumNullable(rows.map((r) => r.spend)),
    impressions: sumNullable(rows.map((r) => r.impressions)),
    linkClicks: sumNullable(rows.map((r) => r.linkClicks)),
    results: mixedResultTypes ? null : sumNullable(rows.map((r) => r.results)),
    resultIndicator: indicators.size === 1 ? [...indicators][0]! : null,
    mixedResultTypes,
    rowCount: rows.length,
  };
}

export interface ResultTypeBreakdown {
  resultIndicator: string;
  results: number | null;
  /** Spend of the rows that carry this result type only. */
  spend: number | null;
  costPerResult: number | null;
}

/**
 * Results grouped by type — the honest answer when a period mixes objectives.
 * Rows without a result type are left out (their spend is not attributable).
 * Sorted by spend, largest first.
 */
export function aggregateByResultType(rows: readonly DailyComponents[]): ResultTypeBreakdown[] {
  const groups = new Map<string, DailyComponents[]>();
  for (const row of rows) {
    if (row.resultIndicator === null) continue;
    const list = groups.get(row.resultIndicator) ?? [];
    list.push(row);
    groups.set(row.resultIndicator, list);
  }
  return [...groups.entries()]
    .map(([resultIndicator, group]) => {
      const spend = sumNullable(group.map((r) => r.spend));
      const results = sumNullable(group.map((r) => r.results));
      return { resultIndicator, spend, results, costPerResult: safeRatio(spend, results) };
    })
    .sort((a, b) => (b.spend ?? 0) - (a.spend ?? 0));
}

/**
 * Derive every dashboard metric from summed components.
 * Rates are always recomputed from totals — never averaged or summed.
 * Reach/frequency come only from a deduplicated snapshot of the same range.
 */
export function deriveMetrics(
  totals: AggregatedComponents,
  periodReach: PeriodReach | null = null,
): DerivedMetrics {
  const reach = periodReach?.reach ?? null;
  // Frequency must use impressions from the same deduplicated query as reach.
  const frequency = safeRatio(periodReach?.impressions ?? null, reach);

  return {
    spend: totals.spend,
    impressions: totals.impressions,
    linkClicks: totals.linkClicks,
    results: totals.results,
    reach,
    frequency,
    linkCtr: safeRatio(totals.linkClicks, totals.impressions, 100),
    linkCpc: safeRatio(totals.spend, totals.linkClicks),
    cpm: safeRatio(totals.spend, totals.impressions, 1000),
    costPerResult: totals.mixedResultTypes ? null : safeRatio(totals.spend, totals.results),
    mixedResultTypes: totals.mixedResultTypes,
    resultIndicator: totals.resultIndicator,
  };
}

/** Relative change in percent. Null when either side is missing or the base is zero. */
export function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export type DeltaTone = "positive" | "negative" | "neutral";

/** Semantic colour of a change: for cost metrics a decrease is good news. */
export function deltaTone(change: number | null, polarity: MetricPolarity): DeltaTone {
  if (change === null || change === 0 || polarity === "neutral") return "neutral";
  const improved = polarity === "higher-is-better" ? change > 0 : change < 0;
  return improved ? "positive" : "negative";
}
