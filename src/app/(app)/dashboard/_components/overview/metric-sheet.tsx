"use client";

import { MetricTrendChart } from "@/components/charts/metric-trend-chart";
import { DeltaIndicator } from "@/components/metrics/delta-indicator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DashboardData } from "@/lib/domain/types";
import { formatMetricValue } from "@/lib/format";
import { METRICS, type MetricKey } from "@/lib/metrics/definitions";
import { safeRatio } from "@/lib/metrics/derive";
import type { OverviewCard, OverviewModel } from "@/lib/overview/model";

interface MetricSheetProps {
  card: OverviewCard | null;
  model: OverviewModel;
  data: DashboardData;
  onClose: () => void;
}

interface TechRow {
  label: string;
  value: string;
}

/** The technical numbers behind each card (moved out of the overview). */
function technicalRows(card: OverviewCard, model: OverviewModel, data: DashboardData): TechRow[] {
  const m = data.current.metrics;
  const c = data.client.currency;
  const fmt = (key: MetricKey, v: number | null) =>
    formatMetricValue(v, METRICS[key].format, { currency: c });
  const p = model.primary;
  const conversion = safeRatio(p.results, p.linkClicks, 100);

  switch (card.metric) {
    case "spend":
      return [
        { label: METRICS.impressions.label, value: fmt("impressions", m.impressions) },
        { label: METRICS.cpm.label, value: fmt("cpm", m.cpm) },
        { label: METRICS.linkClicks.label, value: fmt("linkClicks", m.linkClicks) },
        { label: METRICS.linkCpc.label, value: fmt("linkCpc", m.linkCpc) },
      ];
    case "results":
      return [
        { label: METRICS.linkClicks.label, value: fmt("linkClicks", p.linkClicks) },
        { label: "Cliques que viraram resultado", value: formatMetricValue(conversion, "percent") },
        { label: METRICS.linkCtr.label, value: fmt("linkCtr", m.linkCtr) },
      ];
    case "costPerResult":
      return [
        { label: "Investimento nessas campanhas", value: fmt("spend", p.spend) },
        { label: METRICS.linkCpc.label, value: fmt("linkCpc", m.linkCpc) },
        { label: METRICS.cpm.label, value: fmt("cpm", m.cpm) },
      ];
    case "roas":
      return [
        { label: "Investimento em vendas", value: fmt("spend", p.spend) },
        { label: model.resultLabel, value: fmt("results", p.results) },
        { label: "Custo por compra", value: fmt("costPerResult", p.costPerResult) },
      ];
    case "reach":
      return [
        { label: METRICS.frequency.label, value: fmt("frequency", m.frequency) },
        { label: METRICS.impressions.label, value: fmt("impressions", m.impressions) },
      ];
  }
}

/**
 * Details of one number: a one-sentence explanation, the daily chart and the
 * technical metrics. Bottom sheet on phones, side panel on larger screens.
 */
export function MetricSheet({ card, model, data, onClose }: MetricSheetProps) {
  const isMobile = useIsMobile();
  const def = card ? METRICS[card.metric] : null;
  const hasPrevious = card?.series.some((p) => p.previous !== null) ?? false;

  return (
    <Sheet open={card !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile
            ? "max-h-[88svh] gap-0 overflow-y-auto rounded-t-2xl border-t border-linha-2 bg-superficie"
            : "w-full gap-0 overflow-y-auto border-l border-linha-2 bg-superficie sm:max-w-lg"
        }
      >
        {card && def ? (
          <>
            {isMobile ? (
              <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-linha-2" />
            ) : null}
            <SheetHeader className="gap-2 px-5 pt-5 pb-2">
              <p className="text-ouro etiqueta">Detalhes</p>
              <SheetTitle className="font-display text-xl font-bold text-texto">
                {card.label}
              </SheetTitle>
              <SheetDescription className="text-[15px] leading-relaxed text-texto-apagado">
                {def.explanation}
              </SheetDescription>
            </SheetHeader>

            <div className="flex items-baseline gap-3 px-5 pt-2">
              <span className="font-display text-3xl font-bold text-texto figures-tabular">
                {formatMetricValue(card.value, def.format, { currency: data.client.currency })}
              </span>
              <DeltaIndicator change={card.change} polarity={def.polarity} />
              <span className="text-xs text-texto-inativo">vs. período anterior</span>
            </div>

            {card.series.length > 0 ? (
              <div className="px-3 pt-4">
                <MetricTrendChart
                  metric={card.metric}
                  data={card.series}
                  currency={data.client.currency}
                  showComparison={hasPrevious}
                  className="h-52"
                />
              </div>
            ) : (
              <p className="px-5 pt-4 text-[13px] text-texto-inativo">
                Este número não tem evolução por dia: as pessoas são contadas uma única vez no
                período inteiro.
              </p>
            )}

            <dl className="mx-5 mt-4 mb-6 divide-y divide-linha">
              {technicalRows(card, model, data).map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-[13px] text-texto-apagado">{row.label}</dt>
                  <dd className="text-sm font-semibold text-texto figures-tabular">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="px-5 pb-6 text-xs leading-relaxed text-texto-inativo">
              {def.description}
            </p>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
