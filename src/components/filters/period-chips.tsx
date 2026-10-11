"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { useNavigationPending } from "@/components/layout/navigation-pending";
import { withPeriod } from "@/lib/dates/period-params";
import type { PeriodPreset } from "@/lib/dates/periods";
import { cn } from "@/lib/utils";

import { SegmentedControl, type SegmentOption } from "./segmented-control";

type ChipPreset = Extract<PeriodPreset, "last_7d" | "last_30d" | "this_month">;

const CHIPS: SegmentOption<ChipPreset>[] = [
  { value: "last_7d", label: "7 dias" },
  { value: "last_30d", label: "30 dias" },
  { value: "this_month", label: "Mês atual" },
];

/** The three periods a client actually uses. Other ranges live in "Detalhes". */
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
  const value = CHIPS.some((c) => c.value === preset) ? (preset as ChipPreset) : null;

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
