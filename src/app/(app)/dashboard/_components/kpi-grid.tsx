import { Fragment } from "react";
import { KpiCard } from "@/components/metrics/kpi-card";
import type { DashboardData } from "@/lib/domain/types";
import type { MetricKey } from "@/lib/metrics/definitions";
import { resultLabel } from "@/lib/metrics/result-types";

const KPIS: MetricKey[] = [
  "spend",
  "results",
  "costPerResult",
  "impressions",
  "reach",
  "frequency",
  "linkClicks",
  "linkCtr",
  "linkCpc",
  "cpm",
];

function unavailableReason(metric: MetricKey, data: DashboardData): string | undefined {
  const m = data.current.metrics;
  if ((metric === "reach" || metric === "frequency") && !data.reachAvailable) {
    return "Indisponível para intervalo personalizado";
  }
  if ((metric === "results" || metric === "costPerResult") && m.mixedResultTypes) {
    return "Tipos de resultado diferentes — veja abaixo";
  }
  if (metric === "results" && m.resultIndicator === null) {
    return "Nenhuma campanha com resultado definido";
  }
  if (m.spend === null) return "Sem dados no período";
  return undefined;
}

export function KpiGrid({ data, compare }: { data: DashboardData; compare: boolean }) {
  const singleResult =
    !data.current.metrics.mixedResultTypes && data.current.metrics.resultIndicator !== null
      ? resultLabel(data.current.metrics.resultIndicator)
      : undefined;

  return (
    <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {KPIS.map((metric) => {
        // Comparing a single result type with a period of another type would be meaningless.
        const comparable =
          compare &&
          !(
            (metric === "results" || metric === "costPerResult") &&
            data.current.metrics.resultIndicator !== data.previous.metrics.resultIndicator
          );
        return (
          <Fragment key={metric}>
            <KpiCard
              metric={metric}
              value={data.current.metrics[metric]}
              previous={comparable ? data.previous.metrics[metric] : undefined}
              currency={data.client.currency}
              unavailableReason={unavailableReason(metric, data)}
              labelDetail={metric === "results" ? singleResult : undefined}
              className="h-full"
            />
          </Fragment>
        );
      })}
    </div>
  );
}
