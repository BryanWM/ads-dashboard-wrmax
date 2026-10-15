import { describe, expect, it } from "vitest";

import { isCronAuthorized } from "@/lib/sync/cron-auth";
import {
  MAX_ATTEMPTS,
  retryDelayMinutes,
  skipReason,
  type ScheduleAccount,
  type ScheduleState,
} from "@/lib/sync/schedule";

// 2026-10-15 07:00 in São Paulo (UTC-3).
const now = new Date("2026-10-15T10:00:00Z");
const account: ScheduleAccount = {
  id: "a",
  timezone_name: "America/Sao_Paulo",
  client_id: "c",
  sync_enabled: true,
};
const ready = { connectionReady: true, running: false, now };
const state = (s: Partial<ScheduleState>): ScheduleState => ({
  last_success_at: null,
  last_attempt_at: null,
  consecutive_failures: 0,
  ...s,
});

describe("scheduler: which accounts run", () => {
  it("runs a never-synced account and one last synced yesterday", () => {
    expect(skipReason(account, null, ready)).toBeNull();
    expect(
      skipReason(account, state({ last_success_at: "2026-10-14T09:10:00Z" }), ready),
    ).toBeNull();
  });

  it("skips an account already synced today in ITS timezone (re-run is a no-op)", () => {
    expect(skipReason(account, state({ last_success_at: "2026-10-15T09:30:00Z" }), ready)).toBe(
      "synced_today",
    );
    // 02:00 UTC on the 15th is still the 14th in São Paulo → due.
    expect(
      skipReason(account, state({ last_success_at: "2026-10-15T02:00:00Z" }), ready),
    ).toBeNull();
  });

  it("respects the switch, the client, the connection and a running job", () => {
    expect(skipReason({ ...account, sync_enabled: false }, null, ready)).toBe("disabled");
    expect(skipReason({ ...account, client_id: null }, null, ready)).toBe("no_client");
    expect(skipReason(account, null, { ...ready, connectionReady: false })).toBe(
      "connection_unavailable",
    );
    expect(skipReason(account, null, { ...ready, running: true })).toBe("running");
  });

  it("waits for the backoff after a failure, then retries", () => {
    const failedAt = (minutesAgo: number) =>
      new Date(now.getTime() - minutesAgo * 60_000).toISOString();
    expect(
      skipReason(account, state({ consecutive_failures: 2, last_attempt_at: failedAt(10) }), ready),
    ).toBe("waiting_retry");
    expect(
      skipReason(account, state({ consecutive_failures: 2, last_attempt_at: failedAt(31) }), ready),
    ).toBeNull();
  });

  it("gives up after MAX_ATTEMPTS failures in a row", () => {
    expect(
      skipReason(
        account,
        state({ consecutive_failures: MAX_ATTEMPTS, last_attempt_at: "2026-10-10T09:00:00Z" }),
        ready,
      ),
    ).toBe("gave_up");
  });
});

describe("retry backoff", () => {
  it("doubles from 15 minutes, caps at a day and honours Meta's wait", () => {
    expect([1, 2, 3, 4].map((a) => retryDelayMinutes(a))).toEqual([15, 30, 60, 120]);
    expect(retryDelayMinutes(20)).toBe(24 * 60);
    expect(retryDelayMinutes(1, 90)).toBe(90);
  });
});

describe("cron authorisation", () => {
  const secret = "s3cret-value-with-enough-length";

  it("accepts only the exact bearer secret", () => {
    expect(isCronAuthorized(`Bearer ${secret}`, secret)).toBe(true);
    expect(isCronAuthorized(`Bearer ${secret}x`, secret)).toBe(false);
    expect(isCronAuthorized(secret, secret)).toBe(false);
    expect(isCronAuthorized(null, secret)).toBe(false);
  });

  it("stays closed without a (long enough) secret", () => {
    expect(isCronAuthorized("Bearer ", undefined)).toBe(false);
    expect(isCronAuthorized("Bearer short", "short")).toBe(false);
  });
});
