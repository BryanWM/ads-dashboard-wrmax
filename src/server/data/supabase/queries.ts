import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { DateRange } from "@/lib/dates/periods";
import type { ClientObjective } from "@/lib/domain/types";
import type { MetricRow, SyncStateRow } from "@/lib/read-model/db-rows";

/**
 * Raw reads, always through the user's client (RLS). No business rules here —
 * mapping lives in src/lib/read-model.
 */

const PAGE = 1000; // PostgREST's default max rows per request

interface Page<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/** Reads every row of a query in pages (a long period easily exceeds 1000 rows). */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(`Supabase read failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

function must<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(`Supabase read failed: ${result.error.message}`);
  return result.data as T;
}

export interface ClientRecord {
  id: string;
  name: string;
  objective: ClientObjective | null;
  cost_per_result_goal: number | string | null;
  ad_accounts: { id: string; name: string; currency: string; timezone_name: string }[];
}

/** One client, optionally narrowed to one of its ad accounts (`?conta=`). */
export interface Scope {
  clientId: string;
  accountId: string | null;
}

export async function selectClients(db: SupabaseClient): Promise<ClientRecord[]> {
  return must(
    await db
      .from("clients")
      .select(
        "id, name, objective, cost_per_result_goal, ad_accounts(id, name, currency, timezone_name)",
      )
      .eq("status", "active")
      .order("created_at")
      .order("name")
      .order("name", { referencedTable: "ad_accounts" }),
  );
}

export async function selectSyncStates(db: SupabaseClient, scope: Scope) {
  let q = db
    .from("ad_account_sync_state")
    .select(
      "ad_account_id, last_success_at, data_through_date, consecutive_failures, last_error_message",
    )
    .eq("client_id", scope.clientId);
  if (scope.accountId) q = q.eq("ad_account_id", scope.accountId);
  return must(await q) as (SyncStateRow & { ad_account_id: string })[];
}

export interface CampaignRecord {
  id: string;
  name: string;
  objective: string | null;
  status: string | null;
  effective_status: string | null;
}

export async function selectCampaigns(db: SupabaseClient, scope: Scope) {
  let q = db
    .from("campaigns")
    .select("id, name, objective, status, effective_status")
    .eq("client_id", scope.clientId);
  if (scope.accountId) q = q.eq("ad_account_id", scope.accountId);
  return must(await q.order("name")) as CampaignRecord[];
}

const METRIC_COLUMNS =
  "date, spend, impressions, inline_link_clicks, results, result_indicator, purchase_value, source";

export type CampaignMetricRecord = MetricRow & {
  campaign_id: string;
  source: "meta" | "simulated";
};

export function selectCampaignMetrics(db: SupabaseClient, scope: Scope, window: DateRange) {
  return fetchAll<CampaignMetricRecord>((from, to) => {
    let q = db
      .from("campaign_metrics_daily")
      .select(`campaign_id, ${METRIC_COLUMNS}, add_to_cart, initiate_checkout`)
      .eq("client_id", scope.clientId)
      .gte("date", window.from)
      .lte("date", window.to);
    if (scope.accountId) q = q.eq("ad_account_id", scope.accountId);
    return q.order("date").order("campaign_id").range(from, to);
  });
}

export interface AdRecord {
  id: string;
  name: string;
  campaign_id: string;
  thumbnail_url: string | null;
}

export async function selectAds(db: SupabaseClient, scope: Scope) {
  let q = db
    .from("ads")
    .select("id, name, campaign_id, thumbnail_url")
    .eq("client_id", scope.clientId);
  if (scope.accountId) q = q.eq("ad_account_id", scope.accountId);
  return must(await q) as AdRecord[];
}

export type AdMetricRecord = MetricRow & { ad_id: string };

export function selectAdMetrics(db: SupabaseClient, scope: Scope, window: DateRange) {
  return fetchAll<AdMetricRecord>((from, to) => {
    let q = db
      .from("ad_metrics_daily")
      .select(`ad_id, ${METRIC_COLUMNS}`)
      .eq("client_id", scope.clientId)
      .gte("date", window.from)
      .lte("date", window.to);
    if (scope.accountId) q = q.eq("ad_account_id", scope.accountId);
    return q.order("date").order("ad_id").range(from, to);
  });
}

export interface ReachRecord {
  ad_account_id: string;
  date_start: string;
  date_stop: string;
  reach: number | string | null;
  impressions: number | string | null;
}

export async function selectAccountReach(db: SupabaseClient, scope: Scope, window: DateRange) {
  let q = db
    .from("reach_snapshots")
    .select("ad_account_id, date_start, date_stop, reach, impressions")
    .eq("client_id", scope.clientId)
    .is("campaign_id", null)
    .gte("date_start", window.from)
    .lte("date_stop", window.to);
  if (scope.accountId) q = q.eq("ad_account_id", scope.accountId);
  return must(await q) as ReachRecord[];
}

/** True when the viewer can see any simulated row (drives the "Dados simulados" badge). */
export async function hasSimulatedRows(db: SupabaseClient): Promise<boolean> {
  const rows = must(
    await db
      .from("campaign_metrics_daily")
      .select("campaign_id")
      .eq("source", "simulated")
      .limit(1),
  ) as unknown[];
  return rows.length > 0;
}
