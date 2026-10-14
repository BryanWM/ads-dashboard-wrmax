import { cn } from "@/lib/utils";

export type StatusTone = "ok" | "atencao" | "erro" | "neutro";

const TONE: Record<StatusTone, string> = {
  ok: "bg-success shadow-[0_0_0_3px_color-mix(in_srgb,var(--ok)_14%,transparent)]",
  atencao: "bg-warning shadow-[0_0_0_3px_color-mix(in_srgb,var(--atencao)_14%,transparent)]",
  erro: "bg-critical shadow-[0_0_0_3px_color-mix(in_srgb,var(--erro)_14%,transparent)]",
  neutro: "bg-texto-inativo",
};

/** WRMax DS: status is always a coloured dot next to NEUTRAL text. */
export function StatusDot({ tone, className }: { tone: StatusTone; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-1.5 shrink-0 rounded-full", TONE[tone], className)}
    />
  );
}
