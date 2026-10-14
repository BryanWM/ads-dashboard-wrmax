"use client";

import { useState } from "react";

import { MetricSheet } from "@/app/(app)/dashboard/_components/overview/metric-sheet";
import { Button } from "@/components/ui/button";
import { parsePeriodSelection } from "@/lib/dates/period-params";
import { todayInTimeZone } from "@/lib/dates/periods";
import type { DashboardData } from "@/lib/domain/types";
import { buildOverview, type OverviewModel } from "@/lib/overview/model";
import { buildDashboard, findClient } from "@/server/data/simulated/build";
import { SIM_TIMEZONE } from "@/server/data/simulated/catalog";

import { CatalogSection } from "./section";

interface Opened {
  data: DashboardData;
  model: OverviewModel;
  index: number;
}

/**
 * The real metric details component with simulated data (built on click, so the
 * static page never depends on today's date).
 */
export function MetricWindowDemo() {
  const [opened, setOpened] = useState<Opened | null>(null);

  function open(index: number) {
    const now = new Date();
    const today = todayInTimeZone(SIM_TIMEZONE, now);
    const selection = parsePeriodSelection({ period: "last_30d" }, today);
    const data = buildDashboard(findClient("demo-pizzaria")!, selection, { now, today });
    setOpened({ data, model: buildOverview(data, selection.preset), index });
  }

  return (
    <CatalogSection
      id="detalhes"
      title="Detalhes de um número"
      description="Toque num card da visão geral: janela estilo macOS no desktop, gaveta inferior no celular."
    >
      <div className="flex flex-wrap gap-2">
        {["Investimento", "Resultado principal", "Custo por resultado", "Retorno"].map(
          (label, i) => (
            <Button key={label} variant="outline" onClick={() => open(i)}>
              {label}
            </Button>
          ),
        )}
      </div>
      {opened ? (
        <MetricSheet
          card={opened.model.cards[opened.index] ?? null}
          model={opened.model}
          data={opened.data}
          onClose={() => setOpened(null)}
        />
      ) : null}
    </CatalogSection>
  );
}
