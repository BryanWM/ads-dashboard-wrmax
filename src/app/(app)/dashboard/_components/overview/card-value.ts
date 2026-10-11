import { formatMetricValue } from "@/lib/format";
import { METRICS } from "@/lib/metrics/definitions";
import type { CardMetric } from "@/lib/overview/model";

/** Large money values are abbreviated in cards ("R$ 31,1 mil") to fit 2 columns. */
const COMPACT_FROM = 10_000;

export function formatCardValue(metric: CardMetric, value: number | null, currency: string) {
  const format = METRICS[metric].format;
  const compact = value !== null && Math.abs(value) >= COMPACT_FROM;
  return formatMetricValue(value, format, { currency, compact });
}
