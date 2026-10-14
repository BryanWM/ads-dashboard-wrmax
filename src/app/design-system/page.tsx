import type { Metadata } from "next";

import { SimulatedDataBadge } from "@/components/feedback/simulated-data-badge";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Separator } from "@/components/ui/separator";

import { ControlsDemo } from "./_components/controls-demo";
import { DataDemo } from "./_components/data-demo";
import { Foundations } from "./_components/foundations";
import { MetricWindowDemo } from "./_components/metric-window-demo";
import { StatesDemo } from "./_components/states-demo";

// Internal reference page. Will be restricted to platform admins in Phase 5.
export const metadata: Metadata = {
  title: "Design system",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-linha surface-glass">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <BrandLogo width={96} />
          <Separator orientation="vertical" className="h-4 bg-linha" />
          <span className="truncate etiqueta text-texto-apagado">Design system</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:px-6">
        <div className="space-y-3">
          <SimulatedDataBadge />
          <p className="text-ouro etiqueta">WRMax Design System</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-texto">
            Catálogo de componentes
          </h1>
          <p className="max-w-2xl text-texto-apagado">
            Os tokens, as primitivas e os padrões de interação do produto, aplicando o WRMax Design
            System. Todos os números desta página são simulados.
          </p>
        </div>
        <Foundations />
        <DataDemo />
        <MetricWindowDemo />
        <ControlsDemo />
        <StatesDemo />
      </main>
    </div>
  );
}
