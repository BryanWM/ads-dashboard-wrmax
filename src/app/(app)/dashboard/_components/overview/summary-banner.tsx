import { RepeatIcon } from "lucide-react";

import { StatusDot, type StatusTone } from "@/components/feedback/status-dot";
import { formatMetricValue } from "@/lib/format";
import type { OverviewModel } from "@/lib/overview/model";
import type { Health } from "@/lib/overview/signals";
import { cn } from "@/lib/utils";

const HEALTH: Record<Health, { label: string; tone: StatusTone; detail: string }> = {
  saudavel: { label: "Saudável", tone: "ok", detail: "dentro da meta" },
  atencao: { label: "Atenção", tone: "atencao", detail: "um pouco acima da meta" },
  critico: { label: "Crítico", tone: "erro", detail: "bem acima da meta" },
};

interface SummaryBannerProps {
  model: OverviewModel;
  currency: string;
  goal: number | null;
  className?: string;
}

/** The plain-language answer to "is my investment working?" + discreet signals. */
export function SummaryBanner({ model, currency, goal, className }: SummaryBannerProps) {
  const health = model.health ? HEALTH[model.health] : null;

  return (
    <section aria-label="Resumo do período" className={cn("space-y-3", className)}>
      <p className="text-[15px] leading-relaxed text-texto-apagado lg:text-base">
        {model.summary.map((part, i) =>
          part.strong ? (
            <strong key={i} className="font-semibold text-texto">
              {part.text}
            </strong>
          ) : (
            <span key={i}>{part.text}</span>
          ),
        )}
      </p>

      {health || model.highFrequency ? (
        <ul className="flex flex-col gap-2 text-[13px] text-texto-apagado sm:flex-row sm:flex-wrap sm:gap-x-5">
          {health && goal !== null ? (
            <li className="flex items-center gap-2">
              <StatusDot tone={health.tone} />
              <span>
                <strong className="font-semibold text-texto">{health.label}</strong> · custo{" "}
                {health.detail} de {formatMetricValue(goal, "currency", { currency })}
              </span>
            </li>
          ) : null}
          {model.highFrequency ? (
            <li className="flex items-center gap-2">
              <RepeatIcon aria-hidden className="size-3.5 shrink-0 text-warning" />
              <span>
                As mesmas pessoas estão vendo o anúncio muitas vezes (
                {formatMetricValue(model.frequency, "decimal")} em média). Pode ser hora de renovar
                os criativos.
              </span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </section>
  );
}
