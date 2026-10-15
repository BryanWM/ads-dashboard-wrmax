"use client";

import { CalendarDaysIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ptBR } from "react-day-picker/locale";

import { useNavigationPending } from "@/components/layout/navigation-pending";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isoToLocalDate, localDateToIso } from "@/lib/dates/local-date";
import { withPeriod } from "@/lib/dates/period-params";
import { dayMonth, weekdayName } from "@/lib/reports/report-period";
import { cn } from "@/lib/utils";

/** "Um dia": one tap on the calendar picks the report day (e.g. "resumo de quarta"). */
export function ReportDayPicker({
  day,
  active,
  today,
}: {
  /** Day shown/selected in the calendar. */
  day: string;
  /** A specific day (other than yesterday) is the current period. */
  active: boolean;
  today: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate, isPending } = useNavigationPending();
  const [open, setOpen] = useState(false);
  const label = active ? `${weekdayName(day)}, ${dayMonth(day)}` : "Um dia";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn("h-11 flex-1 lg:h-9", active && "chip-ouro")}
            aria-label={active ? `Dia do relatório: ${label}. Escolher outro` : "Escolher um dia"}
          />
        }
        data-pending={isPending || undefined}
      >
        <CalendarDaysIcon data-icon="inline-start" />
        {label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={ptBR}
          selected={isoToLocalDate(day)}
          defaultMonth={isoToLocalDate(day)}
          disabled={{ after: isoToLocalDate(today) }}
          onSelect={(date) => {
            if (!date) return;
            const iso = localDateToIso(date);
            setOpen(false);
            navigate(
              `${pathname}?${withPeriod(searchParams, { range: { from: iso, to: iso } }).toString()}`,
            );
          }}
          className="bg-transparent"
        />
      </PopoverContent>
    </Popover>
  );
}
