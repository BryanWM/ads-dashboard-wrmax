import type { ReactNode } from "react";

import { SimulatedDataBadge } from "@/components/feedback/simulated-data-badge";
import { SyncStatusLine } from "@/components/feedback/sync-status";
import { PeriodChips } from "@/components/filters/period-chips";
import { PeriodPicker } from "@/components/filters/period-picker";
import { isChipPreset } from "@/lib/dates/period-params";
import type { DateRange, PeriodPreset } from "@/lib/dates/periods";
import type { SyncStatus } from "@/lib/domain/types";

/**
 * Fixed, compact header: client name, when the data was last updated, the period
 * chips and the calendar for any other period. Sticks below the top bar (h-14) so
 * the period is one tap away.
 */
export function DashboardHeader({
  clientName,
  preset,
  range,
  today,
  sync,
  timeZone,
  simulated = false,
  accountFilter,
}: {
  clientName: string;
  preset: PeriodPreset | null;
  range: DateRange;
  /** Latest selectable day for the custom period (account timezone). */
  today: string;
  sync: SyncStatus | null;
  timeZone: string;
  /** This client's numbers are simulated (demo client in Supabase mode). */
  simulated?: boolean;
  /** Ad account selector (renders nothing for single-account clients). */
  accountFilter?: ReactNode;
}) {
  return (
    <header className="sticky top-14 z-10 -mx-4 flex flex-col gap-3 bg-fundo/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div className="min-w-0 space-y-0.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="truncate font-display text-xl leading-tight font-bold tracking-tight text-texto lg:text-2xl">
            {clientName}
          </h1>
          {simulated ? <SimulatedDataBadge /> : null}
        </div>
        {sync ? <SyncStatusLine sync={sync} timeZone={timeZone} className="text-xs" /> : null}
      </div>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        {accountFilter}
        <div className="flex items-center gap-2">
          <PeriodChips preset={preset} className="min-w-0 flex-1" />
          <PeriodPicker
            variant="chip"
            active={!isChipPreset(preset)}
            preset={preset}
            range={range}
            today={today}
          />
        </div>
      </div>
    </header>
  );
}
