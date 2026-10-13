/**
 * Pure read-model builders shared by every data source (simulated and Supabase).
 * A source only loads rows; the metric rules (no summed rates, null ≠ 0, reach
 * not additive, day-for-day comparison) live here once.
 */
import { comparableRanges } from "@/lib/dates/coverage";
import type { PeriodSelection } from "@/lib/dates/period-params";
import { addDays, rangeLength, type DateRange } from "@/lib/dates/periods";
import type {
  AdView,
  CampaignRow,
  CampaignStatus,
  CampaignsData,
  ClientSummary,
  DailyPoint,
  DashboardData,
  DataOrigin,
  MetricsSnapshot,
  SyncStatus,
  TypedDay,
} from "@/lib/domain/types";
import {
  aggregateByResultType,
  aggregateComponents,
  deriveMetrics,
  safeRatio,
  type DailyComponents,
  type PeriodReach,
} from "@/lib/metrics/derive";

export type DatedRow = DailyComponents & { date: string };

export interface CampaignInput {
  id: string;
  name: string;
  status: CampaignStatus;
  objectiveLabel: string;
  resultIndicator: string | null;
  /** Daily rows, any order; may extend beyond the requested window. */
  rows: DatedRow[];
}

export interface AdInput {
  id: string;
  name: string;
  campaignName: string;
  thumbnailUrl: string | null;
  resultIndicator: string | null;
  rows: DatedRow[];
}

export interface ClientDataInput {
  origin: DataOrigin;
  client: ClientSummary;
  sync: SyncStatus;
  campaigns: CampaignInput[];
  /** null = no ad-level data at all (not "no ads"). */
  ads: AdInput[] | null;
  /**
   * Deduplicated reach for exactly `range`, or null when unavailable. Only called
   * for preset periods. `impressions` is the summed total of the same range.
   */
  reachFor(range: DateRange, impressions: number | null): PeriodReach | null;
}

export function inRange<T extends { date: string }>(rows: readonly T[], range: DateRange): T[] {
  return rows.filter((r) => r.date >= range.from && r.date <= range.to);
}

function toComponents(rows: readonly DailyComponents[]): DailyComponents {
  const a = aggregateComponents(rows);
  return {
    spend: a.spend,
    impressions: a.impressions,
    linkClicks: a.linkClicks,
    results: a.results,
    resultIndicator: a.resultIndicator,
    purchaseValue: a.purchaseValue,
    addToCart: a.addToCart,
    initiateCheckout: a.initiateCheckout,
  };
}

function byType(rows: readonly DailyComponents[]): Record<string, TypedDay> {
  return Object.fromEntries(
    aggregateByResultType(rows).map((t) => [
      t.resultIndicator,
      { spend: t.spend, results: t.results, purchaseValue: t.purchaseValue },
    ]),
  );
}

function snapshot(
  input: ClientDataInput,
  rows: DatedRow[],
  range: DateRange,
  withReach: boolean,
): MetricsSnapshot {
  const totals = aggregateComponents(rows);
  const reach = withReach ? input.reachFor(range, totals.impressions) : null;
  return { metrics: deriveMetrics(totals, reach), resultTypes: aggregateByResultType(rows) };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function buildAds(ads: AdInput[] | null, range: DateRange): AdView[] | null {
  if (ads === null) return null;
  return ads.map((ad) => {
    const totals = aggregateComponents(inRange(ad.rows, range));
    const spend = totals.spend === null ? null : round2(totals.spend);
    return {
      id: ad.id,
      name: ad.name,
      campaignName: ad.campaignName,
      thumbnailUrl: ad.thumbnailUrl,
      resultIndicator: ad.resultIndicator,
      spend,
      results: totals.results,
      costPerResult: safeRatio(spend, totals.results),
    };
  });
}

export function buildDashboardData(
  input: ClientDataInput,
  selection: PeriodSelection,
): DashboardData {
  const { sync } = input;
  const cover = comparableRanges(selection.range, selection.previous, sync.dataThrough);
  const all = input.campaigns.flatMap((c) => c.rows);
  const current = inRange(all, selection.range);
  const previous = inRange(all, cover.comparison);
  const reachAvailable = selection.preset !== null;

  const byDate = new Map<string, DatedRow[]>();
  // The chart shows the whole previous period day by day; only totals are trimmed.
  for (const row of [...current, ...inRange(all, selection.previous)]) {
    const list = byDate.get(row.date) ?? [];
    list.push(row);
    byDate.set(row.date, list);
  }
  const dayRows = (date: string) => {
    const rows = byDate.get(date);
    return rows && rows.length > 0 ? toComponents(rows) : null;
  };

  const daily: DailyPoint[] = Array.from({ length: rangeLength(selection.range) }, (_, i) => {
    const date = addDays(selection.range.from, i);
    const previousDate = addDays(selection.previous.from, i);
    return {
      date,
      current: dayRows(date),
      previous: dayRows(previousDate),
      currentByType: byType(byDate.get(date) ?? []),
      previousByType: byType(byDate.get(previousDate) ?? []),
    };
  });

  return {
    origin: input.origin,
    client: input.client,
    range: selection.range,
    previousRange: selection.previous,
    comparisonRange: cover.comparison,
    partial: cover.partial,
    current: snapshot(input, current, cover.covered ?? selection.range, reachAvailable),
    previous: snapshot(input, previous, cover.comparison, reachAvailable),
    daily,
    reachAvailable,
    ads: buildAds(input.ads, selection.range),
    sync,
  };
}

export function buildCampaignsData(
  input: ClientDataInput,
  selection: PeriodSelection,
): CampaignsData {
  const cover = comparableRanges(selection.range, selection.previous, input.sync.dataThrough);
  const campaigns: CampaignRow[] = input.campaigns.map((c) => {
    const current = inRange(c.rows, selection.range);
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      objectiveLabel: c.objectiveLabel,
      resultIndicator: c.resultIndicator,
      components: toComponents(current),
      metrics: deriveMetrics(aggregateComponents(current)),
      previousMetrics: deriveMetrics(aggregateComponents(inRange(c.rows, cover.comparison))),
    };
  });

  return {
    origin: input.origin,
    client: input.client,
    range: selection.range,
    comparisonRange: cover.comparison,
    partial: cover.partial,
    campaigns,
    sync: input.sync,
  };
}
