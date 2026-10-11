"use client";

import { useReducedMotion } from "motion/react";
import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMetricValue } from "@/lib/format";
import { METRICS, type MetricKey } from "@/lib/metrics/definitions";
import { cn } from "@/lib/utils";

export interface TrendPoint {
  /** ISO date of the current period (account timezone). */
  date: string;
  current: number | null;
  /** Same day-offset in the previous equivalent period. */
  previous?: number | null;
}

interface MetricTrendChartProps {
  metric: MetricKey;
  data: TrendPoint[];
  currency: string;
  showComparison?: boolean;
  /**
   * Draw-in animation. WRMax DS: nothing moves by itself when a page opens, so
   * callers enable it only after the person interacts (e.g. picks a metric).
   */
  animate?: boolean;
  className?: string;
}

const dayMonth = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});
const fullDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" });
const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

/**
 * Daily evolution of one metric. Single y-axis only; the previous period is a
 * darker warm gray (--chart-previous), the current period the brand gold accent;
 * they differ by lightness (validated for colour-vision deficiency).
 * Missing days render as gaps, never as zero.
 */
export function MetricTrendChart({
  metric,
  data,
  currency,
  showComparison = false,
  animate = false,
  className,
}: MetricTrendChartProps) {
  const reduceMotion = useReducedMotion();
  const animated = animate && !reduceMotion;
  const def = METRICS[metric];
  const format = (v: number) => formatMetricValue(v, def.format, { currency });
  const formatTick = (v: number) => formatMetricValue(v, def.format, { currency, compact: true });

  const config = {
    current: { label: "Período atual", color: "var(--chart-1)" },
    previous: { label: "Período anterior", color: "var(--chart-previous)" },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className={cn("aspect-auto h-64 w-full", className)}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`fill-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-current)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--color-current)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={{ stroke: "var(--chart-axis)" }}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(d: string) => dayMonth.format(asDate(d))}
        />
        <YAxis
          width={64}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tickCount={4}
          tickFormatter={formatTick}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              indicator="line"
              valueFormatter={format}
              // Current period first, although it is drawn last (on top).
              seriesOrder={["current", "previous"]}
              labelFormatter={(_, payload) => {
                const iso = payload?.[0]?.payload?.date;
                return typeof iso === "string" ? fullDate.format(asDate(iso)) : null;
              }}
            />
          }
        />
        {showComparison ? (
          <Line
            dataKey="previous"
            type="monotone"
            stroke="var(--color-previous)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--superficie)" }}
            connectNulls={false}
            isAnimationActive={animated}
            animationDuration={500}
            animationEasing="ease-out"
          />
        ) : null}
        <Area
          dataKey="current"
          type="monotone"
          stroke="var(--color-current)"
          strokeWidth={2}
          fill={`url(#fill-${metric})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--superficie)" }}
          connectNulls={false}
          isAnimationActive={animated}
          animationDuration={500}
          animationEasing="ease-out"
        />
        {showComparison ? <ChartLegend content={<ChartLegendContent />} /> : null}
      </AreaChart>
    </ChartContainer>
  );
}
