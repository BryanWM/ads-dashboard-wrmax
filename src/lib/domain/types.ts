/**
 * Serializable view models shared by Server and Client Components.
 * Produced by a MetricsDataSource (src/server/data); never contain secrets.
 */
import type { DateRange } from "@/lib/dates/periods";
import type { DailyComponents, DerivedMetrics, ResultTypeBreakdown } from "@/lib/metrics/derive";

/** Where the numbers come from. Anything but "meta" must show the simulated badge. */
export type DataOrigin = "simulated" | "meta";

/** What the client's ads are for; decides the "main result" shown first. */
export type ClientObjective = "purchases" | "messages" | "leads";

export interface ClientSummary {
  id: string;
  name: string;
  /** ISO 4217 — all of a client's accounts must share it (no mixed-currency sums). */
  currency: string;
  /** IANA timezone of the client's ad accounts. */
  timezone: string;
  adAccountCount: number;
  /** Declared by the agency. null → the result type with most spend is used. */
  objective: ClientObjective | null;
  /** Target cost per main result (account currency). null → no health badge. */
  costPerResultGoal: number | null;
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

/** Spend and results of one result type on one day. */
export interface TypedDay {
  spend: number | null;
  results: number | null;
  purchaseValue: number | null;
}

export interface DailyPoint {
  date: string;
  /** null when the platform returned no row for that day. */
  current: DailyComponents | null;
  /** Same day-offset in the previous period. */
  previous: DailyComponents | null;
  /** Current day per result indicator, so one objective can be charted alone. */
  currentByType: Record<string, TypedDay>;
  /** Same day-offset in the previous period, per result indicator. */
  previousByType: Record<string, TypedDay>;
}

/** One ad (creative). Only present when ad-level data is synced. */
export interface AdView {
  id: string;
  name: string;
  campaignName: string;
  /** Creative preview (Meta `thumbnail_url`); null when unavailable. */
  thumbnailUrl: string | null;
  resultIndicator: string | null;
  spend: number | null;
  results: number | null;
  costPerResult: number | null;
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
  /** Ads of the period. null = no ad-level data (not "no ads"). */
  ads: AdView[] | null;
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
