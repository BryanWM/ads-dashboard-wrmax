"use client";

import { Line, LineChart, YAxis } from "recharts";

interface SparklineProps {
  values: readonly (number | null)[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Tiny trend line for a KPI card (dataviz: de-emphasis hue, no axes, no labels).
 * Fixed size so it never depends on layout measurement; static (WRMax DS:
 * nothing moves when the page opens). Missing days are gaps, never zero.
 */
export function Sparkline({ values, width = 84, height = 28, className }: SparklineProps) {
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) return null;
  const data = values.map((v, i) => ({ i, v }));

  return (
    <div aria-hidden className={className}>
      <LineChart
        width={width}
        height={height}
        data={data}
        margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
      >
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line
          dataKey="v"
          type="monotone"
          stroke="var(--dourado)"
          strokeOpacity={0.85}
          strokeWidth={1.5}
          dot={false}
          connectNulls={false}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  );
}
