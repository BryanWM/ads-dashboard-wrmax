/**
 * Deterministic SIMULATED data for development and demos.
 * Anything rendered from this module must show <SimulatedDataBadge />.
 */
import { addDays } from "@/lib/dates/periods";
import type { DailyComponents } from "@/lib/metrics/derive";

export const SIMULATED_CURRENCY = "BRL";

export interface SimulatedDay extends DailyComponents {
  date: string;
  isSimulated: true;
}

/** mulberry32: tiny seeded PRNG so demo numbers are stable across renders. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SeriesOptions {
  from: string;
  days: number;
  seed?: number;
  /** Average daily spend in the account currency. */
  baseSpend?: number;
  /** Result type the campaign optimises for; null = no result reported. */
  resultIndicator?: string | null;
}

export function simulateDailySeries({
  from,
  days,
  seed = 7,
  baseSpend = 180,
  resultIndicator = "actions:lead",
}: SeriesOptions): SimulatedDay[] {
  const rand = prng(seed);
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const weekendDip = weekday === 0 || weekday === 6 ? 0.82 : 1;
    const trend = 1 + i * 0.006;
    const spend = round2(baseSpend * weekendDip * trend * (0.85 + rand() * 0.3));
    const cpm = 18 + rand() * 9;
    const impressions = Math.round((spend / cpm) * 1000);
    const ctr = 0.009 + rand() * 0.008;
    const linkClicks = Math.round(impressions * ctr);
    const conversion = 0.035 + rand() * 0.03;
    return {
      date,
      spend,
      impressions,
      linkClicks,
      results: resultIndicator === null ? null : Math.round(linkClicks * conversion),
      resultIndicator,
      isSimulated: true as const,
    };
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
