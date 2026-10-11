import "server-only";

import { canAccessAdmin, canViewClient, visibleClients, type Viewer } from "@/lib/domain/access";
import { todayInTimeZone } from "@/lib/dates/periods";

import type { MetricsDataSource } from "../source";

import { buildAdminOverview } from "./admin";
import {
  buildCampaigns,
  buildDashboard,
  clientSummary,
  findClient,
  type SimContext,
} from "./build";
import { SIM_CLIENTS, SIM_TIMEZONE } from "./catalog";

function context(): SimContext {
  const now = new Date();
  return { now, today: todayInTimeZone(SIM_TIMEZONE, now) };
}

/** Simulated source scoped to one viewer — mirrors what RLS will enforce. */
export function createSimulatedSource(viewer: Viewer): MetricsDataSource {
  const allowedClient = (clientId: string) =>
    canViewClient(viewer, clientId) ? findClient(clientId) : null;

  return {
    origin: "simulated",

    async listClients() {
      return visibleClients(viewer, SIM_CLIENTS).map(clientSummary);
    },

    async getDashboard(clientId, selection) {
      const client = allowedClient(clientId);
      return client ? buildDashboard(client, selection, context()) : null;
    },

    async getCampaigns(clientId, selection) {
      const client = allowedClient(clientId);
      return client ? buildCampaigns(client, selection, context()) : null;
    },

    async getAdminOverview() {
      return canAccessAdmin(viewer) ? buildAdminOverview(context()) : null;
    },
  };
}
