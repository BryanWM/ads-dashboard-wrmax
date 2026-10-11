/**
 * Canonical metric catalogue. Labels/descriptions are user-facing (pt-BR).
 * See docs/data-model.md → "Definições de métricas".
 */

export type MetricFormat = "currency" | "integer" | "decimal" | "percent";

/** Which direction of change is good news for the advertiser. */
export type MetricPolarity = "higher-is-better" | "lower-is-better" | "neutral";

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  description: string;
  format: MetricFormat;
  polarity: MetricPolarity;
  /** Additive metrics can be summed across days/campaigns; ratios and reach cannot. */
  additive: boolean;
}

export const METRIC_KEYS = [
  "spend",
  "reach",
  "impressions",
  "frequency",
  "linkClicks",
  "linkCtr",
  "linkCpc",
  "cpm",
  "results",
  "costPerResult",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export const METRICS: Record<MetricKey, MetricDefinition> = {
  spend: {
    key: "spend",
    label: "Investimento",
    description: "Valor gasto no período, na moeda da conta de anúncios.",
    format: "currency",
    polarity: "neutral",
    additive: true,
  },
  reach: {
    key: "reach",
    label: "Alcance",
    description:
      "Pessoas únicas que viram os anúncios ao menos uma vez no período. Não é a soma do alcance diário: a mesma pessoa conta uma única vez.",
    format: "integer",
    polarity: "higher-is-better",
    additive: false,
  },
  impressions: {
    key: "impressions",
    label: "Impressões",
    description: "Número de vezes que os anúncios foram exibidos.",
    format: "integer",
    polarity: "higher-is-better",
    additive: true,
  },
  frequency: {
    key: "frequency",
    label: "Frequência",
    description: "Média de vezes que cada pessoa alcançada viu os anúncios (impressões ÷ alcance).",
    format: "decimal",
    polarity: "neutral",
    additive: false,
  },
  linkClicks: {
    key: "linkClicks",
    label: "Cliques no link",
    description: "Cliques que levaram a destinos dentro ou fora da Meta indicados pelo anúncio.",
    format: "integer",
    polarity: "higher-is-better",
    additive: true,
  },
  linkCtr: {
    key: "linkCtr",
    label: "CTR de link",
    description: "Cliques no link ÷ impressões × 100.",
    format: "percent",
    polarity: "higher-is-better",
    additive: false,
  },
  linkCpc: {
    key: "linkCpc",
    label: "CPC de link",
    description: "Investimento ÷ cliques no link.",
    format: "currency",
    polarity: "lower-is-better",
    additive: false,
  },
  cpm: {
    key: "cpm",
    label: "CPM",
    description: "Custo por mil impressões (investimento ÷ impressões × 1000).",
    format: "currency",
    polarity: "lower-is-better",
    additive: false,
  },
  results: {
    key: "results",
    label: "Resultados",
    description:
      "Quantidade do resultado definido pela meta de otimização da campanha (ex.: compras, leads). Tipos diferentes não são somados.",
    format: "integer",
    polarity: "higher-is-better",
    additive: true,
  },
  costPerResult: {
    key: "costPerResult",
    label: "Custo por resultado",
    description: "Investimento ÷ resultados, apenas quando todos os resultados são do mesmo tipo.",
    format: "currency",
    polarity: "lower-is-better",
    additive: false,
  },
};
