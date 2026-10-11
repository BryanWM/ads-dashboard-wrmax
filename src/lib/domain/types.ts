/**
 * Serializable view models shared by Server and Client Components.
 * Produced by a MetricsDataSource (src/server/data); never contain secrets.
 */
import type { DateRange } from "@/lib/dates/periods";
import type { DailyComponents, DerivedMetrics, ResultTypeBreakdown } from "@/lib/metrics/derive";

/** Where the numbers come from. Anything but "meta" must show the simulated badge. */
export type DataOrigin = "simulated" | "meta";

export interface ClientSummary {
  id: string;
  name: string;
  /** ISO 4217 — all of a client's accounts must share it (no mixed-currency sums). */
  currency: string;
  /** IANA timezone of the client's ad accounts. */
  timezone: string;
  adAccountCount: number;
}

export type SyncHealth = "ok" | "stale" | "failing" | "never";

export interface SyncStatus {
  health: SyncHealth;
  /** ISO instant of the last successful sync, or null if it never succeeded. */
  lastSuccessAt: string | null;
  /** Last complete day included in the data (account timezone). */
  dataThrough: string | null;
  /** Sanitised, user-facing message about the latest failure. */
  lastError: string | null;
}

export interface DailyPoint {
  date: string;
  /** null when the platform returned no row for that day. */
  current: DailyComponents | null;
  /** Same day-offset in the previous period. */
  previous: DailyComponents | null;
}

export interface MetricsSnapshot {
  metrics: DerivedMetrics;
  resultTypes: ResultTypeBreakdown[];
}

export interface DashboardData {
  origin: DataOrigin;
  client: ClientSummary;
  range: DateRange;
  previousRange: DateRange;
  /**
   * Previous-period slice actually compared: same number of days as the covered
   * part of `range` (see lib/dates/coverage). Equals previousRange when complete.
   */
  comparisonRange: DateRange;
  /** True when `range` extends past the last synced day. */
  partial: boolean;
  current: MetricsSnapshot;
  previous: MetricsSnapshot;
  daily: DailyPoint[];
  /** False for custom ranges: deduplicated reach exists only for preset periods. */
  reachAvailable: boolean;
  sync: SyncStatus;
}

export type CampaignStatus = "active" | "paused" | "archived";

export interface CampaignRow {
  id: string;
  name: string;
  status: CampaignStatus;
  objectiveLabel: string;
  resultIndicator: string | null;
  components: DailyComponents;
  metrics: DerivedMetrics;
  previousMetrics: DerivedMetrics;
}

export interface CampaignsData {
  origin: DataOrigin;
  client: ClientSummary;
  range: DateRange;
  comparisonRange: DateRange;
  partial: boolean;
  campaigns: CampaignRow[];
  sync: SyncStatus;
}
