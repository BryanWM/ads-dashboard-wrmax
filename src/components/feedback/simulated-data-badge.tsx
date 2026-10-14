import { cn } from "@/lib/utils";

import { StatusDot } from "./status-dot";

/**
 * Mandatory marker for any view that shows non-Meta (demo) data.
 * See CLAUDE.md: simulated data must never look like real platform data.
 * - "all": every number on screen is simulated (demo mode, or a demo client's page).
 * - "some": the screen mixes real and demo records (admin lists).
 */
export function SimulatedDataBadge({
  scope = "all",
  className,
}: {
  scope?: "all" | "some";
  className?: string;
}) {
  return (
    <span
      role="status"
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-2 rounded-chip border border-linha-2 bg-superficie px-2.5 text-xs font-medium whitespace-nowrap text-texto",
        className,
      )}
    >
      <StatusDot tone="atencao" />
      {scope === "all" ? (
        <span>
          Dados simulados<span className="hidden sm:inline"> — não são dados reais da Meta</span>
        </span>
      ) : (
        <span>
          Inclui dados simulados
          <span className="hidden sm:inline"> — clientes de demonstração</span>
        </span>
      )}
    </span>
  );
}
