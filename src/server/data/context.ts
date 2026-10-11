import "server-only";

import { connection } from "next/server";

import type { Viewer } from "@/lib/domain/access";
import { parsePeriodSelection, type PeriodSelection } from "@/lib/dates/period-params";
import { todayInTimeZone } from "@/lib/dates/periods";
import type { ClientSummary } from "@/lib/domain/types";
import { getViewer } from "@/server/auth/session";

import { getDataSource, type MetricsDataSource } from "./source";

type Params = Record<string, string | string[] | undefined>;

export interface ClientContext {
  viewer: Viewer;
  source: MetricsDataSource;
  clients: ClientSummary[];
  /** null only when the viewer can see no client at all. */
  client: ClientSummary | null;
  /** Today in the client's timezone (latest selectable day). */
  today: string;
  selection: PeriodSelection;
}

/**
 * Resolves `?client=` against the clients the current viewer may see. An unknown
 * or foreign id silently falls back to the first visible client — it never
 * reaches a query. (Phase 5: the source is also RLS-scoped.)
 */
export async function resolveClientContext(params: Params): Promise<ClientContext> {
  await connection(); // request-time: uses the current date
  const viewer = await getViewer();
  const source = getDataSource(viewer);
  const clients = await source.listClients();
  const requested = Array.isArray(params.client) ? params.client[0] : params.client;
  const client = clients.find((c) => c.id === requested) ?? clients[0] ?? null;
  const today = todayInTimeZone(client?.timezone ?? "America/Sao_Paulo");
  return {
    viewer,
    source,
    clients,
    client,
    today,
    selection: parsePeriodSelection(params, today),
  };
}
