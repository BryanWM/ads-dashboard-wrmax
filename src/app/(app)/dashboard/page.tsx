import type { Metadata } from "next";
import { Suspense } from "react";

import { NoAdAccountsState, NoClientsState } from "@/components/feedback/no-client-state";
import { SyncFailureAlert } from "@/components/feedback/sync-status";
import { isAgencyMember } from "@/lib/domain/access";
import { isDemoMode } from "@/server/auth/session";
import { resolveClientContext } from "@/server/data/context";

import { DashboardHeader } from "./_components/dashboard-header";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";
import { Overview } from "./_components/overview/overview";

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

  return (
    <div className="space-y-5">
      <DashboardHeader
        clientName={client.name}
        preset={selection.preset}
        sync={data.sync}
        timeZone={client.timezone}
        // Demo mode already badges the whole app in the top bar.
        simulated={data.origin === "simulated" && !isDemoMode()}
      />
      {client.adAccountCount === 0 ? (
        <NoAdAccountsState clientName={client.name} clientId={client.id} audience={audience} />
      ) : (
        <>
          <SyncFailureAlert sync={data.sync} timeZone={client.timezone} audience={audience} />
          <Overview
            data={data}
            campaigns={campaigns.campaigns}
            preset={selection.preset}
            today={today}
          />
        </>
      )}
    </div>
  );
}
