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
  ownsAccount,
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

    async getDashboard(clientId, selection, accountId = null) {
      const client = allowedClient(clientId);
      if (!client || !ownsAccount(client, accountId)) return null;
      return buildDashboard(client, selection, context(), accountId);
    },

    async getCampaigns(clientId, selection, accountId = null) {
      const client = allowedClient(clientId);
      if (!client || !ownsAccount(client, accountId)) return null;
      return buildCampaigns(client, selection, context(), accountId);
    },

    async getAdminOverview() {
      return canAccessAdmin(viewer) ? buildAdminOverview(context()) : null;
    },

    async hasSimulatedData() {
      return true;
    },
  };
}
