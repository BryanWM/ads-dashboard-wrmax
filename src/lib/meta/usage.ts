/**
 * Meta rate-limit headers → how busy we are and how long to wait. Read on EVERY
 * response (docs/meta-integration.md · Limites de requisição).
 */

export interface MetaUsage {
  /** Highest utilisation reported by any header, 0–100 (null = no header). */
  maxPercent: number | null;
  /** Minutes Meta asks us to wait before calling again (0 = no wait). */
  waitMinutes: number;
  /** "development" | "standard" … as reported by the insights throttle header. */
  accessTier: string | null;
}

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function numbers(obj: unknown, keys: string[]): number[] {
  if (!obj || typeof obj !== "object") return [];
  return keys
    .map((k) => (obj as Record<string, unknown>)[k])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

export function parseMetaUsage(headers: { get(name: string): string | null }): MetaUsage {
  const percents: number[] = [];
  let wait = 0;
  let accessTier: string | null = null;

  const insights = parseJson(headers.get("x-fb-ads-insights-throttle"));
  percents.push(...numbers(insights, ["app_id_util_pct", "acc_id_util_pct"]));
  const tier = (insights as Record<string, unknown> | null)?.ads_api_access_tier;
  if (typeof tier === "string") accessTier = tier;

  const account = parseJson(headers.get("x-ad-account-usage"));
  percents.push(...numbers(account, ["acc_id_util_pct"]));
  const reset = (account as Record<string, unknown> | null)?.reset_time_duration;
  if (typeof reset === "number" && reset > 0) wait = Math.max(wait, Math.ceil(reset / 60));

  for (const header of ["x-business-use-case-usage", "x-app-usage"]) {
    const parsed = parseJson(headers.get(header));
    const entries =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? header === "x-app-usage"
          ? [parsed]
          : Object.values(parsed as Record<string, unknown>).flat()
        : [];
    for (const entry of entries) {
      percents.push(...numbers(entry, ["call_count", "total_cputime", "total_time"]));
      const minutes = (entry as Record<string, unknown> | null)?.estimated_time_to_regain_access;
      if (typeof minutes === "number" && minutes > 0) wait = Math.max(wait, minutes);
    }
  }

  return {
    maxPercent: percents.length > 0 ? Math.max(...percents) : null,
    waitMinutes: wait,
    accessTier,
  };
}

/** Our own brake: slow down before Meta throttles us. */
export const SLOW_DOWN_ABOVE_PERCENT = 75;
