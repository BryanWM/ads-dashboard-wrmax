import "server-only";

import type { Viewer } from "@/lib/domain/access";
import type { PeriodSelection } from "@/lib/dates/period-params";
import type { AdminOverview } from "@/lib/domain/admin-types";
import type { CampaignsData, ClientSummary, DashboardData, DataOrigin } from "@/lib/domain/types";
import { isSupabaseConfigured } from "@/lib/supabase/config";

import { createSimulatedSource } from "./simulated/source";
import { createSupabaseSource } from "./supabase/source";

/**
 * Read model used by pages, always bound to the current viewer. Implementations
 * must return only what that viewer may see: unknown or foreign ids yield null,
 * never someone else's data. Supabase mode queries with the user's JWT (RLS);
 * demo mode serves the in-memory simulation.
 */
export interface MetricsDataSource {
  readonly origin: DataOrigin;
  listClients(): Promise<ClientSummary[]>;
  getDashboard(clientId: string, selection: PeriodSelection): Promise<DashboardData | null>;
  getCampaigns(clientId: string, selection: PeriodSelection): Promise<CampaignsData | null>;
  /** null when the viewer is not allowed in the admin area. */
  getAdminOverview(): Promise<AdminOverview | null>;
  /** Any simulated row visible to this viewer → the "Dados simulados" badge shows. */
  hasSimulatedData(): Promise<boolean>;
}

export function getDataSource(viewer: Viewer): MetricsDataSource {
  return isSupabaseConfigured() ? createSupabaseSource(viewer) : createSimulatedSource(viewer);
}
