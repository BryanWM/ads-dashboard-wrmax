"use client";

import { motion } from "motion/react";
import { useId } from "react";

import { PILL } from "@/components/motion/presets";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  /** null = no option active (e.g. a custom period chosen elsewhere). */
  value: T | null;
  onChange: (value: T) => void;
  "aria-label": string;
  /** "lg" = 44px targets (touch-first screens). */
  size?: "md" | "lg";
  /** Stretch options to equal widths across the container. */
  fill?: boolean;
  className?: string;
}

/** WRMax DS · pílula deslizante: gold glass indicator behind the active option. */
export const PILL_CLASS =
  "absolute inset-0 rounded-chip border border-[rgba(232,199,122,0.42)] bg-[linear-gradient(180deg,rgba(232,199,122,0.2),rgba(232,199,122,0.08))] shadow-[0_8px_24px_-8px_rgba(201,151,58,0.45),inset_0_1px_0_rgba(255,240,205,0.18)]";

/**
 * Tabs/filters with the WRMax sliding pill (Animações §1). The pill moves with
 * the macOS curve in 0.7s; the active label fades from texto-inativo to texto.
 * Buttons expose aria-pressed, as the DS NavbarSetores does.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  fill = false,
  className,
  ...aria
}: SegmentedControlProps<T>) {
  const layoutId = useId();

  return (
    <div
      role="group"
      aria-label={aria["aria-label"]}
      className={cn(
        "relative max-w-full items-center gap-0.5 rounded-lg border border-linha bg-[rgba(10,9,7,0.6)] p-1",
        fill ? "flex w-full" : "inline-flex flex-wrap",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => !active && onChange(option.value)}
            className={cn(
              "relative rounded-chip px-3 font-semibold whitespace-nowrap text-texto-inativo transition-colors duration-[450ms] outline-none hover:text-texto-apagado focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dourado",
              size === "lg" ? "h-11 text-sm" : "h-8 text-[13px]",
              fill && "min-w-0 flex-1 px-2",
              active && "text-texto hover:text-texto",
            )}
          >
            {active ? (
              <motion.span
                layoutId={`segment-pill-${layoutId}`}
                transition={PILL}
                aria-hidden
                className={PILL_CLASS}
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
