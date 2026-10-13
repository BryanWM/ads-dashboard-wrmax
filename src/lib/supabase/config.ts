/**
 * Public Supabase settings (URL + publishable key are safe for the browser).
 * No `server-only` here: the proxy imports this too. Without them the app runs
 * in demo mode (simulated data, demo viewer switch) — see ADR-010.
 */
export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export function supabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && publishableKey ? { url, publishableKey } : null;
}

export function isSupabaseConfigured(): boolean {
  return supabasePublicConfig() !== null;
}
