import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AdAccountView,
  AdminOverview,
  AuditEventView,
  ConnectionStatus,
  MemberView,
  MembershipRole,
  SyncRunStatus,
  SyncRunView,
} from "@/lib/domain/admin-types";
import { combineSyncStates, num, type SyncStateRow } from "@/lib/read-model/db-rows";

function must<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(`Supabase read failed: ${result.error.message}`);
  return result.data as T;
}

/** Shape the sync engine writes into sync_runs.stats (Phase 7). */
interface RunStats {
  accounts_total?: number;
  accounts_failed?: number;
  rows_upserted?: number;
  failure_summary?: string;
}

type Profile = { full_name: string | null; email: string | null; last_sign_in_at: string | null };

/** Supabase embeds a to-one relation as an object (or, for some shapes, a one-item array). */
function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Organisation-wide admin read model. RLS already limits every table to the
 * viewer's agency; the caller has checked the role before calling.
 */
export async function loadSupabaseAdminOverview(
  db: SupabaseClient,
  organizationId: string,
  simulated: boolean,
): Promise<AdminOverview | null> {
  const now = new Date();
  const [org, connections, clients, accounts, states, runs, members, audit] = await Promise.all([
    db
      .from("organizations")
      .select("name, default_timezone")
      .eq("id", organizationId)
      .maybeSingle(),
    db
      .from("platform_connections")
      .select("id, label, status, token_type, scopes, last_validated_at, expires_at")
      .eq("organization_id", organizationId)
      .order("created_at"),
    db.from("clients").select("id, name").eq("organization_id", organizationId).order("created_at"),
    db
      .from("ad_accounts")
      .select("id, external_id, name, client_id, currency, timezone_name, sync_enabled")
      .eq("organization_id", organizationId)
      .order("name"),
    db
      .from("ad_account_sync_state")
      .select(
        "ad_account_id, last_success_at, data_through_date, consecutive_failures, last_error_message",
      )
      .eq("organization_id", organizationId),
    db
      .from("sync_runs")
      .select("id, trigger, started_at, finished_at, status, stats")
      .eq("organization_id", organizationId)
      .order("started_at", { ascending: false })
      .limit(10),
    db
      .from("memberships")
      .select("user_id, role, client_id, profiles(full_name, email, last_sign_in_at)")
      .eq("organization_id", organizationId),
    db
      .from("audit_logs")
      .select(
        "id, created_at, action, target_type, target_id, metadata, profiles(full_name, email)",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const orgRow = must(org) as { name: string; default_timezone: string } | null;
  if (!orgRow) return null;

  const clientRows = must(clients) as { id: string; name: string }[];
  const clientName = new Map(clientRows.map((c) => [c.id, c.name]));
  const accountRows = must(accounts) as {
    id: string;
    external_id: string;
    name: string;
    client_id: string | null;
    currency: string;
    timezone_name: string;
    sync_enabled: boolean;
  }[];
  const stateRows = must(states) as (SyncStateRow & { ad_account_id: string })[];
  const stateOf = new Map(stateRows.map((s) => [s.ad_account_id, s]));
  const emptyState: SyncStateRow = {
    last_success_at: null,
    data_through_date: null,
    consecutive_failures: 0,
    last_error_message: null,
  };

  const adAccounts: AdAccountView[] = accountRows.map((a) => {
    const sync = combineSyncStates([stateOf.get(a.id) ?? emptyState], now);
    return {
      id: a.id,
      externalId: a.external_id,
      name: a.name,
      clientId: a.client_id,
      clientName: a.client_id ? (clientName.get(a.client_id) ?? null) : null,
      currency: a.currency,
      timezone: a.timezone_name,
      syncEnabled: a.sync_enabled,
      health: sync.health,
      lastSuccessAt: sync.lastSuccessAt,
    };
  });

  const memberRows = must(members) as {
    user_id: string;
    role: MembershipRole;
    client_id: string | null;
    profiles: Profile | Profile[] | null;
  }[];
  const memberViews: MemberView[] = memberRows.map((m) => {
    const profile = one(m.profiles);
    return {
      id: m.user_id,
      name: profile?.full_name ?? profile?.email ?? "Sem nome",
      email: profile?.email ?? "",
      role: m.role,
      clientName: m.client_id ? (clientName.get(m.client_id) ?? null) : null,
      lastSeenAt: profile?.last_sign_in_at ?? null,
    };
  });

  const runRows = must(runs) as {
    id: string;
    trigger: SyncRunView["trigger"];
    started_at: string;
    finished_at: string | null;
    status: SyncRunStatus;
    stats: RunStats | null;
  }[];
  const syncRuns: SyncRunView[] = runRows.map((r) => ({
    id: r.id,
    trigger: r.trigger,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    status: r.status,
    accountsTotal: num(r.stats?.accounts_total) ?? 0,
    accountsFailed: num(r.stats?.accounts_failed) ?? 0,
    rowsUpserted: num(r.stats?.rows_upserted) ?? 0,
    failureSummary: r.stats?.failure_summary ?? null,
  }));

  const auditRows = must(audit) as {
    id: number;
    created_at: string;
    action: string;
    target_type: string;
    target_id: string | null;
    metadata: { label?: string } | null;
    profiles: Pick<Profile, "full_name" | "email"> | Pick<Profile, "full_name" | "email">[] | null;
  }[];
  const auditViews: AuditEventView[] = auditRows.map((e) => {
    const actor = one(e.profiles);
    return {
      id: String(e.id),
      at: e.created_at,
      actor: actor?.full_name ?? actor?.email ?? "Sistema",
      action: e.action,
      target: e.metadata?.label ?? e.target_id ?? e.target_type,
    };
  });

  const connectionRows = must(connections) as {
    id: string;
    label: string;
    status: ConnectionStatus;
    token_type: "system_user" | "user";
    scopes: string[];
    last_validated_at: string | null;
    expires_at: string | null;
  }[];

  return {
    origin: simulated ? "simulated" : "meta",
    organizationName: orgRow.name,
    organizationTimezone: orgRow.default_timezone,
    connections: connectionRows.map((c) => ({
      id: c.id,
      platform: "meta",
      label: c.label,
      status: c.status,
      tokenType: c.token_type,
      scopes: c.scopes,
      lastValidatedAt: c.last_validated_at,
      expiresAt: c.expires_at,
    })),
    clients: clientRows.map((c) => {
      const own = accountRows.filter((a) => a.client_id === c.id);
      const sync = combineSyncStates(
        own.map((a) => stateOf.get(a.id) ?? emptyState),
        now,
      );
      return {
        id: c.id,
        name: c.name,
        adAccountCount: own.length,
        memberCount: memberRows.filter((m) => m.client_id === c.id).length,
        health: sync.health,
        lastSuccessAt: sync.lastSuccessAt,
      };
    }),
    adAccounts,
    syncRuns,
    members: memberViews,
    audit: auditViews,
  };
}
