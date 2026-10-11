import { ArrowDownIcon } from "lucide-react";

import { formatMetricValue } from "@/lib/format";
import type { FunnelStep } from "@/lib/overview/funnel";

/**
 * "Viram" is shown as a headline number; the bars start at "Clicaram" (100%)
 * and are linear from zero. Scaling every bar to "Viram" would make all later
 * steps invisible slivers, hiding exactly the part a business owner acts on.
 */
export function FunnelBars({ steps }: { steps: FunnelStep[] }) {
  const [seen, ...rest] = steps;
  const base = rest[0]?.value ?? null;

  if (!seen || base === null || base === 0) {
    return (
      <p className="text-[13px] text-texto-inativo">Ainda não há cliques suficientes no período.</p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="flex flex-wrap items-baseline gap-x-2 text-[13px] text-texto-apagado">
        <span className="font-display text-lg font-bold text-texto figures-tabular">
          {formatMetricValue(seen.value, "integer", { compact: true })}
        </span>
        <span>{seen.label.toLowerCase()}</span>
        {rest[0]?.passRate !== null && rest[0]?.passRate !== undefined ? (
          <span>· {formatMetricValue(rest[0].passRate, "percent")} clicaram</span>
        ) : null}
      </p>

      <ol className="space-y-3">
        {rest.map((step, i) => {
          const width = step.value === null ? 0 : Math.max((step.value / base) * 100, 1.5);
          return (
            <li key={step.key} className="space-y-1.5">
              {i > 0 && step.passRate !== null ? (
                <p className="flex items-center gap-1 text-xs text-texto-inativo">
                  <ArrowDownIcon aria-hidden className="size-3" />
                  {formatMetricValue(step.passRate, "percent")} seguiram
                </p>
              ) : null}
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="text-texto">{step.label}</span>
                <span className="font-semibold text-texto figures-tabular">
                  {formatMetricValue(step.value, "integer")}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-campo" aria-hidden>
                <div className="h-full rounded-full bg-dourado" style={{ width: `${width}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
