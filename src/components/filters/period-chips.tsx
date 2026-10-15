"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { useNavigationPending } from "@/components/layout/navigation-pending";
import { CHIP_PRESETS, isChipPreset, withPeriod, type ChipPreset } from "@/lib/dates/period-params";
import type { PeriodPreset } from "@/lib/dates/periods";
import { cn } from "@/lib/utils";

import { SegmentedControl, type SegmentOption } from "./segmented-control";

const CHIP_LABELS: Record<ChipPreset, string> = {
  last_7d: "7 dias",
  last_30d: "30 dias",
  this_month: "Mês atual",
};
const CHIPS: SegmentOption<ChipPreset>[] = CHIP_PRESETS.map((value) => ({
  value,
  label: CHIP_LABELS[value],
}));

/** The three periods a client actually uses. Other ranges: the calendar button beside them. */
export function PeriodChips({
  preset,
  className,
}: {
  preset: PeriodPreset | null;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate } = useNavigationPending();
  const value = isChipPreset(preset) ? preset : null;

  return (
    <SegmentedControl
      aria-label="Período"
      size="lg"
      fill
      options={CHIPS}
      value={value}
      onChange={(next) => navigate(`${pathname}?${withPeriod(searchParams, { preset: next })}`)}
      className={cn("lg:w-auto", className)}
    />
  );
}
