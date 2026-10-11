/**
 * Pure builders for the SIMULATED read model (no `server-only` so they can be
 * unit-tested). They mimic the real pipeline's semantics: data stops at the last
 * successful sync, paused campaigns stop producing rows, reach exists only for
 * preset periods.
 */
import { simulateDailySeries } from "@/lib/demo/simulated";
import { comparableRanges } from "@/lib/dates/coverage";
import type { PeriodSelection } from "@/lib/dates/period-params";
import { addDays, rangeLength, type DateRange } from "@/lib/dates/periods";
import type {
  AdView,
  CampaignRow,
  CampaignsData,
  ClientSummary,
  DailyPoint,
  DashboardData,
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

import {
  SIM_CLIENTS,
  SIM_CURRENCY,
  SIM_EPOCH,
  SIM_TIMEZONE,
  type SimCampaign,
  type SimClient,
} from "./catalog";

export interface SimContext {
  /** Today's date in the account timezone. */
  today: string;
  now: Date;
}

type DatedRow = DailyComponents & { date: string };

/** Daily sync runs at 06:12 in São Paulo (UTC−3, no DST). */
function syncInstant(date: string): string {
  return `${date}T09:12:00.000Z`;
}

export function syncStatusFor(client: SimClient, ctx: SimContext): SyncStatus {
  switch (client.sync.kind) {
    case "never":
      return { health: "never", lastSuccessAt: null, dataThrough: null, lastError: null };
    case "ok": {
      const todayRun = syncInstant(ctx.today);
      const runDate = new Date(todayRun) <= ctx.now ? ctx.today : addDays(ctx.today, -1);
      return {
        health: "ok",
        lastSuccessAt: syncInstant(runDate),
        dataThrough: addDays(runDate, -1),
        lastError: null,
      };
    }
    case "failing": {
      const runDate = addDays(ctx.today, -client.sync.daysSinceSuccess);
      return {
        health: "failing",
        lastSuccessAt: syncInstant(runDate),
        dataThrough: addDays(runDate, -1),
        lastError: client.sync.error,
      };
    }
  }
}

const seriesCache = new Map<string, DatedRow[]>();

function campaignRows(campaign: SimCampaign, ctx: SimContext, dataThrough: string | null) {
  if (dataThrough === null) return [];
  const key = `${campaign.id}:${ctx.today}:${dataThrough}`;
  const cached = seriesCache.get(key);
  if (cached) return cached;

  const firstDay = addDays(ctx.today, -campaign.startedDaysAgo);
  const lastDay =
    campaign.pausedDaysAgo === undefined
      ? dataThrough
      : [dataThrough, addDays(ctx.today, -campaign.pausedDaysAgo)].sort()[0]!;

  const rows = simulateDailySeries({
    from: SIM_EPOCH,
    days: rangeLength({ from: SIM_EPOCH, to: dataThrough }),
    seed: campaign.seed,
    baseSpend: campaign.baseSpend,
    resultIndicator: campaign.resultIndicator,
    averageTicket: campaign.averageTicket,
  })
    .filter((d) => d.date >= firstDay && d.date <= lastDay)
    .map((d) => ({
      date: d.date,
      spend: d.spend,
      impressions: d.impressions,
      linkClicks: d.linkClicks,
      results: d.results,
      resultIndicator: d.resultIndicator,
      purchaseValue: d.purchaseValue,
      addToCart: d.addToCart,
      initiateCheckout: d.initiateCheckout,
    }));

  seriesCache.set(key, rows);
  return rows;
}

function inRange(rows: DatedRow[], range: DateRange) {
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

/** Ad-level demo: each ad takes a share of its campaign's spend and results. */
function buildAds(client: SimClient, current: Map<string, DatedRow[]>): AdView[] | null {
  const campaigns = allCampaigns(client).filter((c) => c.ads?.length);
  if (campaigns.length === 0) return null;
  return campaigns.flatMap((c) => {
    const totals = aggregateComponents(current.get(c.id) ?? []);
    return (c.ads ?? []).map((ad) => {
      const spend = totals.spend === null ? null : round2(totals.spend * ad.spendShare);
      const results = totals.results === null ? null : Math.round(totals.results * ad.resultShare);
      return {
        id: ad.id,
        name: ad.name,
        campaignName: c.name,
        thumbnailUrl: ad.thumbnailUrl,
        resultIndicator: c.resultIndicator,
        spend,
        results,
        costPerResult: safeRatio(spend, results),
      };
    });
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Stand-in for Meta's deduplicated reach: frequency grows with period length. */
function simulatedReach(impressions: number | null, days: number): PeriodReach {
  if (impressions === null) return { reach: null, impressions: null };
  const frequency = Math.min(1.15 + 0.045 * days, 3.8);
  return { reach: Math.round(impressions / frequency), impressions };
}

function snapshot(rows: DatedRow[], range: DateRange, withReach: boolean): MetricsSnapshot {
  const totals = aggregateComponents(rows);
  const reach = withReach ? simulatedReach(totals.impressions, rangeLength(range)) : null;
  return { metrics: deriveMetrics(totals, reach), resultTypes: aggregateByResultType(rows) };
}

export function clientSummary(client: SimClient): ClientSummary {
  return {
    id: client.id,
    name: client.name,
    currency: SIM_CURRENCY,
    timezone: SIM_TIMEZONE,
    adAccountCount: client.accounts.length,
    objective: client.objective,
    costPerResultGoal: client.costPerResultGoal,
  };
}

export function findClient(clientId: string) {
  return SIM_CLIENTS.find((c) => c.id === clientId) ?? null;
}

function allCampaigns(client: SimClient) {
  return client.accounts.flatMap((a) => a.campaigns);
}

export function buildDashboard(
  client: SimClient,
  selection: PeriodSelection,
  ctx: SimContext,
): DashboardData {
  const sync = syncStatusFor(client, ctx);
  const cover = comparableRanges(selection.range, selection.previous, sync.dataThrough);
  const campaigns = allCampaigns(client);
  const perCampaign = campaigns.map((c) => campaignRows(c, ctx, sync.dataThrough));
  const currentByCampaign = new Map(
    campaigns.map((c, i) => [c.id, inRange(perCampaign[i] ?? [], selection.range)]),
  );
  const all = perCampaign.flat();
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
    origin: "simulated",
    client: clientSummary(client),
    range: selection.range,
    previousRange: selection.previous,
    comparisonRange: cover.comparison,
    partial: cover.partial,
    current: snapshot(current, cover.covered ?? selection.range, reachAvailable),
    previous: snapshot(previous, cover.comparison, reachAvailable),
    daily,
    reachAvailable,
    ads: buildAds(client, currentByCampaign),
    sync,
  };
}

export function buildCampaigns(
  client: SimClient,
  selection: PeriodSelection,
  ctx: SimContext,
): CampaignsData {
  const sync = syncStatusFor(client, ctx);
  const cover = comparableRanges(selection.range, selection.previous, sync.dataThrough);
  const campaigns: CampaignRow[] = allCampaigns(client).map((c) => {
    const rows = campaignRows(c, ctx, sync.dataThrough);
    const current = inRange(rows, selection.range);
    const components = toComponents(current);
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      objectiveLabel: c.objectiveLabel,
      resultIndicator: c.resultIndicator,
      components,
      metrics: deriveMetrics(aggregateComponents(current)),
      previousMetrics: deriveMetrics(aggregateComponents(inRange(rows, cover.comparison))),
    };
  });

  return {
    origin: "simulated",
    client: clientSummary(client),
    range: selection.range,
    comparisonRange: cover.comparison,
    partial: cover.partial,
    campaigns,
    sync,
  };
}
