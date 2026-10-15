import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SESSION_COOKIE_OPTIONS, supabasePublicConfig } from "@/lib/supabase/config";

/**
 * Supabase client acting AS the signed-in user (their JWT → RLS applies).
 * Create one per request; never share across requests.
 */
export async function createUserSupabase() {
  const config = supabasePublicConfig();
  if (!config) throw new Error("Supabase is not configured");
  const store = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components cannot set cookies; the proxy refreshes the session.
        }
      },
    },
  });
}
