/**
 * Pure mapping from database rows (Supabase) to read-model inputs. Kept apart from
 * the queries so the rules are unit-tested without a database.
 */
import type { CampaignStatus, SyncHealth, SyncStatus } from "@/lib/domain/types";
import { resultNames } from "@/lib/metrics/result-types";

import type { DatedRow } from "./build";

/** A *_metrics_daily row as selected by the data source. */
export interface MetricRow {
  date: string;
  spend: number | string | null;
  impressions: number | string | null;
  inline_link_clicks: number | string | null;
  results: number | string | null;
  result_indicator: string | null;
  purchase_value: number | string | null;
  add_to_cart?: number | string | null;
  initiate_checkout?: number | string | null;
}

export interface SyncStateRow {
  last_success_at: string | null;
  data_through_date: string | null;
  consecutive_failures: number;
  last_error_message: string | null;
}

/** PostgREST may send bigint/numeric as strings; null stays null (never 0). */
export function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function toDatedRow(row: MetricRow): DatedRow {
  return {
    date: row.date,
    spend: num(row.spend),
    impressions: num(row.impressions),
    linkClicks: num(row.inline_link_clicks),
    results: num(row.results),
    resultIndicator: row.result_indicator,
    purchaseValue: num(row.purchase_value),
    addToCart: num(row.add_to_cart),
    initiateCheckout: num(row.initiate_checkout),
  };
}

/** Meta `effective_status` (or `status`) → the three states shown to people. */
export function campaignStatus(effective: string | null, status: string | null): CampaignStatus {
  const value = (effective ?? status ?? "").toUpperCase();
  if (value === "ACTIVE") return "active";
  if (value === "ARCHIVED" || value === "DELETED") return "archived";
  return "paused";
}

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_SALES: "Vendas",
  OUTCOME_LEADS: "Cadastros",
  OUTCOME_ENGAGEMENT: "Engajamento",
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_AWARENESS: "Reconhecimento",
  OUTCOME_APP_PROMOTION: "Aplicativo",
};

/**
 * What the campaign is for, in plain words. The optimised result says more than
 * Meta's objective (a "message" campaign is OUTCOME_ENGAGEMENT or OUTCOME_LEADS).
 */
export function campaignObjectiveLabel(objective: string | null, indicator: string | null): string {
  if (indicator !== null) {
    const plural = resultNames(indicator).plural;
    if (plural === "Compras") return "Vendas";
    if (plural === "Conversas") return "Mensagens";
    if (plural.startsWith("Cadastros")) return "Cadastros";
  }
  return (objective && OBJECTIVE_LABELS[objective.toUpperCase()]) || "Outro";
}

/** Last non-null result type seen, so a campaign keeps its label on quiet days. */
export function latestIndicator(rows: readonly DatedRow[]): string | null {
  let latest: { date: string; indicator: string } | null = null;
  for (const r of rows) {
    if (r.resultIndicator !== null && (latest === null || r.date >= latest.date)) {
      latest = { date: r.date, indicator: r.resultIndicator };
    }
  }
  return latest?.indicator ?? null;
}

/** A daily sync older than this is "stale" (one missed run plus margin). */
export const STALE_AFTER_HOURS = 36;

/**
 * One status for a client with several ad accounts: the most conservative view
 * (oldest success, earliest complete day, any failure wins).
 */
export function combineSyncStates(states: readonly SyncStateRow[], now: Date): SyncStatus {
  const succeeded = states.filter((s) => s.last_success_at !== null);
  const failing = states.find((s) => s.consecutive_failures > 0);
  const lastError = failing?.last_error_message ?? null;

  if (succeeded.length === 0) {
    return {
      health: failing ? "failing" : "never",
      lastSuccessAt: null,
      dataThrough: null,
      lastError,
    };
  }

  const lastSuccessAt = succeeded.map((s) => s.last_success_at!).sort()[0]!;
  const through = succeeded.map((s) => s.data_through_date).filter((d): d is string => d !== null);
  const dataThrough = through.length > 0 ? through.sort()[0]! : null;
  const ageHours = (now.getTime() - new Date(lastSuccessAt).getTime()) / 3_600_000;

  let health: SyncHealth = "ok";
  if (failing) health = "failing";
  else if (ageHours > STALE_AFTER_HOURS || succeeded.length < states.length) health = "stale";

  return { health, lastSuccessAt, dataThrough, lastError };
}
