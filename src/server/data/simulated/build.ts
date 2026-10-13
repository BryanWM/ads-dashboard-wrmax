/**
 * SIMULATED rows (no `server-only` so they can be unit-tested and reused by the
 * seed script). They mimic the real pipeline: data stops at the last successful
 * sync, paused campaigns stop producing rows, reach exists only for preset periods.
 * The metric rules themselves live in the shared read model (src/lib/read-model).
 */
import { simulateDailySeries } from "@/lib/demo/simulated";
import type { PeriodSelection } from "@/lib/dates/period-params";
import { addDays, rangeLength } from "@/lib/dates/periods";
import type { CampaignsData, ClientSummary, DashboardData, SyncStatus } from "@/lib/domain/types";
import type { PeriodReach } from "@/lib/metrics/derive";
import {
  buildCampaignsData,
  buildDashboardData,
  type AdInput,
  type ClientDataInput,
  type DatedRow,
} from "@/lib/read-model/build";

import {
  SIM_CLIENTS,
  SIM_CURRENCY,
  SIM_EPOCH,
  SIM_TIMEZONE,
  type SimAd,
  type SimCampaign,
  type SimClient,
} from "./catalog";

export interface SimContext {
  /** Today's date in the account timezone. */
  today: string;
  now: Date;
}

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

export function campaignRows(campaign: SimCampaign, ctx: SimContext, dataThrough: string | null) {
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

function round(n: number | null | undefined, digits: number): number | null {
  if (n === null || n === undefined) return null;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Ad-level demo: each ad takes a fixed share of its campaign's daily numbers. */
export function adRows(rows: readonly DatedRow[], ad: SimAd): DatedRow[] {
  return rows.map((r) => ({
    date: r.date,
    spend: round(r.spend === null ? null : r.spend * ad.spendShare, 2),
    impressions: r.impressions === null ? null : Math.round(r.impressions * ad.spendShare),
    linkClicks: r.linkClicks === null ? null : Math.round(r.linkClicks * ad.spendShare),
    results: round(r.results === null ? null : r.results * ad.resultShare, 4),
    resultIndicator: r.resultIndicator,
    purchaseValue: round(
      r.purchaseValue === null || r.purchaseValue === undefined
        ? null
        : r.purchaseValue * ad.resultShare,
      2,
    ),
  }));
}

/** Stand-in for Meta's deduplicated reach: frequency grows with period length. */
export function simulatedReach(impressions: number | null, days: number): PeriodReach {
  if (impressions === null) return { reach: null, impressions: null };
  const frequency = Math.min(1.15 + 0.045 * days, 3.8);
  return { reach: Math.round(impressions / frequency), impressions };
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

export function allCampaigns(client: SimClient) {
  return client.accounts.flatMap((a) => a.campaigns);
}

function simulatedInput(client: SimClient, ctx: SimContext): ClientDataInput {
  const sync = syncStatusFor(client, ctx);
  const campaigns = allCampaigns(client).map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    objectiveLabel: c.objectiveLabel,
    resultIndicator: c.resultIndicator,
    rows: campaignRows(c, ctx, sync.dataThrough),
  }));
  const withAds = allCampaigns(client).filter((c) => c.ads?.length);
  const ads: AdInput[] | null =
    withAds.length === 0
      ? null
      : withAds.flatMap((c) =>
          (c.ads ?? []).map((ad) => ({
            id: ad.id,
            name: ad.name,
            campaignName: c.name,
            thumbnailUrl: ad.thumbnailUrl,
            resultIndicator: c.resultIndicator,
            rows: adRows(campaignRows(c, ctx, sync.dataThrough), ad),
          })),
        );

  return {
    origin: "simulated",
    client: clientSummary(client),
    sync,
    campaigns,
    ads,
    reachFor: (range, impressions) => simulatedReach(impressions, rangeLength(range)),
  };
}

export function buildDashboard(
  client: SimClient,
  selection: PeriodSelection,
  ctx: SimContext,
): DashboardData {
  return buildDashboardData(simulatedInput(client, ctx), selection);
}

export function buildCampaigns(
  client: SimClient,
  selection: PeriodSelection,
  ctx: SimContext,
): CampaignsData {
  return buildCampaignsData(simulatedInput(client, ctx), selection);
}
