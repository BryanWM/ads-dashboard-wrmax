import { InfoIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { METRICS, type MetricKey } from "@/lib/metrics/definitions";
import { percentChange } from "@/lib/metrics/derive";
import { cn } from "@/lib/utils";

import { AnimatedNumber } from "./animated-number";
import { DeltaIndicator } from "./delta-indicator";

interface KpiCardProps {
  metric: MetricKey;
  value: number | null;
  /** Value for the previous equivalent period; omit to hide the comparison. */
  previous?: number | null;
  currency: string;
  /** Shown instead of a bare dash when the value is missing for a known reason. */
  unavailableReason?: string;
  /** Qualifies the label, e.g. the result type ("Resultados · Leads"). */
  labelDetail?: string;
  className?: string;
}

export function KpiCard({
  metric,
  value,
  previous,
  currency,
  unavailableReason,
  labelDetail,
  className,
}: KpiCardProps) {
  const def = METRICS[metric];
  const showComparison = previous !== undefined;

  return (
    <Card size="sm" className={cn("gap-3", className)}>
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle className="truncate text-[13px] font-medium text-muted-foreground">
          {def.label}
          {labelDetail ? <span className="font-normal"> · {labelDetail}</span> : null}
        </CardTitle>
        <Tooltip>
          <TooltipTrigger
            aria-label={`O que é ${def.label}`}
            className="-m-1 rounded-md p-1 text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <InfoIcon className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-64 leading-relaxed">
            {def.description}
          </TooltipContent>
        </Tooltip>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <AnimatedNumber
          value={value}
          format={def.format}
          currency={currency}
          className="font-display text-[22px] leading-none font-bold tracking-tight text-texto"
        />
        <div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
          {value === null && unavailableReason ? (
            <span>{unavailableReason}</span>
          ) : showComparison ? (
            <>
              <DeltaIndicator change={percentChange(value, previous)} polarity={def.polarity} />
              <span aria-hidden>vs. anterior</span>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiCardSkeleton() {
  return (
    <Card size="sm" className="gap-3" aria-hidden>
      <CardHeader>
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  );
}
