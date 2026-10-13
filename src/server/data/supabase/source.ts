import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { canAccessAdmin, type Viewer } from "@/lib/domain/access";
import type { PeriodSelection } from "@/lib/dates/period-params";
import type { ClientSummary } from "@/lib/domain/types";
import {
  buildCampaignsData,
  buildDashboardData,
  type ClientDataInput,
  type DatedRow,
} from "@/lib/read-model/build";
import {
  campaignObjectiveLabel,
  campaignStatus,
  combineSyncStates,
  latestIndicator,
  num,
  toDatedRow,
} from "@/lib/read-model/db-rows";
import { createUserSupabase } from "@/server/supabase/server";

import type { MetricsDataSource } from "../source";

import { loadSupabaseAdminOverview } from "./admin";
import {
  hasSimulatedRows,
  selectAccountReach,
  selectAdMetrics,
  selectAds,
  selectCampaignMetrics,
  selectCampaigns,
  selectClients,
  selectSyncStates,
  type ClientRecord,
} from "./queries";

const FALLBACK_TIMEZONE = "America/Sao_Paulo";
const FALLBACK_CURRENCY = "BRL";

function summary(c: ClientRecord): ClientSummary {
  const first = c.ad_accounts[0];
  return {
    id: c.id,
    name: c.name,
    currency: first?.currency ?? FALLBACK_CURRENCY,
    timezone: first?.timezone_name ?? FALLBACK_TIMEZONE,
    adAccountCount: c.ad_accounts.length,
    objective: c.objective,
    costPerResultGoal: num(c.cost_per_result_goal),
  };
}

function groupRows<T extends { date: string }>(
  rows: readonly T[],
  key: (row: T) => string,
  map: (row: T) => DatedRow,
): Map<string, DatedRow[]> {
  const out = new Map<string, DatedRow[]>();
  for (const row of rows) {
    const list = out.get(key(row)) ?? [];
    list.push(map(row));
    out.set(key(row), list);
  }
  return out;
}

/**
 * Reads with the signed-in person's JWT, so RLS decides what exists: a foreign or
 * unknown client id simply returns nothing (→ null), never someone else's data.
 */
export function createSupabaseSource(viewer: Viewer): MetricsDataSource {
  let client: Promise<SupabaseClient> | null = null;
  const db = () => (client ??= createUserSupabase());
  let clients: Promise<ClientRecord[]> | null = null;
  const loadClients = async () => (clients ??= selectClients(await db()));

  async function clientInput(
    clientId: string,
    selection: PeriodSelection,
  ): Promise<ClientDataInput | null> {
    const record = (await loadClients()).find((c) => c.id === clientId);
    if (!record) return null;
    const supabase = await db();
    // Everything the page can show: the previous period through the selected one.
    const window = { from: selection.previous.from, to: selection.range.to };

    const [states, campaigns, metrics, ads, adMetrics, reach] = await Promise.all([
      selectSyncStates(supabase, clientId),
      selectCampaigns(supabase, clientId),
      selectCampaignMetrics(supabase, clientId, window),
      selectAds(supabase, clientId),
      selectAdMetrics(supabase, clientId, window),
      selectAccountReach(supabase, clientId, window),
    ]);

    const stateOf = new Map(states.map((s) => [s.ad_account_id, s]));
    const sync = combineSyncStates(
      record.ad_accounts.map(
        (a) =>
          stateOf.get(a.id) ?? {
            last_success_at: null,
            data_through_date: null,
            consecutive_failures: 0,
            last_error_message: null,
          },
      ),
      new Date(),
    );

    const rowsByCampaign = groupRows(metrics, (r) => r.campaign_id, toDatedRow);
    const campaignInputs = campaigns.map((c) => {
      const rows = rowsByCampaign.get(c.id) ?? [];
      const indicator = latestIndicator(rows);
      return {
        id: c.id,
        name: c.name,
        status: campaignStatus(c.effective_status, c.status),
        objectiveLabel: campaignObjectiveLabel(c.objective, indicator),
        resultIndicator: indicator,
        rows,
      };
    });

    const campaignById = new Map(campaignInputs.map((c) => [c.id, c]));
    const rowsByAd = groupRows(adMetrics, (r) => r.ad_id, toDatedRow);
    const adInputs =
      ads.length === 0
        ? null
        : ads.map((ad) => {
            const rows = rowsByAd.get(ad.id) ?? [];
            const campaign = campaignById.get(ad.campaign_id);
            return {
              id: ad.id,
              name: ad.name,
              campaignName: campaign?.name ?? "",
              thumbnailUrl: ad.thumbnail_url,
              resultIndicator: latestIndicator(rows) ?? campaign?.resultIndicator ?? null,
              rows,
            };
          });

    return {
      origin: metrics.some((m) => m.source === "simulated") ? "simulated" : "meta",
      client: summary(record),
      sync,
      campaigns: campaignInputs,
      ads: adInputs,
      reachFor(range) {
        // Meta deduplicates reach within ONE account; summing accounts would count the
        // same person twice, so several accounts mean "unavailable" (docs §6).
        if (record.ad_accounts.length !== 1) return null;
        const snap = reach.find((r) => r.date_start === range.from && r.date_stop === range.to);
        return snap ? { reach: num(snap.reach), impressions: num(snap.impressions) } : null;
      },
    };
  }

  return {
    origin: "meta",

    async listClients() {
      return (await loadClients()).map(summary);
    },

    async getDashboard(clientId, selection) {
      const input = await clientInput(clientId, selection);
      return input ? buildDashboardData(input, selection) : null;
    },

    async getCampaigns(clientId, selection) {
      const input = await clientInput(clientId, selection);
      return input ? buildCampaignsData(input, selection) : null;
    },

    async getAdminOverview() {
      if (!canAccessAdmin(viewer) || viewer.organizationId === null) return null;
      const supabase = await db();
      return loadSupabaseAdminOverview(
        supabase,
        viewer.organizationId,
        await hasSimulatedRows(supabase),
      );
    },

    async hasSimulatedData() {
      return hasSimulatedRows(await db());
    },
  };
}
