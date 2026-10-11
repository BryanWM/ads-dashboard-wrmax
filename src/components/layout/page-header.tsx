import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** Mono section label in caps (WRMax DS · etiqueta), e.g. "Visão geral". */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Controls such as the period picker. */
  actions?: ReactNode;
  className?: string;
}

/** WRMax DS · cabeçalho de seção: etiqueta mono, título Sora, linha de apoio, ações à direita. */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <p className="text-ouro etiqueta">{eyebrow}</p> : null}
        <h1 className="font-display text-2xl leading-tight font-bold tracking-tight text-balance text-texto">
          {title}
        </h1>
        {description ? <div className="text-[13px] text-texto-apagado">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
