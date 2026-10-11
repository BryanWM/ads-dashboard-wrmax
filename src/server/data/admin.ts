import "server-only";

import { connection } from "next/server";

import { getViewer } from "@/server/auth/session";

import { getDataSource } from "./source";

/**
 * Organisation-wide admin read model, or null when the current viewer is not an
 * owner/admin. Pages must render an access-denied state on null.
 */
export async function loadAdminOverview() {
  await connection(); // request-time: relative timestamps use the current date
  return getDataSource(await getViewer()).getAdminOverview();
}
