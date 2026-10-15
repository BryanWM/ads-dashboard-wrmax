"use client";

import { CalendarIcon, CheckIcon, ChevronDownIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";

import { useNavigationPending } from "@/components/layout/navigation-pending";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { isoToLocalDate, localDateToIso } from "@/lib/dates/local-date";
import { MAX_RANGE_DAYS, PRESET_LABELS, withPeriod } from "@/lib/dates/period-params";
import { pickDay, type PickStep } from "@/lib/dates/range-picking";
import {
  PERIOD_PRESETS,
  rangeLength,
  type DateRange,
  type PeriodPreset,
} from "@/lib/dates/periods";
import { formatDateRange } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PeriodPickerProps {
  preset: PeriodPreset | null;
  range: DateRange;
  /** Latest selectable day (account timezone). */
  today: string;
  /**
   * "chip": calendar button beside the period chips (overview header). Icon only while
   * a chip is selected; gold glass + the range (from `lg`) when a custom period is on.
   */
  variant?: "default" | "chip";
  /** chip variant: the current period is NOT one of the chips. */
  active?: boolean;
}

// Calendar works with local Date objects; our ranges are calendar strings.
const toDate = isoToLocalDate;
const toIso = localDateToIso;

export function PeriodPicker({
  preset,
  range,
  today,
  variant = "default",
  active = false,
}: PeriodPickerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate, isPending } = useNavigationPending();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayPickerRange | undefined>({
    from: toDate(range.from),
    to: toDate(range.to),
  });
  // 1st tap = end date, 2nd tap = start date (src/lib/dates/range-picking.ts).
  const [step, setStep] = useState<PickStep>("end");

  function pick(day: Date) {
    const { range: next, next: nextStep } = pickDay(draft, day, step);
    setDraft(next);
    setStep(nextStep);
  }

  const draftRange =
    draft?.from && draft.to ? { from: toIso(draft.from), to: toIso(draft.to) } : null;
  const draftTooLong = draftRange ? rangeLength(draftRange) > MAX_RANGE_DAYS : false;

  function go(next: Parameters<typeof withPeriod>[1]) {
    setOpen(false);
    navigate(`${pathname}?${withPeriod(searchParams, next).toString()}`);
  }

  const label = preset ? PRESET_LABELS[preset] : formatDateRange(range);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDraft({ from: toDate(range.from), to: toDate(range.to) });
          setStep("end");
        }
      }}
    >
      {variant === "chip" ? (
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn("h-11 shrink-0 px-3.5 lg:h-9", active && "chip-ouro")}
              aria-label={active ? `Período: ${label}. Escolher outro` : "Escolher outro período"}
            />
          }
          data-pending={isPending || undefined}
        >
          <CalendarIcon />
          {active ? <span className="hidden max-w-48 truncate lg:inline">{label}</span> : null}
        </PopoverTrigger>
      ) : (
        <PopoverTrigger
          render={
            <Button variant="outline" className="h-11 lg:h-9" aria-label={`Período: ${label}`} />
          }
          data-pending={isPending || undefined}
        >
          <CalendarIcon data-icon="inline-start" />
          <span className="max-w-48 truncate">{label}</span>
          <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
        </PopoverTrigger>
      )}
      <PopoverContent align="end" className="w-auto max-w-[calc(100vw-2rem)] p-0">
        <div className="flex flex-col sm:flex-row">
          <ul className="flex flex-row flex-wrap gap-1 border-b p-2 sm:w-44 sm:flex-col sm:border-r sm:border-b-0">
            {PERIOD_PRESETS.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => go({ preset: p })}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                    p === preset && "font-medium",
                  )}
                  aria-pressed={p === preset}
                >
                  {PRESET_LABELS[p]}
                  {p === preset ? <CheckIcon className="size-4 text-dourado" aria-hidden /> : null}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-col">
            <Calendar
              mode="range"
              locale={ptBR}
              numberOfMonths={isMobile ? 1 : 2}
              selected={draft}
              // DayPicker's own range logic is replaced by ours; the tapped day is enough.
              onSelect={(_range, day) => pick(day)}
              defaultMonth={draft?.from}
              disabled={{ after: toDate(today) }}
              className="bg-transparent"
            />
            <div className="flex items-center justify-between gap-3 border-t px-3 py-2">
              <div className="space-y-0.5 text-xs" aria-live="polite">
                <p className="text-texto figures-tabular">
                  {draftTooLong
                    ? `Máximo de ${MAX_RANGE_DAYS} dias`
                    : draftRange
                      ? formatDateRange(draftRange)
                      : "Selecione o período"}
                </p>
                <p className="text-muted-foreground">
                  {step === "end" ? "Toque na data final" : "Agora toque na data inicial"}
                </p>
              </div>
              <Button
                size="sm"
                disabled={!draftRange || draftTooLong}
                onClick={() => draftRange && go({ range: draftRange })}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CompareToggle({ compare }: { compare: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate } = useNavigationPending();

  return (
    <div className="flex items-center gap-2">
      <Switch
        id="compare-toggle"
        checked={compare}
        onCheckedChange={(checked) => {
          const params = new URLSearchParams(searchParams);
          if (checked) params.delete("compare");
          else params.set("compare", "0");
          navigate(`${pathname}?${params.toString()}`);
        }}
      />
      <Label htmlFor="compare-toggle" className="text-sm font-normal text-muted-foreground">
        Comparar com período anterior
      </Label>
    </div>
  );
}
