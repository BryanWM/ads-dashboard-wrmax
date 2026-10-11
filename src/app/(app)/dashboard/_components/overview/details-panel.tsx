import { PartialPeriodNote, SyncStatusLine } from "@/components/feedback/sync-status";
import { PeriodPicker } from "@/components/filters/period-picker";
import { DeltaIndicator } from "@/components/metrics/delta-indicator";
import type { PeriodPreset } from "@/lib/dates/periods";
import type { DashboardData } from "@/lib/domain/types";
import { formatMetricValue } from "@/lib/format";
import { METRICS, type MetricKey } from "@/lib/metrics/definitions";
import { percentChange } from "@/lib/metrics/derive";
import { resultLabel } from "@/lib/metrics/result-types";
import type { OverviewModel } from "@/lib/overview/model";
import { cn } from "@/lib/utils";

import { WeekdayHeatmap } from "./weekday-heatmap";

const TECHNICAL: MetricKey[] = [
  "impressions",
  "reach",
  "frequency",
  "linkClicks",
  "linkCtr",
  "linkCpc",
  "cpm",
];

interface DetailsPanelProps {
  data: DashboardData;
  model: OverviewModel;
  preset: PeriodPreset | null;
  today: string;
  className?: string;
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="etiqueta text-texto-apagado">{title}</h3>
      {children}
    </section>
  );
}

/** Everything technical that left the overview, in one place. */
export function DetailsPanel({ data, model, preset, today, className }: DetailsPanelProps) {
  const currency = data.client.currency;
  const now = data.current.metrics;
  const before = data.previous.metrics;

  return (
    <div className={cn("grid gap-8 lg:grid-cols-3", className)}>
      <Block title="Métricas técnicas">
        <dl className="divide-y divide-linha">
          {TECHNICAL.map((key) => {
            const def = METRICS[key];
            return (
              <div key={key} className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-[13px] text-texto-apagado">{def.label}</dt>
                <dd className="flex items-center gap-3">
                  <DeltaIndicator
                    change={percentChange(now[key], before[key])}
                    polarity={def.polarity}
                  />
                  <span className="w-24 text-right text-sm font-semibold text-texto figures-tabular">
                    {formatMetricValue(now[key], def.format, { currency })}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
        {!data.reachAvailable ? (
          <p className="text-xs text-texto-inativo">
            Pessoas alcançadas e frequência só existem nos períodos prontos (7 dias, 30 dias, mês).
          </p>
        ) : null}
      </Block>

      <div className="space-y-8">
        <Block title={`${model.resultLabel} por dia da semana`}>
          <WeekdayHeatmap
            cells={model.weekday}
            resultLabel={model.resultLabel}
            currency={currency}
          />
        </Block>
        {data.current.resultTypes.length > 1 ? (
          <Block title="Resultados por tipo">
            <p className="text-xs text-texto-inativo">
              Objetivos diferentes não são somados. Cada um com o próprio custo.
            </p>
            <dl className="divide-y divide-linha">
              {data.current.resultTypes.map((t) => (
                <div
                  key={t.resultIndicator}
                  className="flex items-baseline justify-between gap-3 py-2.5"
                >
                  <dt className="text-[13px] text-texto">{resultLabel(t.resultIndicator)}</dt>
                  <dd className="text-right text-[13px] text-texto-apagado figures-tabular">
                    <strong className="font-semibold text-texto">
                      {formatMetricValue(t.results, "integer")}
                    </strong>{" "}
                    · {formatMetricValue(t.costPerResult, "currency", { currency })} cada
                  </dd>
                </div>
              ))}
            </dl>
          </Block>
        ) : null}
      </div>

      <Block title="Período e atualização">
        <PeriodPicker preset={preset} range={data.range} today={today} />
        <SyncStatusLine sync={data.sync} timeZone={data.client.timezone} />
        <PartialPeriodNote
          partial={data.partial}
          compare
          dataThrough={data.sync.dataThrough}
          comparisonRange={data.comparisonRange}
        />
      </Block>
    </div>
  );
}
