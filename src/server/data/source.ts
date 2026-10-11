import "server-only";

import type { Viewer } from "@/lib/domain/access";
import type { PeriodSelection } from "@/lib/dates/period-params";
import type { AdminOverview } from "@/lib/domain/admin-types";
import type { CampaignsData, ClientSummary, DashboardData, DataOrigin } from "@/lib/domain/types";

import { createSimulatedSource } from "./simulated/source";

/**
 * Read model used by pages, always bound to the current viewer. Implementations
 * must return only what that viewer may see: unknown or foreign ids yield null,
 * never someone else's data. Phase 4 ships a simulated implementation; Phase 5
 * replaces it with Supabase queries made with the user's JWT (RLS enforced).
 */
export interface MetricsDataSource {
  readonly origin: DataOrigin;
  listClients(): Promise<ClientSummary[]>;
  getDashboard(clientId: string, selection: PeriodSelection): Promise<DashboardData | null>;
  getCampaigns(clientId: string, selection: PeriodSelection): Promise<CampaignsData | null>;
  /** null when the viewer is not allowed in the admin area. */
  getAdminOverview(): Promise<AdminOverview | null>;
}

export const DATA_ORIGIN: DataOrigin = "simulated";

export function getDataSource(viewer: Viewer): MetricsDataSource {
  return createSimulatedSource(viewer);
}
