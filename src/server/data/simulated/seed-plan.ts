/**
 * Turns the simulated catalogue into database rows (for `pnpm db:seed`). Pure and
 * deterministic: the same organisation + day always yields the same ids and values,
 * so re-running the seed updates rows instead of duplicating them.
 * Every metric row carries source = 'simulated' → the UI shows "Dados simulados".
 */
import { createHash } from "node:crypto";

import { PERIOD_PRESETS, previousPeriod, rangeLength, resolvePreset } from "@/lib/dates/periods";
import { aggregateComponents } from "@/lib/metrics/derive";
import { inRange, type DatedRow } from "@/lib/read-model/build";

import { adRows, campaignRows, simulatedReach, syncStatusFor, type SimContext } from "./build";
import { SIM_CLIENTS, SIM_CURRENCY, SIM_TIMEZONE } from "./catalog";

const META_OBJECTIVE: Record<string, string> = {
  Vendas: "OUTCOME_SALES",
  Cadastros: "OUTCOME_LEADS",
  Mensagens: "OUTCOME_ENGAGEMENT",
  Reconhecimento: "OUTCOME_AWARENESS",
  Tráfego: "OUTCOME_TRAFFIC",
};

/** Stable UUID (v8 layout) derived from the organisation and a catalogue id. */
export function demoId(organizationId: string, key: string): string {
  const h = createHash("sha256").update(`wrmax-demo:${organizationId}:${key}`).digest("hex");
  const variant = ((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function metricColumns(row: DatedRow) {
  return {
    date: row.date,
    currency: SIM_CURRENCY,
    spend: row.spend,
    impressions: row.impressions,
    inline_link_clicks: row.linkClicks,
    results: row.results,
    result_indicator: row.resultIndicator,
    purchase_value: row.purchaseValue ?? null,
    source: "simulated" as const,
  };
}

export function buildSeedPlan(organizationId: string, ctx: SimContext) {
  const id = (key: string) => demoId(organizationId, key);
  const connectionId = id("connection");

  const clients = SIM_CLIENTS.map((c) => ({
    id: id(c.id),
    organization_id: organizationId,
    name: c.name,
    objective: c.objective,
    cost_per_result_goal: c.costPerResultGoal,
  }));

  const adAccounts = SIM_CLIENTS.flatMap((c) =>
    c.accounts.map((a) => ({
      id: id(a.id),
      organization_id: organizationId,
      client_id: id(c.id),
      connection_id: connectionId,
      external_id: a.externalId,
      name: a.name,
      currency: SIM_CURRENCY,
      timezone_name: SIM_TIMEZONE,
      account_status: "ACTIVE",
      sync_enabled: true,
    })),
  );

  const campaigns = [];
  const ads = [];
  const campaignMetrics = [];
  const adMetrics = [];
  const reachSnapshots = [];
  const syncStates = [];

  for (const client of SIM_CLIENTS) {
    const sync = syncStatusFor(client, ctx);
    for (const account of client.accounts) {
      const accountRows: DatedRow[] = [];
      for (const c of account.campaigns) {
        const status = c.status === "active" ? "ACTIVE" : "PAUSED";
        const rows = campaignRows(c, ctx, sync.dataThrough);
        accountRows.push(...rows);
        campaigns.push({
          id: id(c.id),
          organization_id: organizationId,
          ad_account_id: id(account.id),
          external_id: c.id,
          name: c.name,
          objective: META_OBJECTIVE[c.objectiveLabel] ?? null,
          status,
          effective_status: status,
        });
        for (const row of rows) {
          campaignMetrics.push({
            campaign_id: id(c.id),
            organization_id: organizationId,
            ad_account_id: id(account.id),
            ...metricColumns(row),
            add_to_cart: row.addToCart ?? null,
            initiate_checkout: row.initiateCheckout ?? null,
          });
        }
        for (const ad of c.ads ?? []) {
          ads.push({
            id: id(ad.id),
            organization_id: organizationId,
            ad_account_id: id(account.id),
            campaign_id: id(c.id),
            external_id: ad.id,
            name: ad.name,
            status,
            thumbnail_url: ad.thumbnailUrl,
          });
          for (const row of adRows(rows, ad)) {
            adMetrics.push({
              ad_id: id(ad.id),
              organization_id: organizationId,
              ad_account_id: id(account.id),
              campaign_id: id(c.id),
              ...metricColumns(row),
            });
          }
        }
      }

      // Account-level deduplicated reach for every preset and its previous period.
      const ranges = PERIOD_PRESETS.flatMap((p) => {
        const range = resolvePreset(p, ctx.today);
        return [range, previousPeriod(range)];
      });
      const seen = new Set<string>();
      for (const range of ranges) {
        const key = `${range.from}:${range.to}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const impressions = aggregateComponents(inRange(accountRows, range)).impressions;
        if (impressions === null) continue;
        const reach = simulatedReach(impressions, rangeLength(range));
        reachSnapshots.push({
          organization_id: organizationId,
          ad_account_id: id(account.id),
          date_start: range.from,
          date_stop: range.to,
          reach: reach.reach,
          impressions: reach.impressions,
          frequency: reach.reach ? Math.round((impressions / reach.reach) * 10_000) / 10_000 : null,
          source: "simulated" as const,
        });
      }

      syncStates.push({
        ad_account_id: id(account.id),
        organization_id: organizationId,
        last_success_at: sync.lastSuccessAt,
        data_through_date: sync.dataThrough,
        last_attempt_at: ctx.now.toISOString(),
        last_error_code: sync.health === "failing" ? "17" : null,
        last_error_message: sync.lastError,
        consecutive_failures: client.sync.kind === "failing" ? client.sync.daysSinceSuccess : 0,
      });
    }
  }

  return {
    connection: {
      id: connectionId,
      organization_id: organizationId,
      platform: "meta" as const,
      label: "Business Manager (demonstração)",
      token_type: "system_user" as const,
      scopes: ["ads_read", "business_management"],
      status: "active" as const,
      last_validated_at: ctx.now.toISOString(),
    },
    clients,
    adAccounts,
    campaigns,
    ads,
    campaignMetrics,
    adMetrics,
    reachSnapshots,
    syncStates,
  };
}

export type SeedPlan = ReturnType<typeof buildSeedPlan>;
