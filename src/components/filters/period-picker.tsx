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
import { MAX_RANGE_DAYS, PRESET_LABELS, withPeriod } from "@/lib/dates/period-params";
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
}

// Calendar works with local Date objects; our ranges are calendar strings.
function toDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}
function toIso(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function PeriodPicker({ preset, range, today }: PeriodPickerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate, isPending } = useNavigationPending();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DayPickerRange | undefined>({
    from: toDate(range.from),
    to: toDate(range.to),
  });

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
        if (next) setDraft({ from: toDate(range.from), to: toDate(range.to) });
      }}
    >
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
              onSelect={setDraft}
              defaultMonth={draft?.from}
              disabled={{ after: toDate(today) }}
              className="bg-transparent"
            />
            <div className="flex items-center justify-between gap-3 border-t px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {draftTooLong
                  ? `Máximo de ${MAX_RANGE_DAYS} dias`
                  : draftRange
                    ? formatDateRange(draftRange)
                    : "Selecione início e fim"}
              </p>
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
