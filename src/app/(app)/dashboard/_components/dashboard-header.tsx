import { SimulatedDataBadge } from "@/components/feedback/simulated-data-badge";
import { SyncStatusLine } from "@/components/feedback/sync-status";
import { PeriodChips } from "@/components/filters/period-chips";
import type { PeriodPreset } from "@/lib/dates/periods";
import type { SyncStatus } from "@/lib/domain/types";

/**
 * Fixed, compact header: client name, when the data was last updated, and the
 * period chips. Sticks below the top bar (h-14) so the period is one tap away.
 */
export function DashboardHeader({
  clientName,
  preset,
  sync,
  timeZone,
  simulated = false,
}: {
  clientName: string;
  preset: PeriodPreset | null;
  sync: SyncStatus | null;
  timeZone: string;
  /** This client's numbers are simulated (demo client in Supabase mode). */
  simulated?: boolean;
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
      <PeriodChips preset={preset} />
    </header>
  );
}
