import { CircleAlertIcon, ClockIcon, InfoIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { SyncHealth, SyncStatus } from "@/lib/domain/types";
import { formatCalendarDate, formatDateRange, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

import { StatusDot, type StatusTone } from "./status-dot";

const TONE: Record<SyncHealth, StatusTone> = {
  ok: "ok",
  stale: "atencao",
  failing: "erro",
  never: "neutro",
};

/** "Atualizado em 10/10/2026, 06:12 · dados até 09/10/2026" — always visible to clients. */
export function SyncStatusLine({
  sync,
  timeZone,
  className,
}: {
  sync: SyncStatus;
  timeZone: string;
  className?: string;
}) {
  return (
    <p className={cn("flex items-center gap-2 text-[13px] text-texto-apagado", className)}>
      <StatusDot tone={TONE[sync.health]} />
      {sync.lastSuccessAt ? (
        <span>
          Atualizado em{" "}
          <time dateTime={sync.lastSuccessAt}>{formatDateTime(sync.lastSuccessAt, timeZone)}</time>
          {sync.dataThrough ? <> · dados até {formatCalendarDate(sync.dataThrough)}</> : null}
        </span>
      ) : (
        <span>Ainda não sincronizado</span>
      )}
    </p>
  );
}

/** Explains a day-for-day comparison when the period is only partially synced. */
export function PartialPeriodNote({
  partial,
  compare,
  dataThrough,
  comparisonRange,
}: {
  partial: boolean;
  compare: boolean;
  dataThrough: string | null;
  comparisonRange: { from: string; to: string };
}) {
  if (!partial || !dataThrough) return null;
  return (
    <p className="flex items-start gap-1.5 text-[13px] text-texto-apagado">
      <InfoIcon className="mt-0.5 size-3.5 shrink-0 text-dourado" aria-hidden />
      <span>
        Período parcial: há dados até {formatCalendarDate(dataThrough)}.
        {compare
          ? ` Para uma comparação justa, as variações usam o mesmo número de dias do período anterior (${formatDateRange(comparisonRange)}).`
          : null}
      </span>
    </p>
  );
}

/**
 * Shown when the latest sync failed: explains that the data is the last valid set.
 * The agency sees the technical cause; clients get a plain-language notice.
 * WRMax DS: neutral surface; only the icon carries the status colour.
 */
export function SyncFailureAlert({
  sync,
  timeZone,
  audience,
}: {
  sync: SyncStatus;
  timeZone: string;
  audience: "agency" | "client";
}) {
  if (sync.health !== "failing") return null;
  const since = sync.lastSuccessAt ? formatDateTime(sync.lastSuccessAt, timeZone) : null;

  if (audience === "client") {
    return (
      <Alert className="border-linha bg-superficie">
        <ClockIcon className="text-warning" />
        <AlertTitle>Os dados mais recentes ainda não chegaram</AlertTitle>
        <AlertDescription className="text-texto-apagado">
          {since
            ? `Você está vendo os números atualizados em ${since}. `
            : "Ainda não há dados atualizados. "}
          A atualização é tentada novamente de forma automática.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-linha bg-superficie">
      <CircleAlertIcon className="text-critical" />
      <AlertTitle>A última atualização falhou</AlertTitle>
      <AlertDescription className="text-texto-apagado">
        {sync.lastError ?? "Erro ao consultar a plataforma de anúncios."} Exibindo os últimos dados
        válidos{since ? `, sincronizados em ${since}` : ""}.
      </AlertDescription>
    </Alert>
  );
}
