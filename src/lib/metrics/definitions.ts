/**
 * Canonical metric catalogue. Labels/descriptions are user-facing (pt-BR).
 * See docs/data-model.md → "Definições de métricas".
 *
 * `label` is the friendly name a non-specialist reads; `explanation` is one plain
 * sentence for the details sheet; `description` is the technical definition.
 */

export type MetricFormat = "currency" | "integer" | "decimal" | "percent" | "multiplier";

/** Which direction of change is good news for the advertiser. */
export type MetricPolarity = "higher-is-better" | "lower-is-better" | "neutral";

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  /** One plain sentence, no jargon (details sheet). */
  explanation: string;
  /** Technical definition / formula. */
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
  "roas",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export const METRICS: Record<MetricKey, MetricDefinition> = {
  spend: {
    key: "spend",
    label: "Investimento",
    explanation: "Quanto foi gasto com anúncios no período.",
    description: "Valor gasto no período, na moeda da conta de anúncios.",
    format: "currency",
    polarity: "neutral",
    additive: true,
  },
  reach: {
    key: "reach",
    label: "Pessoas alcançadas",
    explanation: "Quantas pessoas diferentes viram seus anúncios pelo menos uma vez.",
    description:
      "Pessoas únicas no período (alcance). Não é a soma do alcance diário: a mesma pessoa conta uma única vez.",
    format: "integer",
    polarity: "higher-is-better",
    additive: false,
  },
  impressions: {
    key: "impressions",
    label: "Impressões",
    explanation: "Quantas vezes os anúncios apareceram na tela das pessoas.",
    description: "Número de vezes que os anúncios foram exibidos.",
    format: "integer",
    polarity: "higher-is-better",
    additive: true,
  },
  frequency: {
    key: "frequency",
    label: "Frequência",
    explanation: "Quantas vezes, em média, cada pessoa viu o anúncio.",
    description: "Impressões ÷ pessoas alcançadas, no mesmo período.",
    format: "decimal",
    polarity: "neutral",
    additive: false,
  },
  linkClicks: {
    key: "linkClicks",
    label: "Cliques",
    explanation: "Quantas vezes as pessoas tocaram no anúncio para saber mais.",
    description: "Cliques no link: levaram ao site, WhatsApp ou formulário indicado no anúncio.",
    format: "integer",
    polarity: "higher-is-better",
    additive: true,
  },
  linkCtr: {
    key: "linkCtr",
    label: "Taxa de cliques",
    explanation: "De cada 100 vezes que o anúncio apareceu, quantas viraram clique.",
    description: "CTR de link: cliques no link ÷ impressões × 100.",
    format: "percent",
    polarity: "higher-is-better",
    additive: false,
  },
  linkCpc: {
    key: "linkCpc",
    label: "Custo por clique",
    explanation: "Quanto custou, em média, cada clique no anúncio.",
    description: "CPC de link: investimento ÷ cliques no link.",
    format: "currency",
    polarity: "lower-is-better",
    additive: false,
  },
  cpm: {
    key: "cpm",
    label: "Custo por mil exibições",
    explanation: "Quanto custou mostrar o anúncio mil vezes.",
    description: "CPM: investimento ÷ impressões × 1000.",
    format: "currency",
    polarity: "lower-is-better",
    additive: false,
  },
  results: {
    key: "results",
    label: "Resultados",
    explanation: "O que os anúncios trouxeram de concreto: compras, conversas ou cadastros.",
    description:
      "Quantidade do resultado definido pela meta de otimização da campanha. Tipos diferentes não são somados.",
    format: "integer",
    polarity: "higher-is-better",
    additive: true,
  },
  costPerResult: {
    key: "costPerResult",
    label: "Custo por resultado",
    explanation: "Quanto custou, em média, cada resultado. Quanto menor, melhor.",
    description: "Investimento ÷ resultados, apenas entre campanhas com o mesmo tipo de resultado.",
    format: "currency",
    polarity: "lower-is-better",
    additive: false,
  },
  roas: {
    key: "roas",
    label: "Retorno",
    explanation: "Para cada R$ 1 investido, quantos reais voltaram em vendas.",
    description: "ROAS: valor das compras atribuídas aos anúncios ÷ investimento.",
    format: "multiplier",
    polarity: "higher-is-better",
    additive: false,
  },
};
