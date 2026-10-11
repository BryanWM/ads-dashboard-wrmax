import { Fragment } from "react";
import { MetricTrendChart, type TrendPoint } from "@/components/charts/metric-trend-chart";
import { KpiCard } from "@/components/metrics/kpi-card";
import { StatusDot } from "@/components/feedback/status-dot";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SIMULATED_CURRENCY, simulateDailySeries } from "@/lib/demo/simulated";
import { formatMetricValue } from "@/lib/format";
import type { MetricKey } from "@/lib/metrics/definitions";
import { aggregateComponents, deriveMetrics } from "@/lib/metrics/derive";

import { CatalogSection } from "./section";

// Fixed dates keep this page static (no `new Date()` during prerender).
const series = simulateDailySeries({ from: "2026-09-12", days: 28 });
const previousDays = series.slice(0, 14);
const currentDays = series.slice(14);
const current = deriveMetrics(aggregateComponents(currentDays));
const previous = deriveMetrics(aggregateComponents(previousDays));

const KPIS: MetricKey[] = [
  "spend",
  "results",
  "costPerResult",
  "linkClicks",
  "linkCtr",
  "linkCpc",
  "cpm",
  "reach",
];

const trend: TrendPoint[] = currentDays.map((day, i) => ({
  date: day.date,
  current: day.spend,
  previous: previousDays[i]?.spend ?? null,
}));

const CAMPAIGNS = [
  { name: "Leads · Revisão preventiva", status: "Ativa", seed: 11 },
  { name: "Tráfego · Promoção de pneus", status: "Ativa", seed: 23 },
  { name: "Leads · Alinhamento e balanceamento", status: "Pausada", seed: 37 },
  { name: "Reconhecimento · Marca Teresina", status: "Ativa", seed: 41 },
].map((c) => {
  const m = deriveMetrics(
    aggregateComponents(
      simulateDailySeries({ from: "2026-09-26", days: 14, seed: c.seed, baseSpend: 45 }),
    ),
  );
  return { ...c, ...m };
});

const money = (v: number | null) =>
  formatMetricValue(v, "currency", { currency: SIMULATED_CURRENCY });

export function DataDemo() {
  return (
    <>
      <CatalogSection
        id="kpis"
        title="Cards de métricas"
        description="Entrada escalonada, números animados e comparação com o período anterior equivalente. Alcance só aparece com snapshot deduplicado do mesmo período."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {KPIS.map((metric) => (
            <Fragment key={metric}>
              <KpiCard
                metric={metric}
                value={current[metric]}
                previous={metric === "reach" ? undefined : previous[metric]}
                currency={SIMULATED_CURRENCY}
                unavailableReason={
                  metric === "reach" ? "Indisponível para intervalo personalizado" : undefined
                }
              />
            </Fragment>
          ))}
        </div>
      </CatalogSection>

      <CatalogSection
        id="graficos"
        title="Gráfico histórico"
        description="Um único eixo; período anterior em tom de baixa ênfase; dias ausentes viram lacunas, não zero."
      >
        <Card>
          <CardHeader>
            <CardTitle>Investimento diário</CardTitle>
            <CardDescription>26/09 a 09/10 vs. 12/09 a 25/09</CardDescription>
          </CardHeader>
          <CardContent>
            <MetricTrendChart
              metric="spend"
              data={trend}
              currency={SIMULATED_CURRENCY}
              showComparison
            />
          </CardContent>
        </Card>
      </CatalogSection>

      <CatalogSection
        id="tabelas"
        title="Tabela de campanhas"
        description="Valores alinhados à direita com algarismos tabulares. Ordenação e filtros chegam na Fase 4."
      >
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Campanha</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Investimento</TableHead>
                <TableHead className="text-right">Resultados</TableHead>
                <TableHead className="pr-5 text-right">Custo por resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="figures-tabular">
              {CAMPAIGNS.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="pl-5 font-medium">{c.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2 text-[13px] text-texto">
                      <StatusDot tone={c.status === "Ativa" ? "ok" : "neutro"} />
                      {c.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{money(c.spend)}</TableCell>
                  <TableCell className="text-right">
                    {formatMetricValue(c.results, "integer")}
                  </TableCell>
                  <TableCell className="pr-5 text-right">{money(c.costPerResult)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </CatalogSection>
    </>
  );
}
