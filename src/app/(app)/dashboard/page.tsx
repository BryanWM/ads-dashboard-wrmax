import type { Metadata } from "next";
import { Suspense } from "react";

import { NoAdAccountsState, NoClientsState } from "@/components/feedback/no-client-state";
import {
  PartialPeriodNote,
  SyncFailureAlert,
  SyncStatusLine,
} from "@/components/feedback/sync-status";
import { CompareToggle, PeriodPicker } from "@/components/filters/period-picker";
import { scopedHref } from "@/components/layout/nav-config";
import { PageHeader } from "@/components/layout/page-header";
import { isAgencyMember } from "@/lib/domain/access";
import { resolveClientContext } from "@/server/data/context";

import { DashboardSkeleton } from "./_components/dashboard-skeleton";
import { KpiGrid } from "./_components/kpi-grid";
import { ResultTypesCard } from "./_components/result-types-card";
import { TopCampaignsCard } from "./_components/top-campaigns-card";
import { TrendPanel } from "./_components/trend-panel";

export const metadata: Metadata = { title: "Visão geral" };

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const params = await searchParams;
  const { client, selection, today, source, viewer } = await resolveClientContext(params);
  if (!client) return <NoClientsState />;
  const audience = isAgencyMember(viewer) ? "agency" : "client";

  const [data, campaigns] = await Promise.all([
    source.getDashboard(client.id, selection),
    source.getCampaigns(client.id, selection),
  ]);
  if (!data || !campaigns) return <NoClientsState />;

  const campaignsHref = scopedHref(
    { href: "/campaigns", keep: "period" },
    new URLSearchParams(
      Object.entries(params).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
    ),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Visão geral"
        title={client.name}
        description={<SyncStatusLine sync={data.sync} timeZone={client.timezone} />}
        actions={
          <>
            <CompareToggle compare={selection.compare} />
            <PeriodPicker preset={selection.preset} range={selection.range} today={today} />
          </>
        }
      />

      {client.adAccountCount === 0 ? (
        <NoAdAccountsState clientName={client.name} clientId={client.id} audience={audience} />
      ) : (
        <>
          <SyncFailureAlert sync={data.sync} timeZone={client.timezone} audience={audience} />
          <div className="space-y-3">
            <KpiGrid data={data} compare={selection.compare} />
            <PartialPeriodNote
              partial={data.partial}
              compare={selection.compare}
              dataThrough={data.sync.dataThrough}
              comparisonRange={data.comparisonRange}
            />
          </div>
          <TrendPanel data={data} compare={selection.compare} />
          <div className="grid gap-6 lg:grid-cols-2">
            <TopCampaignsCard
              campaigns={campaigns.campaigns}
              currency={client.currency}
              href={campaignsHref}
            />
            <ResultTypesCard resultTypes={data.current.resultTypes} currency={client.currency} />
          </div>
        </>
      )}
    </div>
  );
}
