import "server-only";

import {
  skipReason,
  STALE_JOB_MINUTES,
  type ScheduleState,
  type SkipReason,
} from "@/lib/sync/schedule";
import { hasConnectionToken } from "@/server/crypto/tokens";
import { createServiceSupabase } from "@/server/supabase/admin";

import { runSync } from "./run";

/**
 * Daily scheduled sync (Vercel Cron → /api/cron/sync), every organisation.
 * Reuses runSync; which accounts run is decided by src/lib/sync/schedule.ts.
 */

export interface ScheduledSyncSummary {
  due: number;
  synced: number;
  failed: number;
  /** Due accounts left for the next call because the time budget ran out. */
  deferred: number;
  skipped: Partial<Record<SkipReason, number>>;
  staleJobsClosed: number;
}

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data as T;
}

/** Jobs/runs left "running" by a function that was killed (timeout) are closed as failed. */
async function closeStale(db: ReturnType<typeof createServiceSupabase>, now: Date) {
  const cutoff = new Date(now.getTime() - STALE_JOB_MINUTES * 60_000).toISOString();
  const jobs = must(
    await db
      .from("sync_jobs")
      .update({
        status: "failed",
        error_code: "timeout",
        error_message: "A execução foi interrompida antes de terminar.",
        finished_at: now.toISOString(),
      })
      .eq("status", "running")
      .lt("started_at", cutoff)
      .select("id"),
    "close stale jobs",
  ) as { id: string }[];
  must(
    await db
      .from("sync_runs")
      .update({ status: "failed", finished_at: now.toISOString() })
      .eq("status", "running")
      .lt("started_at", cutoff),
    "close stale runs",
  );
  return jobs.length;
}

export async function runScheduledSync({
  deadline,
}: {
  deadline: number;
}): Promise<ScheduledSyncSummary> {
  const db = createServiceSupabase();
  const now = new Date();
  const staleJobsClosed = await closeStale(db, now);

  const [accounts, connections, states, running] = await Promise.all([
    db
      .from("ad_accounts")
      .select("id, organization_id, connection_id, client_id, sync_enabled, timezone_name")
      .eq("platform", "meta")
      .order("created_at"),
    db.from("platform_connections").select("id, status").eq("platform", "meta"),
    db
      .from("ad_account_sync_state")
      .select("ad_account_id, last_success_at, last_attempt_at, consecutive_failures"),
    db.from("sync_jobs").select("ad_account_id").eq("status", "running"),
  ]);
  const accountRows = must(accounts, "read accounts") as {
    id: string;
    organization_id: string;
    connection_id: string;
    client_id: string | null;
    sync_enabled: boolean;
    timezone_name: string;
  }[];
  const stateOf = new Map(
    (must(states, "read states") as (ScheduleState & { ad_account_id: string })[]).map((s) => [
      s.ad_account_id,
      s,
    ]),
  );
  const runningIds = new Set(
    (must(running, "read running jobs") as { ad_account_id: string }[]).map((j) => j.ad_account_id),
  );

  // A connection is ready when active AND it holds a token (demo connections have none).
  const ready = new Map<string, boolean>();
  for (const c of must(connections, "read connections") as { id: string; status: string }[]) {
    const used = accountRows.some((a) => a.connection_id === c.id && a.sync_enabled);
    ready.set(c.id, c.status === "active" && used && (await hasConnectionToken(c.id)));
  }

  const skipped: ScheduledSyncSummary["skipped"] = {};
  const dueByOrg = new Map<string, string[]>();
  for (const account of accountRows) {
    const reason = skipReason(account, stateOf.get(account.id) ?? null, {
      connectionReady: ready.get(account.connection_id) ?? false,
      running: runningIds.has(account.id),
      now,
    });
    if (reason) {
      skipped[reason] = (skipped[reason] ?? 0) + 1;
      continue;
    }
    dueByOrg.set(account.organization_id, [
      ...(dueByOrg.get(account.organization_id) ?? []),
      account.id,
    ]);
  }

  const due = [...dueByOrg.values()].reduce((n, ids) => n + ids.length, 0);
  let synced = 0;
  let failed = 0;
  let processed = 0;
  for (const [organizationId, ids] of dueByOrg) {
    if (Date.now() > deadline) break;
    const result = await runSync(db, organizationId, ids, "cron", null, deadline);
    processed += result.results.length;
    synced += result.results.filter((r) => r.ok).length;
    failed += result.results.filter((r) => !r.ok).length;
  }

  return { due, synced, failed, deferred: due - processed, skipped, staleJobsClosed };
}
