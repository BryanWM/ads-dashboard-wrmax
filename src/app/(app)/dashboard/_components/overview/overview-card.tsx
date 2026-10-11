"use client";

import { ChevronRightIcon } from "lucide-react";

import { Sparkline } from "@/components/charts/sparkline";
import { DeltaIndicator } from "@/components/metrics/delta-indicator";
import { METRICS } from "@/lib/metrics/definitions";
import type { OverviewCard as Card } from "@/lib/overview/model";
import { cn } from "@/lib/utils";

import { formatCardValue } from "./card-value";

interface OverviewCardProps {
  card: Card;
  currency: string;
  onOpen: () => void;
  className?: string;
}

/**
 * One of the 4 main numbers. The whole card is a button that opens the details
 * sheet (replaces hover tooltips, which do not work on phones).
 */
export function OverviewCard({ card, currency, onOpen, className }: OverviewCardProps) {
  const def = METRICS[card.metric];
  const value = formatCardValue(card.metric, card.value, currency);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={`${card.label}: ${value}. Ver detalhes`}
      className={cn(
        "group flex min-h-31 w-full flex-col justify-between gap-2 rounded-xl border border-linha bg-superficie p-4 text-left transition-colors duration-200 outline-none hover:bg-superficie-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dourado active:scale-[0.99] lg:p-5",
        className,
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-[13px] leading-tight font-medium text-texto-apagado">
          {card.label}
        </span>
        <ChevronRightIcon
          aria-hidden
          className="size-4 shrink-0 text-texto-inativo transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
      {/* Scales with the viewport so "R$ 5.776,36" fits a 2-column card down to 360px. */}
      <span className="block font-display text-[clamp(1.125rem,5.4vw,1.375rem)] leading-none font-bold tracking-tight whitespace-nowrap text-texto figures-tabular lg:text-[26px]">
        {value}
      </span>
      <span className="flex items-end justify-between gap-2">
        {card.note && card.value === null ? (
          <span className="text-xs leading-snug text-texto-inativo">{card.note}</span>
        ) : (
          <span className="flex min-w-0 flex-col gap-0.5">
            <DeltaIndicator change={card.change} polarity={def.polarity} />
            {card.note ? <span className="text-xs text-texto-inativo">{card.note}</span> : null}
          </span>
        )}
        {/* 60px fits next to the delta in a 2-column card at 360px wide. */}
        <Sparkline values={card.series.map((p) => p.current)} width={60} className="shrink-0" />
      </span>
    </button>
  );
}
