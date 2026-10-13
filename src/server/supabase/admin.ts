import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabasePublicConfig } from "@/lib/supabase/config";

/**
 * Service-role client: BYPASSES RLS. Allowed only in src/server/sync and in audited
 * admin actions, always after the DAL checked the viewer's role (ADR-002).
 */
export function createServiceSupabase() {
  const config = supabasePublicConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!config || !secretKey) throw new Error("Supabase service credentials are not configured");
  return createClient(config.url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
