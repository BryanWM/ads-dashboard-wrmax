import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_OPTIONS, supabasePublicConfig } from "@/lib/supabase/config";

const PROTECTED = ["/dashboard", "/campaigns", "/admin"];

/**
 * Refreshes the Supabase session cookie and does OPTIMISTIC redirects only:
 * every page and action verifies the session again (DAL + RLS). In demo mode
 * (no Supabase settings) it does nothing.
 */
export async function proxy(request: NextRequest) {
  const config = supabasePublicConfig();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookieOptions: SESSION_COOKIE_OPTIONS,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // Validates the JWT (signature + expiry) and refreshes it when needed.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };

  if (!signedIn && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    return redirectTo("/login");
  }
  if (signedIn && path === "/login") return redirectTo("/dashboard");
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, the sign-out route (it clears cookies itself) and
    // the cron route (no session; it checks CRON_SECRET).
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|brand/|demo/|auth/sign-out|api/cron/).*)",
  ],
};
