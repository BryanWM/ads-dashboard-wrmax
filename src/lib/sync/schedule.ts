import { todayInTimeZone } from "@/lib/dates/periods";

/**
 * Rules of the daily scheduler (Phase 7, ADR-014). Pure: the server feeds the rows.
 * The "queue" is the account's sync state: an account is due until it has a success
 * dated today in its own timezone, so a second cron call on the same day (or a call
 * that ran out of time halfway) only picks up what is still missing.
 */

/** Automatic attempts in a row before the scheduler stops trying (manual still works). */
export const MAX_ATTEMPTS = 5;

/** A job still "running" after this long was killed with its function (timeout). */
export const STALE_JOB_MINUTES = 15;

const MIN_RETRY_MINUTES = 15;
const MAX_RETRY_MINUTES = 24 * 60;

/** Exponential backoff: 15 min, 30, 60… capped at a day; Meta's own wait wins if longer. */
export function retryDelayMinutes(attempt: number, metaWaitMinutes = 0): number {
  const backoff = Math.min(MIN_RETRY_MINUTES * 2 ** Math.max(attempt - 1, 0), MAX_RETRY_MINUTES);
  return Math.max(backoff, metaWaitMinutes);
}

export interface ScheduleAccount {
  id: string;
  timezone_name: string;
  client_id: string | null;
  sync_enabled: boolean;
}

export interface ScheduleState {
  last_success_at: string | null;
  last_attempt_at: string | null;
  consecutive_failures: number;
}

export type SkipReason =
  | "disabled"
  | "no_client"
  | "connection_unavailable"
  | "running"
  | "synced_today"
  | "gave_up"
  | "waiting_retry";

/** Why an account is NOT synced now; null = it is due. */
export function skipReason(
  account: ScheduleAccount,
  state: ScheduleState | null,
  ctx: { connectionReady: boolean; running: boolean; now: Date },
): SkipReason | null {
  if (!account.sync_enabled) return "disabled";
  if (!account.client_id) return "no_client";
  if (!ctx.connectionReady) return "connection_unavailable";
  if (ctx.running) return "running";
  if (!state) return null;

  const today = todayInTimeZone(account.timezone_name, ctx.now);
  if (
    state.last_success_at &&
    todayInTimeZone(account.timezone_name, new Date(state.last_success_at)) === today
  ) {
    return "synced_today";
  }
  const failures = state.consecutive_failures;
  if (failures >= MAX_ATTEMPTS) return "gave_up";
  if (failures > 0 && state.last_attempt_at) {
    const retryAt =
      new Date(state.last_attempt_at).getTime() + retryDelayMinutes(failures) * 60_000;
    if (retryAt > ctx.now.getTime()) return "waiting_retry";
  }
  return null;
}
