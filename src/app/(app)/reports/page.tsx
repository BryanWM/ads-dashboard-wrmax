import type { Metadata } from "next";
import { Suspense } from "react";

import { NoAdAccountsState, NoClientsState } from "@/components/feedback/no-client-state";
import { SimulatedDataBadge } from "@/components/feedback/simulated-data-badge";
import { SyncStatusLine } from "@/components/feedback/sync-status";
import { AccountFilter } from "@/components/filters/account-filter";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { isAgencyMember } from "@/lib/domain/access";
import { buildReportText, parseTemplate } from "@/lib/reports/build-report";
import { reportPeriodKind, reportSelection, yesterdayOf } from "@/lib/reports/report-period";
import { isDemoMode } from "@/server/auth/session";
import { resolveClientContext } from "@/server/data/context";

import { AdminAccessDenied } from "../admin/_components/admin-ui";
import { ReportControls } from "./_components/report-controls";
import { ReportPreview } from "./_components/report-preview";

export const metadata: Metadata = { title: "Relatórios" };

export default function ReportsPage({ searchParams }: PageProps<"/reports">) {
  return (
    <Suspense fallback={<ReportsSkeleton />}>
      <Reports searchParams={searchParams} />
    </Suspense>
  );
}

async function Reports({ searchParams }: Pick<PageProps<"/reports">, "searchParams">) {
  const params = await searchParams;
  const { client, account, today, source, viewer } = await resolveClientContext(params);
  // v1: agency only (the nav hides it from clients; this is the real check).
  if (!isAgencyMember(viewer)) return <AdminAccessDenied />;
  if (!client) return <NoClientsState />;

  const selection = reportSelection(params, today);
  const template = parseTemplate(Array.isArray(params.modelo) ? params.modelo[0] : params.modelo);
  const [dashboard, campaigns] = await Promise.all([
    source.getDashboard(client.id, selection, account.accountId),
    source.getCampaigns(client.id, selection, account.accountId),
  ]);
  if (!dashboard || !campaigns) return <NoClientsState />;

  const text = buildReportText({
    template,
    client: dashboard.client,
    origin: dashboard.origin,
    range: selection.range,
    comparison: selection.compare ? dashboard.comparisonRange : null,
    current: dashboard.current,
    previous: dashboard.previous,
    campaigns: campaigns.campaigns,
    ads: dashboard.ads,
    reachAvailable: dashboard.reachAvailable,
    partialThrough: dashboard.partial ? dashboard.sync.dataThrough : null,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relatórios"
        title="Resumo para WhatsApp"
        description={
          <div className="space-y-1">
            <p>{client.name} · escolha o modelo e o período, confira a prévia e copie.</p>
            <SyncStatusLine sync={dashboard.sync} timeZone={dashboard.client.timezone} />
          </div>
        }
        actions={
          <>
            {dashboard.origin === "simulated" && !isDemoMode() ? <SimulatedDataBadge /> : null}
            <AccountFilter accounts={client.accounts} scope={account} />
          </>
        }
      />
      {client.adAccountCount === 0 ? (
        <NoAdAccountsState clientName={client.name} clientId={client.id} audience="agency" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start">
          <ReportControls
            template={template}
            kind={reportPeriodKind(selection, today)}
            preset={selection.preset}
            range={selection.range}
            today={today}
            yesterday={yesterdayOf(today)}
            compare={selection.compare}
          />
          <ReportPreview text={text} />
        </div>
      )}
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy aria-label="Carregando relatório">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[24rem_1fr]">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    </div>
  );
}
