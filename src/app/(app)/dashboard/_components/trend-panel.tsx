"use client";

import { useState } from "react";

import { MetricTrendChart, type TrendPoint } from "@/components/charts/metric-trend-chart";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SegmentedControl } from "@/components/filters/segmented-control";
import type { DashboardData } from "@/lib/domain/types";
import { formatDateRange } from "@/lib/format";
import { METRICS, type MetricKey } from "@/lib/metrics/definitions";
import { deriveMetrics, type DailyComponents } from "@/lib/metrics/derive";

type TrendMetric = Extract<
  MetricKey,
  "spend" | "results" | "linkClicks" | "impressions" | "linkCtr" | "linkCpc" | "cpm"
>;

const OPTIONS: TrendMetric[] = [
  "spend",
  "results",
  "linkClicks",
  "impressions",
  "linkCtr",
  "linkCpc",
  "cpm",
];

function dayValue(day: DailyComponents | null, metric: TrendMetric): number | null {
  if (!day) return null;
  // A day's rates come from that day's own components.
  return deriveMetrics({ ...day, mixedResultTypes: false, rowCount: 1 })[metric];
}

export function TrendPanel({ data, compare }: { data: DashboardData; compare: boolean }) {
  // Daily results only make sense when every campaign shares one result type.
  const options = OPTIONS.filter(
    (m) =>
      m !== "results" ||
      (!data.current.metrics.mixedResultTypes && data.current.metrics.resultIndicator !== null),
  );
  const [metric, setMetric] = useState<TrendMetric>("spend");
  // The chart only animates in answer to the person's choice (WRMax DS).
  const [interacted, setInteracted] = useState(false);

  const points: TrendPoint[] = data.daily.map((d) => ({
    date: d.date,
    current: dayValue(d.current, metric),
    previous: dayValue(d.previous, metric),
  }));

  return (
    <Card>
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1">
          <CardTitle>Evolução diária · {METRICS[metric].label}</CardTitle>
          <CardDescription>
            {formatDateRange(data.range)}
            {compare ? ` vs. ${formatDateRange(data.previousRange)}` : null}
          </CardDescription>
        </div>
        <CardAction className="col-span-full row-start-auto justify-self-start sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:justify-self-end">
          <SegmentedControl
            aria-label="Métrica do gráfico"
            value={metric}
            onChange={(m) => {
              setMetric(m);
              setInteracted(true);
            }}
            options={options.map((m) => ({ value: m, label: METRICS[m].label }))}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        <MetricTrendChart
          metric={metric}
          data={points}
          currency={data.client.currency}
          showComparison={compare}
          animate={interacted}
        />
      </CardContent>
    </Card>
  );
}
