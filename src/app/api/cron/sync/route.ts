import { isCronAuthorized } from "@/lib/sync/cron-auth";
import { securityEvent } from "@/server/security/log";
import { runScheduledSync } from "@/server/sync/scheduler";

// Vercel Hobby allows up to 300 s; the budget below leaves room for the last account.
export const maxDuration = 300;
const BUDGET_MS = 200_000;

/** Daily sync, called by Vercel Cron (vercel.json) with "Authorization: Bearer <CRON_SECRET>". */
export async function GET(request: Request) {
  // Read the request first: it marks the handler dynamic (never prerendered).
  const authorization = request.headers.get("authorization");
  if (!isCronAuthorized(authorization, process.env.CRON_SECRET)) {
    securityEvent("cron.unauthorized", { withHeader: authorization !== null });
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runScheduledSync({ deadline: Date.now() + BUDGET_MS });
    console.info("[cron] sync", JSON.stringify(summary));
    return Response.json(summary);
  } catch (error) {
    console.error("[cron] sync failed", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "sync failed" }, { status: 500 });
  }
}
