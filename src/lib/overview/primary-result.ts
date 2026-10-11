import type { ClientSummary, MetricsSnapshot } from "@/lib/domain/types";
import { safeRatio, type ResultTypeBreakdown } from "@/lib/metrics/derive";
import { OBJECTIVE_INDICATOR } from "@/lib/metrics/result-types";

/**
 * The "main result" of the overview: ONE result type, never a sum of different
 * objectives. Spend, results and cost are scoped to the campaigns of that type.
 */
export interface PrimaryResult {
  indicator: string | null;
  /** Where the choice came from (shown to the agency in the details). */
  source: "objective" | "largest-spend" | "none";
  spend: number | null;
  results: number | null;
  costPerResult: number | null;
  roas: number | null;
  /** Funnel components of the same campaigns. */
  impressions: number | null;
  linkClicks: number | null;
  addToCart: number | null;
  initiateCheckout: number | null;
  /** Other result types exist in the period (they are NOT included here). */
  hasOtherTypes: boolean;
}

const EMPTY: Omit<PrimaryResult, "indicator" | "source" | "hasOtherTypes"> = {
  spend: null,
  results: null,
  costPerResult: null,
  roas: null,
  impressions: null,
  linkClicks: null,
  addToCart: null,
  initiateCheckout: null,
};

function fromBreakdown(t: ResultTypeBreakdown) {
  return {
    spend: t.spend,
    results: t.results,
    costPerResult: t.costPerResult,
    roas: safeRatio(t.purchaseValue, t.spend),
    impressions: t.impressions,
    linkClicks: t.linkClicks,
    addToCart: t.addToCart,
    initiateCheckout: t.initiateCheckout,
  };
}

/** Which indicator is "main": the declared objective, else the type with most spend. */
export function choosePrimaryIndicator(
  client: Pick<ClientSummary, "objective">,
  snapshot: MetricsSnapshot,
): { indicator: string | null; source: PrimaryResult["source"] } {
  if (client.objective) {
    return { indicator: OBJECTIVE_INDICATOR[client.objective], source: "objective" };
  }
  const largest = snapshot.resultTypes[0]; // already sorted by spend
  return largest
    ? { indicator: largest.resultIndicator, source: "largest-spend" }
    : { indicator: null, source: "none" };
}

/** Main-result numbers of one snapshot for a given indicator. */
export function primaryResultFor(
  snapshot: MetricsSnapshot,
  indicator: string | null,
  source: PrimaryResult["source"],
): PrimaryResult {
  const match = snapshot.resultTypes.find((t) => t.resultIndicator === indicator);
  const hasOtherTypes = snapshot.resultTypes.some((t) => t.resultIndicator !== indicator);
  return { indicator, source, hasOtherTypes, ...(match ? fromBreakdown(match) : EMPTY) };
}
