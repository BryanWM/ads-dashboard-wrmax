import type { PeriodPreset } from "@/lib/dates/periods";
import { formatDateRange, formatMetricValue, LOCALE } from "@/lib/format";
import { percentChange } from "@/lib/metrics/derive";
import { resultNames } from "@/lib/metrics/result-types";

import type { PrimaryResult } from "./primary-result";

/** A sentence split into parts; `strong` parts are the numbers to emphasise. */
export type SummaryPart = { text: string; strong?: boolean };

interface SummaryInput {
  preset: PeriodPreset | null;
  range: { from: string; to: string };
  currency: string;
  /** Total spend of every campaign in the period. */
  totalSpend: number | null;
  current: PrimaryResult;
  /** Same indicator in the comparable previous period; null = no comparison. */
  previous: PrimaryResult | null;
}

const PERIOD_INTRO: Record<PeriodPreset, string> = {
  last_7d: "Nos últimos 7 dias",
  last_14d: "Nos últimos 14 dias",
  last_30d: "Nos últimos 30 dias",
  this_month: "Neste mês",
  last_month: "No mês passado",
};

const PREVIOUS_LABEL: Partial<Record<PeriodPreset, string>> = {
  last_7d: "nos 7 dias anteriores",
  last_14d: "nos 14 dias anteriores",
  last_30d: "nos 30 dias anteriores",
};

/** Below this relative change the cost is described as "estável". */
export const STABLE_CHANGE_PCT = 1;

function money(value: number, currency: string, cents: boolean) {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(value);
}

/**
 * "Nos últimos 7 dias, R$ 1.240 investidos geraram 86 compras, a R$ 14,42 cada.
 *  Isso é 8% mais barato que nos 7 dias anteriores."
 * Built from a template with the existing numbers only — no AI, no invented data.
 */
export function buildSummary(input: SummaryInput): SummaryPart[] {
  const { current, previous, currency } = input;
  const intro = input.preset ? PERIOD_INTRO[input.preset] : `De ${formatDateRange(input.range)}`;
  const names = resultNames(current.indicator);

  if (input.totalSpend === null || input.totalSpend === 0) {
    return [{ text: `${intro}, não houve investimento em anúncios.` }];
  }

  // Spend that produced the main result (other objectives are not credited to it).
  const spend = current.hasOtherTypes ? current.spend : input.totalSpend;

  if (
    current.indicator === null ||
    current.results === null ||
    current.results === 0 ||
    spend === null
  ) {
    return [
      { text: `${intro}, foram investidos ` },
      { text: money(input.totalSpend, currency, false), strong: true },
      {
        text:
          current.indicator === null
            ? ". As campanhas do período não têm um resultado definido para medir."
            : `, mas ainda não há ${names.pluralNoun} ${names.feminine ? "registradas" : "registrados"} no período.`,
      },
    ];
  }

  const count = formatMetricValue(current.results, "integer");
  const noun = current.results === 1 ? names.singular : names.pluralNoun;
  const parts: SummaryPart[] = [
    { text: `${intro}, ` },
    { text: money(spend, currency, false), strong: true },
    {
      text: current.hasOtherTypes
        ? ` investidos em campanhas de ${names.pluralNoun} geraram `
        : " investidos geraram ",
    },
    { text: `${count} ${noun}`, strong: true },
  ];
  if (current.costPerResult !== null) {
    parts.push(
      { text: ", a " },
      { text: money(current.costPerResult, currency, true), strong: true },
      { text: " cada." },
    );
  } else {
    parts.push({ text: "." });
  }

  const change = percentChange(current.costPerResult, previous?.costPerResult ?? null);
  if (change !== null) {
    const versus = (input.preset && PREVIOUS_LABEL[input.preset]) ?? "no período anterior";
    if (Math.abs(change) < STABLE_CHANGE_PCT) {
      parts.push({ text: ` O custo ficou estável em relação ao que foi ${versus}.` });
    } else {
      const pct = `${Math.round(Math.abs(change))}%`;
      parts.push(
        { text: " Isso é " },
        { text: `${pct} ${change < 0 ? "mais barato" : "mais caro"}`, strong: true },
        { text: ` que ${versus}.` },
      );
    }
  }
  return parts;
}

export function summaryText(parts: readonly SummaryPart[]): string {
  return parts.map((p) => p.text).join("");
}
