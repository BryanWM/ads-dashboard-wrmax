import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { Viewer } from "@/lib/domain/access";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createUserSupabase } from "@/server/supabase/server";

/**
 * Current viewer.
 * - Supabase mode: verified JWT (getClaims) + the person's membership row (RLS).
 *   No session → redirect to /login.
 * - Demo mode (no Supabase settings): a non-sensitive cookie picks the agency or
 *   client demo person, so both experiences can be reviewed with simulated data.
 */

export const DEMO_VIEWER_COOKIE = "wrmax_demo_viewer";
export const DEMO_VIEWERS = ["agency", "client"] as const;
export type DemoViewerKind = (typeof DEMO_VIEWERS)[number];

const DEMO_ORG = "demo-org";

const DEMO: Record<DemoViewerKind, Viewer> = {
  agency: {
    id: "usr-1",
    name: "Ana Administradora",
    email: "ana@example.com",
    role: "admin",
    organizationId: DEMO_ORG,
    clientId: null,
  },
  client: {
    id: "usr-3",
    name: "Carla (Auto Center)",
    email: "carla@example.com",
    role: "client",
    organizationId: DEMO_ORG,
    clientId: "demo-auto-center",
  },
};

function isKind(value: string | undefined): value is DemoViewerKind {
  return (DEMO_VIEWERS as readonly string[]).includes(value ?? "");
}

async function demoViewer(): Promise<Viewer> {
  const value = (await cookies()).get(DEMO_VIEWER_COOKIE)?.value;
  return DEMO[isKind(value) ? value : "agency"];
}

async function supabaseViewer(): Promise<Viewer> {
  const supabase = await createUserSupabase();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");

  const [{ data: membership }, { data: profile }] = await Promise.all([
    supabase
      .from("memberships")
      .select("organization_id, role, client_id")
      .eq("user_id", claims.sub)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", claims.sub).maybeSingle(),
  ]);

  const email = typeof claims.email === "string" ? claims.email : "";
  return {
    id: claims.sub,
    name: profile?.full_name ?? email,
    email,
    // Without a membership the person sees nothing (role client + no client).
    role: membership?.role === "admin" ? "admin" : "client",
    organizationId: membership?.organization_id ?? null,
    clientId: membership?.client_id ?? null,
  };
}

/** Memoised per request: layout, pages and actions share one lookup. */
export const getViewer = cache(async (): Promise<Viewer> =>
  isSupabaseConfigured() ? supabaseViewer() : demoViewer(),
);

export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}
