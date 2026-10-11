import { isPurchaseIndicator, resultNames } from "@/lib/metrics/result-types";

import type { PrimaryResult } from "./primary-result";

export interface FunnelStep {
  key: string;
  label: string;
  value: number | null;
  /** % of the previous step that reached this one; null for the first step. */
  passRate: number | null;
}

/**
 * Funnel of the main result's campaigns only (never mixing objectives).
 * The first step is "pessoas alcançadas" when deduplicated reach applies to the
 * same campaigns; otherwise the number of times the ads were shown.
 */
export function buildFunnel(primary: PrimaryResult, reach: number | null): FunnelStep[] {
  const useReach = reach !== null && !primary.hasOtherTypes;
  const steps: Omit<FunnelStep, "passRate">[] = [
    useReach
      ? { key: "seen", label: "Viram", value: reach }
      : { key: "seen", label: "Viram (exibições)", value: primary.impressions },
    { key: "clicked", label: "Clicaram", value: primary.linkClicks },
  ];

  if (isPurchaseIndicator(primary.indicator) && primary.addToCart !== null) {
    steps.push(
      { key: "cart", label: "Carrinho", value: primary.addToCart },
      { key: "checkout", label: "Pagamento", value: primary.initiateCheckout },
      { key: "result", label: "Compra", value: primary.results },
    );
  } else {
    steps.push({
      key: "result",
      label: resultNames(primary.indicator).plural,
      value: primary.results,
    });
  }

  return steps.map((step, i) => {
    const prev = i > 0 ? steps[i - 1]!.value : null;
    const passRate =
      i === 0 || prev === null || prev === 0 || step.value === null
        ? null
        : (step.value / prev) * 100;
    return { ...step, passRate };
  });
}
