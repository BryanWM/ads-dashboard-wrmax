"use client";

import { motion } from "motion/react";
import { useState } from "react";

import { MetricTrendChart } from "@/components/charts/metric-trend-chart";
import { SegmentedControl, type SegmentOption } from "@/components/filters/segmented-control";
import { DURATION, EASE_MAC } from "@/components/motion/presets";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { PeriodPreset } from "@/lib/dates/periods";
import type { CampaignRow, DashboardData } from "@/lib/domain/types";
import { buildOverview, type CardMetric } from "@/lib/overview/model";
import { cn } from "@/lib/utils";

import { AdsChampions } from "./ads-champions";
import { DetailsPanel } from "./details-panel";
import { FunnelBars } from "./funnel-bars";
import { MetricSheet } from "./metric-sheet";
import { OverviewCard } from "./overview-card";
import { SummaryBanner } from "./summary-banner";

type Tab = "funil" | "anuncios" | "detalhes";

const TABS: SegmentOption<Tab>[] = [
  { value: "funil", label: "Funil" },
  { value: "anuncios", label: "Anúncios" },
  { value: "detalhes", label: "Detalhes" },
];

interface OverviewProps {
  data: DashboardData;
  campaigns: CampaignRow[];
  preset: PeriodPreset | null;
  today: string;
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4 rounded-2xl bg-superficie/60 p-5", className)}>
      <h2 className="font-display text-base font-semibold text-texto">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Overview, mobile-first: summary → 4 numbers → tabs (Funil · Anúncios · Detalhes).
 * From `lg` it becomes a bento grid: summary, 4 numbers, main chart, funnel and
 * champions visible at once; details below. Layout is CSS-only (no shift).
 */
export function Overview({ data, campaigns, preset, today }: OverviewProps) {
  const model = buildOverview(data, preset);
  const [openMetric, setOpenMetric] = useState<CardMetric | null>(null);
  const [tab, setTab] = useState<Tab>("funil");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const currency = data.client.currency;
  const resultsCard = model.cards[1]!;

  const funnel = <FunnelBars steps={model.funnel} />;
  const championsProps = {
    ads: data.ads,
    campaigns,
    indicator: model.primary.indicator,
    currency,
  };
  const champions = <AdsChampions {...championsProps} />;
  const details = <DetailsPanel data={data} model={model} preset={preset} today={today} />;

  return (
    <div className="grid gap-5 lg:grid-cols-4 lg:gap-4">
      <SummaryBanner
        model={model}
        currency={currency}
        goal={data.client.costPerResultGoal}
        className="lg:col-span-4"
      />

      <div className="grid grid-cols-2 gap-3 lg:col-span-4 lg:grid-cols-4 lg:gap-4">
        {model.cards.map((card) => (
          <OverviewCard
            key={card.metric}
            card={card}
            currency={currency}
            onOpen={() => setOpenMetric(card.metric)}
          />
        ))}
      </div>

      {/* Desktop bento row: main chart + funnel + champions. */}
      <Panel title={`${resultsCard.label} por dia`} className="hidden lg:col-span-2 lg:block">
        <div className="h-64">
          {isDesktop ? (
            <MetricTrendChart
              metric="results"
              data={resultsCard.series}
              currency={currency}
              showComparison={resultsCard.series.some((p) => p.previous !== null)}
              className="h-64"
            />
          ) : null}
        </div>
      </Panel>
      <Panel title="Funil" className="hidden lg:block">
        {funnel}
      </Panel>
      <Panel title="Campeões" className="hidden min-w-0 lg:block">
        <AdsChampions {...championsProps} compact />
      </Panel>
      <Panel title="Detalhes" className="hidden lg:col-span-4 lg:block">
        {details}
      </Panel>

      {/* Phones and tablets: one area, content swaps in place. */}
      <section className="space-y-4 lg:hidden" aria-label="Mais informações">
        <SegmentedControl
          aria-label="Seções"
          size="lg"
          fill
          options={TABS}
          value={tab}
          onChange={setTab}
        />
        {/*
          Content swaps immediately; only the entrance is animated. (An exit-then-enter
          sequence would make the content wait for an animation frame to change.)
        */}
        {/* Opacity only: a sideways slide would briefly widen the page on phones. */}
        <motion.div
          key={tab}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1, transition: { duration: DURATION.fade, ease: EASE_MAC } }}
          className="min-w-0"
        >
          {tab === "funil" ? funnel : tab === "anuncios" ? champions : details}
        </motion.div>
      </section>

      <MetricSheet
        card={model.cards.find((c) => c.metric === openMetric) ?? null}
        model={model}
        data={data}
        onClose={() => setOpenMetric(null)}
      />
    </div>
  );
}
