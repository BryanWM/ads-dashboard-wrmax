import type { Metadata } from "next";
import { Suspense } from "react";

import { NoAdAccountsState, NoClientsState } from "@/components/feedback/no-client-state";
import {
  PartialPeriodNote,
  SyncFailureAlert,
  SyncStatusLine,
} from "@/components/feedback/sync-status";
import { PeriodPicker } from "@/components/filters/period-picker";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { isAgencyMember } from "@/lib/domain/access";
import { formatDateRange } from "@/lib/format";
import { resolveClientContext } from "@/server/data/context";

import { CampaignsTable } from "./_components/campaigns-table";

export const metadata: Metadata = { title: "Campanhas" };

export default function CampaignsPage({ searchParams }: PageProps<"/campaigns">) {
  return (
    <Suspense fallback={<CampaignsSkeleton />}>
      <Campaigns searchParams={searchParams} />
    </Suspense>
  );
}

async function Campaigns({ searchParams }: Pick<PageProps<"/campaigns">, "searchParams">) {
  const { client, selection, today, source, viewer } = await resolveClientContext(
    await searchParams,
  );
  if (!client) return <NoClientsState />;
  const data = await source.getCampaigns(client.id, selection);
  if (!data) return <NoClientsState />;
  const audience = isAgencyMember(viewer) ? "agency" : "client";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relatório de campanhas"
        title="Campanhas"
        description={
          <div className="space-y-1">
            <p>
              {client.name} · {formatDateRange(selection.range)}
            </p>
            <SyncStatusLine sync={data.sync} timeZone={client.timezone} />
          </div>
        }
        actions={<PeriodPicker preset={selection.preset} range={selection.range} today={today} />}
      />
      {client.adAccountCount === 0 ? (
        <NoAdAccountsState clientName={client.name} clientId={client.id} audience={audience} />
      ) : (
        <>
          <SyncFailureAlert sync={data.sync} timeZone={client.timezone} audience={audience} />
          <PartialPeriodNote
            partial={data.partial}
            compare={false}
            dataThrough={data.sync.dataThrough}
            comparisonRange={data.comparisonRange}
          />
          <CampaignsTable campaigns={data.campaigns} currency={client.currency} />
        </>
      )}
    </div>
  );
}

function CampaignsSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Carregando campanhas">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-8 w-72 rounded-2xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
