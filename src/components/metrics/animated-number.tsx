"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

import { DURATION, EASE_MAC } from "@/components/motion/presets";
import { formatMetricValue, MISSING, type FormatOptions } from "@/lib/format";
import type { MetricFormat } from "@/lib/metrics/definitions";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps extends FormatOptions {
  value: number | null;
  format: MetricFormat;
  className?: string;
}

/**
 * Shows the value immediately on first render (WRMax DS: nothing moves by itself
 * when a page opens) and tweens only when it changes — i.e. after the person
 * picks another period or client. Screen readers get only the final value;
 * tabular figures keep the width stable while digits change.
 */
export function AnimatedNumber({ value, format, className, ...options }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(value ?? 0);
  const display = useTransform(motionValue, (v) =>
    formatMetricValue(format === "integer" ? Math.round(v) : v, format, options),
  );
  const previous = useRef(value);

  useEffect(() => {
    if (value === null || previous.current === value) return;
    previous.current = value;
    if (reduceMotion) {
      motionValue.jump(value);
      return;
    }
    const controls = animate(motionValue, value, { duration: DURATION.swap, ease: EASE_MAC });
    return () => controls.stop();
  }, [value, reduceMotion, motionValue]);

  if (value === null) {
    return <span className={cn("figures-tabular", className)}>{MISSING}</span>;
  }

  return (
    <span className={cn("figures-tabular", className)}>
      <motion.span aria-hidden>{display}</motion.span>
      <span className="sr-only">{formatMetricValue(value, format, options)}</span>
    </span>
  );
}
