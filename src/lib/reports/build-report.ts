import type { DateRange } from "@/lib/dates/periods";
import type { AdView, CampaignRow, ClientSummary, MetricsSnapshot } from "@/lib/domain/types";
import { formatMetricValue } from "@/lib/format";
import { percentChange, type ResultTypeBreakdown } from "@/lib/metrics/derive";
import { isPurchaseIndicator, resultNames } from "@/lib/metrics/result-types";
import { buildFunnel } from "@/lib/overview/funnel";
import { choosePrimaryIndicator, primaryResultFor } from "@/lib/overview/primary-result";

import { comparisonLabel, dayMonth, periodTitle } from "./report-period";

/**
 * WhatsApp-ready report text (Reports tab). Built from the same read model as the
 * dashboard — no AI, no invented numbers. Rules kept from the overview:
 * - the main result is ONE result type (client objective, else most spend);
 * - cost and ROAS use only the spend of that type's campaigns (never mixed);
 * - other objectives are listed apart, with their own cost.
 * WhatsApp markup: *bold*, _italic_.
 */

export const REPORT_TEMPLATES = ["rapido", "campanhas", "completo"] as const;
export type ReportTemplate = (typeof REPORT_TEMPLATES)[number];

export const TEMPLATE_LABELS: Record<ReportTemplate, string> = {
  rapido: "Rápido",
  campanhas: "Campanhas",
  completo: "Completo",
};

export function parseTemplate(value: unknown): ReportTemplate {
  return (REPORT_TEMPLATES as readonly unknown[]).includes(value)
    ? (value as ReportTemplate)
    : "rapido";
}

export interface ReportInput {
  template: ReportTemplate;
  client: Pick<ClientSummary, "name" | "currency" | "objective">;
  /** "simulated" adds a warning line: a copied text must never pass as real data. */
  origin: "simulated" | "meta";
  range: DateRange;
  /** null = comparison switched off. */
  comparison: DateRange | null;
  current: MetricsSnapshot;
  previous: MetricsSnapshot;
  campaigns: readonly CampaignRow[];
  ads: readonly AdView[] | null;
  reachAvailable: boolean;
  /** Set when the period goes past the last synced day. */
  partialThrough: string | null;
}

/** Campaign/ad names may contain WhatsApp markers; they would break the formatting. */
export function cleanName(name: string): string {
  return name
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function money(value: number | null, currency: string): string {
  return formatMetricValue(value, "currency", { currency });
}

function count(value: number | null): string {
  return formatMetricValue(value, "integer");
}

/** "+16%" · "−5%" · null when there is nothing to compare with. */
function change(current: number | null, previous: number | null): number | null {
  const pct = percentChange(current, previous);
  return pct === null || !Number.isFinite(pct) ? null : pct;
}

function signed(pct: number): string {
  const rounded = Math.round(pct);
  if (rounded === 0) return "estável";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}%`;
}

function typeOf(snapshot: MetricsSnapshot, indicator: string | null) {
  return snapshot.resultTypes.find((t) => t.resultIndicator === indicator) ?? null;
}

function otherTypes(snapshot: MetricsSnapshot, indicator: string | null): ResultTypeBreakdown[] {
  return snapshot.resultTypes.filter((t) => t.resultIndicator !== indicator);
}

function totalsLines(input: ReportInput, indicator: string | null): string[] {
  const { currency } = input.client;
  const names = resultNames(indicator);
  const main = typeOf(input.current, indicator);
  const primary = primaryResultFor(input.current, indicator, "objective");
  const purchase = isPurchaseIndicator(indicator);
  const totalSpend = input.current.metrics.spend;

  const lines = [`*Investimento:* ${money(totalSpend, currency)}`];
  if (indicator !== null) {
    lines.push(`*${names.plural}:* ${count(main?.results ?? 0)}`);
    if (purchase && main?.purchaseValue != null) {
      lines.push(`*Faturamento:* ${money(main.purchaseValue, currency)}`);
    }
    if (primary.costPerResult !== null) {
      lines.push(`*Custo por ${names.singular}:* ${money(primary.costPerResult, currency)}`);
    }
    if (purchase && primary.roas !== null) {
      lines.push(`*Retorno (ROAS):* ${formatMetricValue(primary.roas, "multiplier")}`);
    }
    const mainSpend = main?.spend ?? null;
    if (mainSpend !== null && totalSpend !== null && mainSpend < totalSpend - 0.005) {
      lines.push(
        `_Custo${purchase ? " e retorno" : ""} só das campanhas de ${names.pluralNoun} (${money(mainSpend, currency)} investidos)._`,
      );
    }
  }
  const others = otherTypes(input.current, indicator).filter((t) => (t.results ?? 0) > 0);
  if (others.length > 0 && input.template === "rapido") {
    const parts = others.map((t) => {
      const n = resultNames(t.resultIndicator);
      return `${count(t.results)} ${t.results === 1 ? n.singular : n.pluralNoun}`;
    });
    lines.push(`*Outros resultados:* ${parts.join(" · ")}`);
  }
  return lines;
}

function comparisonLine(input: ReportInput, indicator: string | null): string | null {
  if (!input.comparison || indicator === null) return null;
  const names = resultNames(indicator);
  const now = typeOf(input.current, indicator);
  const before = typeOf(input.previous, indicator);
  const parts: string[] = [];

  const results = change(now?.results ?? null, before?.results ?? null);
  if (results !== null) parts.push(`${signed(results)} em ${names.pluralNoun}`);
  if (isPurchaseIndicator(indicator)) {
    const revenue = change(now?.purchaseValue ?? null, before?.purchaseValue ?? null);
    if (revenue !== null) parts.push(`${signed(revenue)} em faturamento`);
  }
  const cost = change(now?.costPerResult ?? null, before?.costPerResult ?? null);
  if (cost !== null) {
    const rounded = Math.round(cost);
    parts.push(
      rounded === 0
        ? `custo por ${names.singular} estável`
        : `custo por ${names.singular} ${Math.abs(rounded)}% ${rounded < 0 ? "menor" : "maior"}`,
    );
  }
  if (parts.length === 0) return null;
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} e ${parts.at(-1)}`;
  return `Comparado ${comparisonLabel(input.range, input.comparison)}: ${list}.`;
}

function campaignLine(row: CampaignRow, currency: string): string {
  const name = cleanName(row.name);
  const names = resultNames(row.resultIndicator);
  const results = row.metrics.results;
  if (row.resultIndicator === null) {
    return `${name}: ${money(row.metrics.spend, currency)} investidos (sem resultado definido)`;
  }
  if (!results) {
    return `${name}: 0 ${names.pluralNoun} | ${money(row.metrics.spend, currency)} investidos`;
  }
  const noun = results === 1 ? names.singular : names.pluralNoun;
  const parts = [`${count(results)} ${noun}`];
  if (row.metrics.costPerResult !== null) {
    parts.push(`${money(row.metrics.costPerResult, currency)} cada`);
  }
  if (isPurchaseIndicator(row.resultIndicator) && row.metrics.roas !== null) {
    parts.push(`ROAS ${formatMetricValue(row.metrics.roas, "multiplier")}`);
  }
  return `${name}: ${parts.join(" | ")}`;
}

function campaignSection(input: ReportInput, indicator: string | null): string[] {
  const { currency } = input.client;
  const active = input.campaigns.filter(
    (c) => (c.metrics.spend ?? 0) > 0 || (c.metrics.results ?? 0) > 0,
  );
  const byResults = (a: CampaignRow, b: CampaignRow) =>
    (b.metrics.results ?? 0) - (a.metrics.results ?? 0) ||
    (b.metrics.spend ?? 0) - (a.metrics.spend ?? 0);
  const main = active.filter((c) => c.resultIndicator === indicator).sort(byResults);
  const others = active
    .filter((c) => c.resultIndicator !== indicator && c.resultIndicator !== null)
    .sort(byResults);
  const untyped = active.filter((c) => c.resultIndicator === null).sort(byResults);

  const lines: string[] = [];
  if (main.length > 0) {
    lines.push("", "*Por campanha*", ...main.map((c) => campaignLine(c, currency)));
  }
  if (others.length + untyped.length > 0) {
    lines.push(
      "",
      main.length > 0 ? "*Outros objetivos*" : "*Por campanha*",
      ...[...others, ...untyped].map((c) => campaignLine(c, currency)),
    );
  }
  return lines;
}

function deliverySection(input: ReportInput): string[] {
  const { currency } = input.client;
  const m = input.current.metrics;
  const lines = ["", "*Entrega*"];
  if (input.reachAvailable && m.reach !== null) {
    lines.push(`Pessoas alcançadas: ${count(m.reach)}`);
  }
  lines.push(`Exibições: ${count(m.impressions)}`);
  if (input.reachAvailable && m.frequency !== null) {
    lines.push(`Frequência: ${formatMetricValue(m.frequency, "decimal")} por pessoa`);
  }
  lines.push(
    `Cliques no link: ${count(m.linkClicks)}${m.linkCtr !== null ? ` (${formatMetricValue(m.linkCtr, "percent")} de quem viu)` : ""}`,
  );
  if (m.linkCpc !== null) lines.push(`Custo por clique: ${money(m.linkCpc, currency)}`);
  if (m.cpm !== null) lines.push(`Custo por mil exibições: ${money(m.cpm, currency)}`);
  return lines;
}

function funnelSection(input: ReportInput, indicator: string | null): string[] {
  if (indicator === null) return [];
  const primary = primaryResultFor(input.current, indicator, "objective");
  const reach = input.reachAvailable ? input.current.metrics.reach : null;
  const steps = buildFunnel(primary, reach).filter((s) => s.value !== null);
  if (steps.length < 2) return [];
  return [
    "",
    `*Funil (${resultNames(indicator).pluralNoun})*`,
    ...steps.map(
      (s) =>
        `${s.label}: ${count(s.value)}${s.passRate !== null ? ` (${formatMetricValue(s.passRate, "percent")})` : ""}`,
    ),
  ];
}

function championSection(input: ReportInput, indicator: string | null): string[] {
  if (!input.ads || indicator === null) return [];
  const best = input.ads
    .filter((a) => a.resultIndicator === indicator && (a.results ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.results ?? 0) - (a.results ?? 0) ||
        (a.costPerResult ?? Infinity) - (b.costPerResult ?? Infinity),
    )[0];
  if (!best) return [];
  const names = resultNames(indicator);
  const noun = best.results === 1 ? names.singular : names.pluralNoun;
  const cost =
    best.costPerResult !== null
      ? ` | ${money(best.costPerResult, input.client.currency)} cada`
      : "";
  return [
    "",
    "*Anúncio campeão*",
    `${cleanName(best.name)} (${cleanName(best.campaignName)}): ${count(best.results)} ${noun}${cost}`,
  ];
}

export function buildReportText(input: ReportInput): string {
  const title = `*${cleanName(input.client.name)} | Resumo Meta Ads – ${periodTitle(input.range)}*`;
  const footer: string[] = [];
  if (input.partialThrough)
    footer.push(`_Dados disponíveis até ${dayMonth(input.partialThrough)}._`);
  if (input.origin === "simulated") footer.push("_Dados simulados — não são dados reais da Meta._");
  const withFooter = (lines: string[]) =>
    [...lines, ...(footer.length ? ["", ...footer] : [])].join("\n");

  const spend = input.current.metrics.spend;
  if (spend === null || spend === 0) {
    return withFooter([title, "", "Sem investimento em anúncios no período."]);
  }

  const { indicator } = choosePrimaryIndicator(input.client, input.current);
  const lines = [title, "", ...totalsLines(input, indicator)];
  const compared = comparisonLine(input, indicator);
  if (compared) lines.push("", compared);

  if (input.template !== "rapido") lines.push(...campaignSection(input, indicator));
  if (input.template === "completo") {
    lines.push(
      ...deliverySection(input),
      ...funnelSection(input, indicator),
      ...championSection(input, indicator),
    );
  }
  return withFooter(lines);
}
