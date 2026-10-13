import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createUserSupabase } from "@/server/supabase/server";

/**
 * POST only (a link or image cannot sign someone out) and same-origin only.
 * Answers with a 303 so the browser does a full navigation to /login: <Activity>
 * must not keep the previous person's screens alive.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return new NextResponse(null, { status: 403 });
  }
  if (isSupabaseConfigured()) {
    const supabase = await createUserSupabase();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
