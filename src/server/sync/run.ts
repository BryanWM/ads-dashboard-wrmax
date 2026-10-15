import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { syncMetaAccount, type AccountSyncResult, type SyncAccount } from "./meta-account";

const ACCOUNT_COLUMNS =
  "id, organization_id, connection_id, external_id, name, currency, timezone_name";

/**
 * One sync run for one organisation ("Buscar dados" and the daily scheduler).
 * Accounts run one after another: low concurrency is kinder to Meta's limits.
 * Past `deadline` (epoch ms) no new account starts; the rest stay due for the next call.
 */
export async function runSync(
  db: SupabaseClient,
  organizationId: string,
  accountIds: string[],
  trigger: "manual" | "cron" | "retry",
  requestedBy: string | null,
  deadline = Number.POSITIVE_INFINITY,
): Promise<{
  runId: string;
  results: (AccountSyncResult & { accountId: string; name: string })[];
  deferred: number;
}> {
  const { data: accounts, error } = await db
    .from("ad_accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("organization_id", organizationId)
    .eq("platform", "meta")
    .in("id", accountIds);
  if (error) throw new Error(`read accounts: ${error.message}`);

  const { data: run, error: runError } = await db
    .from("sync_runs")
    .insert({
      organization_id: organizationId,
      trigger,
      requested_by: requestedBy,
      status: "running",
    })
    .select("id")
    .single();
  if (runError || !run) throw new Error(`create run: ${runError?.message}`);

  const queue = (accounts ?? []) as SyncAccount[];
  const results = [];
  for (const account of queue) {
    // The first account always runs, so a run is never empty.
    if (results.length > 0 && Date.now() > deadline) break;
    const result = await syncMetaAccount(db, account, run.id);
    results.push({ ...result, accountId: account.id, name: account.name });
  }
  const deferred = queue.length - results.length;

  const failed = results.filter((r) => !r.ok);
  await db
    .from("sync_runs")
    .update({
      finished_at: new Date().toISOString(),
      status:
        failed.length === 0 ? "succeeded" : failed.length === results.length ? "failed" : "partial",
      stats: {
        accounts_total: results.length,
        accounts_failed: failed.length,
        rows_upserted: results.reduce((n, r) => n + r.rows, 0),
        accounts_deferred: deferred || undefined,
        failure_summary: failed.length
          ? failed
              .map((r) => `${r.name}: ${r.error}`)
              .join(" · ")
              .slice(0, 500)
          : undefined,
      },
    })
    .eq("id", run.id);

  return { runId: run.id, results, deferred };
}
