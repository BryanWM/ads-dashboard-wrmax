import { formatMetricValue } from "@/lib/format";
import type { WeekdayCell } from "@/lib/overview/weekday";

/**
 * Results per weekday. Sequential single hue (dourado, light → strong); the
 * number is always printed, so colour is never the only channel.
 */
export function WeekdayHeatmap({
  cells,
  resultLabel,
  currency,
}: {
  cells: WeekdayCell[];
  resultLabel: string;
  currency: string;
}) {
  const max = Math.max(...cells.map((c) => c.results ?? 0), 0);
  if (max === 0) {
    return (
      <p className="text-[13px] text-texto-inativo">Sem {resultLabel.toLowerCase()} no período.</p>
    );
  }

  return (
    <div className="space-y-2">
      <ol className="grid grid-cols-7 gap-1.5">
        {cells.map((cell) => {
          const intensity = (cell.results ?? 0) / max;
          return (
            <li
              key={cell.index}
              title={`${cell.label}: ${formatMetricValue(cell.results, "integer")} · ${formatMetricValue(cell.costPerResult, "currency", { currency })} cada`}
              className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-lg text-center sm:aspect-auto sm:h-16"
              style={{ backgroundColor: `rgb(var(--ouro-rgb) / ${0.06 + intensity * 0.5})` }}
            >
              {/* text-texto: the strongest gold cell drops texto-apagado below 4.5:1. */}
              <span className="text-xs text-texto">{cell.label}</span>
              <span className="font-display text-sm font-bold text-texto figures-tabular">
                {formatMetricValue(cell.results, "integer", { compact: true })}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-texto-inativo">
        {resultLabel} somados por dia da semana no período. Quanto mais forte o dourado, mais
        resultados.
      </p>
    </div>
  );
}
