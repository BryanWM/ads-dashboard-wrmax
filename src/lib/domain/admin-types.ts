import type { ClientObjective, DataOrigin, SyncHealth } from "./types";

/**
 * Two roles only (ADR-009): the agency admin manages everything; a client user sees
 * exactly one client — their own.
 */
export type MembershipRole = "admin" | "client";

export const ROLE_LABELS: Record<MembershipRole, string> = {
  admin: "Agência",
  client: "Cliente",
};

export type ConnectionStatus = "active" | "needs_reauth" | "revoked" | "error";

export interface PlatformConnectionView {
  id: string;
  platform: "meta";
  label: string;
  status: ConnectionStatus;
  tokenType: "system_user" | "user";
  scopes: string[];
  lastValidatedAt: string | null;
  /** null = token does not expire (system user). */
  expiresAt: string | null;
}

export interface AdAccountView {
  id: string;
  externalId: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
  currency: string;
  timezone: string;
  syncEnabled: boolean;
  health: SyncHealth;
  lastSuccessAt: string | null;
}

export interface ClientAdminView {
  id: string;
  name: string;
  objective: ClientObjective | null;
  costPerResultGoal: number | null;
  adAccountCount: number;
  memberCount: number;
  health: SyncHealth;
  lastSuccessAt: string | null;
}

export type SyncRunStatus = "running" | "succeeded" | "partial" | "failed";

export interface SyncRunView {
  id: string;
  trigger: "cron" | "manual" | "retry";
  startedAt: string;
  finishedAt: string | null;
  status: SyncRunStatus;
  accountsTotal: number;
  accountsFailed: number;
  rowsUpserted: number;
  /** Sanitised summary of failures, never raw API payloads. */
  failureSummary: string | null;
}

export interface MemberView {
  /** auth user id */
  id: string;
  name: string;
  email: string;
  role: MembershipRole;
  /** The client a client user belongs to; null for the agency admin (every client). */
  clientName: string | null;
  lastSeenAt: string | null;
}

export interface AuditEventView {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
}

export interface AdminOverview {
  origin: DataOrigin;
  organizationName: string;
  /** IANA timezone used to display instants on admin screens. */
  organizationTimezone: string;
  connections: PlatformConnectionView[];
  clients: ClientAdminView[];
  adAccounts: AdAccountView[];
  syncRuns: SyncRunView[];
  members: MemberView[];
  audit: AuditEventView[];
}
