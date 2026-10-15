import { describe, expect, it } from "vitest";

import type { CampaignRow, MetricsSnapshot } from "@/lib/domain/types";
import type { DerivedMetrics, ResultTypeBreakdown } from "@/lib/metrics/derive";
import {
  buildReportText,
  cleanName,
  parseTemplate,
  type ReportInput,
} from "@/lib/reports/build-report";
import {
  comparisonLabel,
  periodTitle,
  reportSelection,
  weekdayName,
} from "@/lib/reports/report-period";

const PURCHASE = "actions:offsite_conversion.fb_pixel_purchase";
const MESSAGES = "actions:onsite_conversion.messaging_conversation_started_7d";
const nbsp = (s: string) => s.replace(/[  ]/g, " ");

function metrics(partial: Partial<DerivedMetrics>): DerivedMetrics {
  return {
    spend: null,
    reach: null,
    impressions: null,
    frequency: null,
    linkClicks: null,
    linkCtr: null,
    linkCpc: null,
    cpm: null,
    results: null,
    costPerResult: null,
    roas: null,
    mixedResultTypes: false,
    resultIndicator: null,
    ...partial,
  };
}

function type(
  resultIndicator: string,
  spend: number,
  results: number,
  purchaseValue: number | null = null,
): ResultTypeBreakdown {
  return {
    resultIndicator,
    spend,
    results,
    costPerResult: results ? spend / results : null,
    impressions: 50000,
    linkClicks: 900,
    purchaseValue,
    addToCart: null,
    initiateCheckout: null,
  };
}

function campaign(
  name: string,
  resultIndicator: string | null,
  spend: number,
  results: number | null,
  purchaseValue: number | null = null,
): CampaignRow {
  return {
    id: name,
    name,
    status: "active",
    objectiveLabel: "Vendas",
    resultIndicator,
    components: { spend, impressions: null, linkClicks: null, results, resultIndicator },
    metrics: metrics({
      spend,
      results,
      costPerResult: results ? spend / results : null,
      roas: purchaseValue !== null ? purchaseValue / spend : null,
    }),
    previousMetrics: metrics({}),
  };
}

// The Forno Paulista Wednesday from the agency's example, with consistent numbers.
const current: MetricsSnapshot = {
  metrics: metrics({
    spend: 735.28,
    impressions: 60000,
    linkClicks: 1200,
    linkCtr: 2,
    linkCpc: 0.61,
    cpm: 12.25,
  }),
  resultTypes: [type(PURCHASE, 596.3, 71, 5910.6), type(MESSAGES, 87.3, 9)],
};
const previous: MetricsSnapshot = {
  metrics: metrics({ spend: 650 }),
  resultTypes: [type(PURCHASE, 540, 61, 4690), type(MESSAGES, 90, 10)],
};

const base: ReportInput = {
  template: "rapido",
  client: { name: "Forno Paulista", currency: "BRL", objective: "purchases" },
  origin: "meta",
  range: { from: "2026-10-14", to: "2026-10-14" },
  comparison: { from: "2026-10-07", to: "2026-10-07" },
  current,
  previous,
  campaigns: [
    campaign("Promo Seg/Qua", PURCHASE, 252.62, 34, 2374.6),
    campaign("Dirceu", PURCHASE, 86, 8, 600),
    campaign("Aniversário", MESSAGES, 87.3, 9),
    campaign("Reconhecimento *marca*", null, 51.68, null),
  ],
  ads: null,
  reachAvailable: false,
  partialThrough: null,
};

describe("report period", () => {
  it("defaults to yesterday and compares a single day with the same weekday last week", () => {
    const s = reportSelection({}, "2026-10-15");
    expect(s.range).toEqual({ from: "2026-10-14", to: "2026-10-14" });
    expect(s.previous).toEqual({ from: "2026-10-07", to: "2026-10-07" });
  });

  it("keeps the usual previous period for longer ranges", () => {
    const s = reportSelection({ period: "last_7d" }, "2026-10-15");
    expect(s.range).toEqual({ from: "2026-10-08", to: "2026-10-14" });
    expect(s.previous).toEqual({ from: "2026-10-01", to: "2026-10-07" });
  });

  it("names days in Portuguese with the right gender", () => {
    expect(weekdayName("2026-10-14")).toBe("Quarta");
    expect(periodTitle({ from: "2026-10-14", to: "2026-10-14" })).toBe("Quarta (14/10)");
    expect(periodTitle({ from: "2026-10-08", to: "2026-10-14" })).toBe("08/10 a 14/10/2026");
    expect(
      comparisonLabel(
        { from: "2026-10-08", to: "2026-10-14" },
        { from: "2026-10-01", to: "2026-10-07" },
      ),
    ).toBe("ao período de 01/10 a 07/10/2026");
    const wed = { from: "2026-10-14", to: "2026-10-14" };
    expect(comparisonLabel(wed, { from: "2026-10-07", to: "2026-10-07" })).toBe(
      "à quarta passada (07/10)",
    );
    const sat = { from: "2026-10-10", to: "2026-10-10" };
    expect(comparisonLabel(sat, { from: "2026-10-03", to: "2026-10-03" })).toBe(
      "ao sábado passado (03/10)",
    );
  });
});

describe("report text", () => {
  it("quick summary: totals of the main result only, other objectives apart", () => {
    const text = nbsp(buildReportText(base));
    expect(text).toBe(
      [
        "*Forno Paulista | Resumo Meta Ads – Quarta (14/10)*",
        "",
        "*Investimento:* R$ 735,28",
        "*Compras:* 71",
        "*Faturamento:* R$ 5.910,60",
        "*Custo por compra:* R$ 8,40",
        "*Retorno (ROAS):* 9,9x",
        "_Custo e retorno só das campanhas de compras (R$ 596,30 investidos)._",
        "*Outros resultados:* 9 conversas",
        "",
        "Comparado à quarta passada (07/10): +16% em compras, +26% em faturamento e custo por compra 5% menor.",
      ].join("\n"),
    );
  });

  it("by campaign: main type first, then other objectives and untyped spend", () => {
    const text = nbsp(buildReportText({ ...base, template: "campanhas" }));
    expect(text).toContain(
      "*Por campanha*\nPromo Seg/Qua: 34 compras | R$ 7,43 cada | ROAS 9,4x\nDirceu: 8 compras | R$ 10,75 cada | ROAS 7,0x",
    );
    expect(text).toContain(
      "*Outros objetivos*\nAniversário: 9 conversas | R$ 9,70 cada\nReconhecimento marca: R$ 51,68 investidos (sem resultado definido)",
    );
    expect(text).not.toContain("*Outros resultados:*");
  });

  it("complete: adds delivery, funnel and the champion ad", () => {
    const text = nbsp(
      buildReportText({
        ...base,
        template: "completo",
        ads: [
          {
            id: "a1",
            name: "Pizza em dobro",
            campaignName: "Promo Seg/Qua",
            thumbnailUrl: null,
            resultIndicator: PURCHASE,
            spend: 120,
            results: 20,
            costPerResult: 6,
          },
        ],
      }),
    );
    expect(text).toContain("*Entrega*\nExibições: 60.000");
    expect(text).toContain("Custo por mil exibições: R$ 12,25");
    expect(text).toContain("*Funil (compras)*");
    expect(text).toContain(
      "*Anúncio campeão*\nPizza em dobro (Promo Seg/Qua): 20 compras | R$ 6,00 cada",
    );
    expect(text).not.toContain("Pessoas alcançadas"); // custom day: no deduplicated reach
  });

  it("marks simulated data and partial periods, and handles no spend", () => {
    const text = buildReportText({ ...base, origin: "simulated", partialThrough: "2026-10-13" });
    expect(text).toContain("_Dados disponíveis até 13/10._");
    expect(text).toContain("_Dados simulados — não são dados reais da Meta._");
    const empty = buildReportText({ ...base, current: { metrics: metrics({}), resultTypes: [] } });
    expect(empty).toContain("Sem investimento em anúncios no período.");
  });

  it("skips the comparison when it is off and strips WhatsApp markers from names", () => {
    expect(buildReportText({ ...base, comparison: null })).not.toContain("Comparado");
    expect(cleanName("  *Promo*  _Sul_ ")).toBe("Promo Sul");
    expect(parseTemplate("completo")).toBe("completo");
    expect(parseTemplate("qualquer")).toBe("rapido");
  });
});
