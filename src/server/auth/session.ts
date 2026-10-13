import "server-only";

import { cookies } from "next/headers";

import type { Viewer } from "@/lib/domain/access";

/**
 * Current viewer. Phase 4: a DEMO session chosen by a non-sensitive cookie, so the
 * agency and client experiences can be reviewed with simulated data.
 * Phase 5 replaces this with the Supabase session (verified JWT + membership row);
 * callers do not change.
 */

export const DEMO_VIEWER_COOKIE = "wrmax_demo_viewer";
export const DEMO_VIEWERS = ["agency", "client"] as const;
export type DemoViewerKind = (typeof DEMO_VIEWERS)[number];

const VIEWERS: Record<DemoViewerKind, Viewer> = {
  agency: {
    id: "usr-1",
    name: "Ana Administradora",
    email: "ana@example.com",
    role: "admin",
    clientId: null,
  },
  client: {
    id: "usr-3",
    name: "Carla (Auto Center)",
    email: "carla@example.com",
    role: "client",
    clientId: "demo-auto-center",
  },
};

function isKind(value: string | undefined): value is DemoViewerKind {
  return (DEMO_VIEWERS as readonly string[]).includes(value ?? "");
}

export async function getViewer(): Promise<Viewer> {
  const value = (await cookies()).get(DEMO_VIEWER_COOKIE)?.value;
  return VIEWERS[isKind(value) ? value : "agency"];
}
