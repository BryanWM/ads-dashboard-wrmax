import type { SyncHealth } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

import { StatusDot, type StatusTone } from "./status-dot";

const CONFIG: Record<SyncHealth, { label: string; tone: StatusTone }> = {
  ok: { label: "Atualizado", tone: "ok" },
  stale: { label: "Desatualizado", tone: "atencao" },
  failing: { label: "Com falha", tone: "erro" },
  never: { label: "Nunca sincronizado", tone: "neutro" },
};

/** Status as dot + neutral text (WRMax DS), never a coloured pill. */
export function HealthBadge({
  health,
  label,
  className,
}: {
  health: SyncHealth;
  label?: string;
  className?: string;
}) {
  const { label: defaultLabel, tone } = CONFIG[health];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[13px] whitespace-nowrap text-texto",
        className,
      )}
    >
      <StatusDot tone={tone} />
      {label ?? defaultLabel}
    </span>
  );
}
