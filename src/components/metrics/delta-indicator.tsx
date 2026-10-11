import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";

import { formatPercentChange } from "@/lib/format";
import type { MetricPolarity } from "@/lib/metrics/definitions";
import { deltaTone } from "@/lib/metrics/derive";
import { cn } from "@/lib/utils";

interface DeltaIndicatorProps {
  /** Relative change in percent, or null when not comparable. */
  change: number | null;
  polarity: MetricPolarity;
  className?: string;
}

const ICON_TONE = {
  positive: "text-success",
  negative: "text-critical",
  neutral: "text-texto-inativo",
} as const;

const TONE_LABEL = {
  positive: "melhora",
  negative: "piora",
  neutral: "variação",
} as const;

/**
 * Change vs. the previous equivalent period. WRMax DS: the coloured mark carries
 * the meaning (arrow in ok/erro), the number stays in neutral text. Colour
 * follows the metric's polarity (a lower CPC is good news).
 */
export function DeltaIndicator({ change, polarity, className }: DeltaIndicatorProps) {
  const tone = deltaTone(change, polarity);
  const Icon =
    change === null || Math.abs(change) < 0.05
      ? MinusIcon
      : change > 0
        ? ArrowUpRightIcon
        : ArrowDownRightIcon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold text-texto figures-tabular",
        className,
      )}
      title={change === null ? "Sem base de comparação no período anterior" : undefined}
    >
      <Icon className={cn("size-3.5", ICON_TONE[tone])} aria-hidden />
      {formatPercentChange(change)}
      <span className="sr-only">
        {change === null ? " sem comparação" : ` (${TONE_LABEL[tone]} vs. período anterior)`}
      </span>
    </span>
  );
}
