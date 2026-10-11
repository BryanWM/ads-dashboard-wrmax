/**
 * Plain-language signals for non-specialists. Thresholds are ASSUMPTIONS to be
 * validated by the agency (see docs/design-system.md → Visão geral).
 */

export type Health = "saudavel" | "atencao" | "critico";

/** Up to 20% above the goal is "atenção"; beyond that, "crítico". */
export const HEALTH_TOLERANCE = 0.2;

/** Cost per result vs. the client's goal. null when either side is missing. */
export function evaluateHealth(costPerResult: number | null, goal: number | null): Health | null {
  if (costPerResult === null || goal === null || goal <= 0) return null;
  if (costPerResult <= goal) return "saudavel";
  if (costPerResult <= goal * (1 + HEALTH_TOLERANCE)) return "atencao";
  return "critico";
}

/**
 * Average views per person above which the same audience is likely tired of the
 * ad (it loses effect and tends to get more expensive). Starting point: 3.5.
 */
export const HIGH_FREQUENCY_THRESHOLD = 3.5;

export function isHighFrequency(frequency: number | null): boolean {
  return frequency !== null && frequency > HIGH_FREQUENCY_THRESHOLD;
}
