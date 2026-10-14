import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { todayInTimeZone, type DateRange } from "@/lib/dates/periods";
import { friendlyMetaError, isRetryable } from "@/lib/meta/errors";
import { parseInsightRows, toMetricColumns, type InsightRow } from "@/lib/meta/insights";
import { chooseResultEvent, type ResultEvent } from "@/lib/meta/results";
import { SLOW_DOWN_ABOVE_PERCENT, type MetaUsage } from "@/lib/meta/usage";
import { reachRanges, splitRange, syncWindow } from "@/lib/meta/sync-window";
import { readConnectionToken } from "@/server/crypto/tokens";
import { accountReach, dailyInsights, getAds, listCampaigns } from "@/server/integrations/meta/api";
import { graphVersion, MetaApiError } from "@/server/integrations/meta/client";

/**
 * Syncs ONE ad account from Meta into the database with the SERVICE ROLE (the only
 * place besides audited admin actions allowed to bypass RLS — ADR-002).
 * Idempotent: natural keys + upsert; days of the window Meta no longer reports are
 * removed. A failure never deletes previously synced data.
 */

const BATCH = 500;

export interface SyncAccount {
  id: string;
  organization_id: string;
  connection_id: string;
  external_id: string;
  name: string;
  currency: string;
  timezone_name: string;
}

export interface AccountSyncResult {
  ok: boolean;
  window: DateRange;
  rows: number;
  warnings: string[];
  /** Friendly, sanitised message when ok = false. */
  error?: string;
}

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data as T;
}

async function upsertAll(db: SupabaseClient, table: string, rows: object[], onConflict: string) {
  for (let i = 0; i < rows.length; i += BATCH) {
    must(await db.from(table).upsert(rows.slice(i, i + BATCH), { onConflict }), `upsert ${table}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function brake(usage: MetaUsage | null) {
  if (
    usage?.maxPercent !== null &&
    usage?.maxPercent !== undefined &&
    usage.maxPercent > SLOW_DOWN_ABOVE_PERCENT
  ) {
    await sleep(5_000);
  }
}

/** Daily insights for a range; halves the range when Meta says it is too much data. */
async function fetchDaily(
  token: string,
  accountId: string,
  level: "campaign" | "ad",
  range: DateRange,
): Promise<InsightRow[]> {
  try {
    const { items, usage } = await dailyInsights(token, accountId, level, range);
    await brake(usage);
    const { rows, invalid } = parseInsightRows(items);
    if (invalid > 0) throw new Error(`${invalid} linhas da Meta em formato inesperado (${level}).`);
    return rows;
  } catch (error) {
    const halves =
      error instanceof MetaApiError && error.kind === "too_much_data" ? splitRange(range) : null;
    if (!halves) throw error;
    return [
      ...(await fetchDaily(token, accountId, level, halves[0])),
      ...(await fetchDaily(token, accountId, level, halves[1])),
    ];
  }
}

function groupBy<T>(rows: readonly T[], key: (row: T) => string | undefined) {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    if (!k) continue;
    out.set(k, [...(out.get(k) ?? []), row]);
  }
  return out;
}

async function logEvent(
  db: SupabaseClient,
  ctx: { organizationId: string; jobId: string },
  level: "info" | "warn" | "error",
  message: string,
  context: Record<string, unknown> = {},
) {
  await db.from("sync_events").insert({
    organization_id: ctx.organizationId,
    sync_job_id: ctx.jobId,
    level,
    message,
    context,
  });
}

export async function syncMetaAccount(
  db: SupabaseClient,
  account: SyncAccount,
  runId: string,
): Promise<AccountSyncResult> {
  const startedAt = new Date().toISOString();
  const today = todayInTimeZone(account.timezone_name);
  const state = must(
    await db
      .from("ad_account_sync_state")
      .select("data_through_date, consecutive_failures")
      .eq("ad_account_id", account.id)
      .maybeSingle(),
    "read sync state",
  ) as { data_through_date: string | null; consecutive_failures: number } | null;
  const window = syncWindow(today, state?.data_through_date ?? null);

  const job = must(
    await db
      .from("sync_jobs")
      .insert({
        sync_run_id: runId,
        organization_id: account.organization_id,
        ad_account_id: account.id,
        window_start: window.from,
        window_end: window.to,
        status: "running",
        attempt: 1,
        started_at: startedAt,
      })
      .select("id")
      .single(),
    "create job",
  ) as { id: string };
  const ctx = { organizationId: account.organization_id, jobId: job.id };
  const warnings: string[] = [];
  const apiVersion = graphVersion();
  const base = {
    organization_id: account.organization_id,
    ad_account_id: account.id,
    currency: account.currency,
    source: "meta" as const,
    api_version: apiVersion,
    synced_at: startedAt,
    sync_job_id: job.id,
  };

  try {
    const token = await readConnectionToken(account.connection_id);

    // 1. Campaigns (+ stubs for campaigns that only appear in insights, e.g. deleted).
    const [campaigns, campaignRows] = await Promise.all([
      listCampaigns(token, account.external_id),
      fetchDaily(token, account.external_id, "campaign", window),
    ]);
    const known = new Set(campaigns.map((c) => c.id));
    const stubs = [...groupBy(campaignRows, (r) => r.campaign_id)]
      .filter(([id]) => !known.has(id))
      .map(([id, rows]) => ({ id, name: rows[0]?.campaign_name ?? `Campanha ${id}` }));
    const saved = must(
      await db
        .from("campaigns")
        .upsert(
          [...campaigns, ...stubs].map((c) => ({
            organization_id: account.organization_id,
            ad_account_id: account.id,
            external_id: c.id,
            name: c.name,
            objective: "objective" in c ? (c.objective ?? null) : null,
            status: "status" in c ? (c.status ?? null) : null,
            effective_status: "effective_status" in c ? (c.effective_status ?? null) : null,
            buying_type: "buying_type" in c ? (c.buying_type ?? null) : null,
            start_time: "start_time" in c ? (c.start_time ?? null) : null,
            stop_time: "stop_time" in c ? (c.stop_time ?? null) : null,
            external_updated_time: "updated_time" in c ? (c.updated_time ?? null) : null,
            synced_at: startedAt,
          })),
          { onConflict: "ad_account_id,external_id" },
        )
        .select("id, external_id, objective"),
      "upsert campaigns",
    ) as { id: string; external_id: string; objective: string | null }[];
    const campaignByExternal = new Map(saved.map((c) => [c.external_id, c]));

    // 2. Daily campaign metrics. One result event per campaign, decided over all its rows.
    const eventByCampaign = new Map<string, ResultEvent | null>();
    const metricRows = [...groupBy(campaignRows, (r) => r.campaign_id)].flatMap(
      ([externalId, rows]) => {
        const campaign = campaignByExternal.get(externalId);
        if (!campaign) return [];
        const event = chooseResultEvent(campaign.objective, rows);
        eventByCampaign.set(externalId, event);
        return rows.map((r) => ({
          ...base,
          campaign_id: campaign.id,
          ...toMetricColumns(r, event),
        }));
      },
    );
    await upsertAll(
      db,
      "campaign_metrics_daily",
      metricRows,
      "campaign_id,date,attribution_setting",
    );
    // Days in the window Meta no longer reports (e.g. corrected to no delivery).
    must(
      await db
        .from("campaign_metrics_daily")
        .delete()
        .eq("ad_account_id", account.id)
        .eq("source", "meta")
        .gte("date", window.from)
        .lte("date", window.to)
        .lt("synced_at", startedAt),
      "remove stale campaign rows",
    );

    // 3. Ads (creatives). A failure here is a warning: campaign numbers already stand.
    let adRowCount = 0;
    try {
      const adRows = await fetchDaily(token, account.external_id, "ad", window);
      const byAd = groupBy(adRows, (r) => r.ad_id);
      const meta = await getAds(token, [...byAd.keys()]);
      const metaById = new Map(meta.map((a) => [a.id, a]));
      const ads = [...byAd].flatMap(([externalId, rows]) => {
        const campaign = campaignByExternal.get(rows[0]?.campaign_id ?? "");
        if (!campaign) return [];
        const m = metaById.get(externalId);
        return [
          {
            organization_id: account.organization_id,
            ad_account_id: account.id,
            campaign_id: campaign.id,
            external_id: externalId,
            name: m?.name ?? rows[0]?.ad_name ?? `Anúncio ${externalId}`,
            status: m?.effective_status ?? null,
            thumbnail_url: m?.creative?.thumbnail_url ?? null,
            synced_at: startedAt,
          },
        ];
      });
      const savedAds = must(
        await db
          .from("ads")
          .upsert(ads, { onConflict: "ad_account_id,external_id" })
          .select("id, external_id, campaign_id"),
        "upsert ads",
      ) as { id: string; external_id: string; campaign_id: string }[];
      const adByExternal = new Map(savedAds.map((a) => [a.external_id, a]));
      const adMetricRows = adRows.flatMap((r) => {
        const ad = adByExternal.get(r.ad_id ?? "");
        if (!ad) return [];
        const m = toMetricColumns(r, eventByCampaign.get(r.campaign_id ?? "") ?? null);
        return [
          {
            ...base,
            ad_id: ad.id,
            campaign_id: ad.campaign_id,
            date: m.date,
            spend: m.spend,
            impressions: m.impressions,
            inline_link_clicks: m.inline_link_clicks,
            results: m.results,
            result_indicator: m.result_indicator,
            purchase_value: m.purchase_value,
          },
        ];
      });
      await upsertAll(db, "ad_metrics_daily", adMetricRows, "ad_id,date,attribution_setting");
      adRowCount = adMetricRows.length;
    } catch (error) {
      const message =
        error instanceof MetaApiError ? friendlyMetaError(error.kind) : "Falha ao ler anúncios.";
      warnings.push(`Anúncios não atualizados: ${message}`);
      await logEvent(db, ctx, "warn", "ads sync failed", {
        kind: error instanceof MetaApiError ? error.kind : "internal",
      });
    }

    // 4. Deduplicated reach for every preset period (and its comparison period).
    try {
      const snapshots = [];
      for (const range of reachRanges(today)) {
        const r = await accountReach(token, account.external_id, range);
        if (!r) continue;
        snapshots.push({
          organization_id: account.organization_id,
          ad_account_id: account.id,
          date_start: range.from,
          date_stop: range.to,
          reach: r.reach === undefined ? null : Math.round(Number(r.reach)),
          impressions: r.impressions === undefined ? null : Math.round(Number(r.impressions)),
          frequency: r.frequency === undefined ? null : Number(r.frequency),
          source: "meta" as const,
        });
      }
      must(
        await db
          .from("reach_snapshots")
          .delete()
          .eq("ad_account_id", account.id)
          .is("campaign_id", null)
          .eq("source", "meta"),
        "replace reach",
      );
      if (snapshots.length > 0)
        must(await db.from("reach_snapshots").insert(snapshots), "insert reach");
    } catch (error) {
      const message =
        error instanceof MetaApiError ? friendlyMetaError(error.kind) : "Falha ao ler alcance.";
      warnings.push(`Alcance não atualizado: ${message}`);
      await logEvent(db, ctx, "warn", "reach sync failed", {
        kind: error instanceof MetaApiError ? error.kind : "internal",
      });
    }

    const rows = metricRows.length + adRowCount;
    const finishedAt = new Date().toISOString();
    must(
      await db.from("ad_account_sync_state").upsert(
        {
          ad_account_id: account.id,
          organization_id: account.organization_id,
          last_success_at: finishedAt,
          data_through_date: window.to,
          last_attempt_at: finishedAt,
          last_error_code: null,
          last_error_message: null,
          consecutive_failures: 0,
        },
        { onConflict: "ad_account_id" },
      ),
      "update sync state",
    );
    must(
      await db
        .from("sync_jobs")
        .update({ status: "succeeded", rows_upserted: rows, finished_at: finishedAt })
        .eq("id", job.id),
      "finish job",
    );
    await logEvent(db, ctx, "info", "account synced", { window, rows, warnings: warnings.length });
    return { ok: true, window, rows, warnings };
  } catch (error) {
    const meta = error instanceof MetaApiError ? error : null;
    const kind = meta?.kind ?? null;
    const friendly = kind
      ? friendlyMetaError(kind)
      : "Falha interna na sincronização. Veja o registro.";
    const finishedAt = new Date().toISOString();

    await db
      .from("sync_jobs")
      .update({
        status: kind && isRetryable(kind) ? "retry_scheduled" : "failed",
        error_code: meta?.code !== null && meta?.code !== undefined ? String(meta.code) : kind,
        error_message: meta ? meta.message : friendly,
        next_attempt_at: new Date(
          Date.now() + Math.max(meta?.usage?.waitMinutes ?? 0, 15) * 60_000,
        ).toISOString(),
        finished_at: finishedAt,
      })
      .eq("id", job.id);
    await db.from("ad_account_sync_state").upsert(
      {
        ad_account_id: account.id,
        organization_id: account.organization_id,
        last_attempt_at: finishedAt,
        last_error_code: kind ?? "internal",
        last_error_message: friendly,
        consecutive_failures: (state?.consecutive_failures ?? 0) + 1,
      },
      { onConflict: "ad_account_id" },
    );
    if (kind === "auth") {
      await db
        .from("platform_connections")
        .update({ status: "needs_reauth" })
        .eq("id", account.connection_id);
    }
    // Internal errors: log the message server-side (never a token: Meta errors are sanitised).
    if (!meta)
      console.error(
        "[sync] account failed",
        account.id,
        error instanceof Error ? error.message : error,
      );
    await logEvent(db, ctx, "error", "account sync failed", { kind: kind ?? "internal" });
    return { ok: false, window, rows: 0, warnings, error: friendly };
  }
}
