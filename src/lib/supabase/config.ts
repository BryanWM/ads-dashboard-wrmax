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

/**
 * Session cookie flags (revisão de segurança). The browser never talks to Supabase
 * directly, so the session cookie does not need to be readable by JavaScript:
 * HttpOnly keeps a future XSS from stealing it; HTTPS-only outside local development.
 * The cookie lifetime is fixed by @supabase/ssr (it overrides maxAge); how long a
 * session really lasts is set in Supabase (Auth → Sessions), see docs/seguranca.md.
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

export function isSupabaseConfigured(): boolean {
  return supabasePublicConfig() !== null;
}
