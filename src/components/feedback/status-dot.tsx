import { cn } from "@/lib/utils";

export type StatusTone = "ok" | "atencao" | "erro" | "neutro";

const TONE: Record<StatusTone, string> = {
  ok: "bg-success shadow-[0_0_0_3px_rgba(111,211,155,0.14)]",
  atencao: "bg-warning shadow-[0_0_0_3px_rgba(231,180,90,0.14)]",
  erro: "bg-critical shadow-[0_0_0_3px_rgba(255,107,138,0.14)]",
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
