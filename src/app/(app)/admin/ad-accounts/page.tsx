import type { Metadata } from "next";
import { Suspense } from "react";

import { HealthBadge } from "@/components/feedback/health-badge";
import { StatusDot } from "@/components/feedback/status-dot";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { isDemoMode } from "@/server/auth/session";
import { loadAdminOverview } from "@/server/data/admin";

import { AccountClientSelect } from "../_components/account-client-select";
import {
  AdminAccessDenied,
  AdminSkeleton,
  AdminTableCard,
  DemoReadOnlyNotice,
} from "../_components/admin-ui";
import { SyncNowButton } from "../_components/meta-buttons";

export const metadata: Metadata = { title: "Contas de anúncio" };

// "Buscar dados" runs a full account sync (first run fetches 90 days).
export const maxDuration = 300;

export default function AdminAdAccountsPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdAccounts />
    </Suspense>
  );
}

async function AdAccounts() {
  const data = await loadAdminOverview();
  if (!data) return <AdminAccessDenied />;
  const editable = !isDemoMode();
  const clients = data.clients.map((c) => ({ id: c.id, name: c.name }));
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Contas de anúncio"
        description="Contas disponíveis pela conexão Meta e o cliente de cada uma. Ao trocar o cliente, o histórico da conta vai junto."
      />
      {editable ? null : <DemoReadOnlyNotice />}
      <AdminTableCard title={`${data.adAccounts.length} contas`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Conta</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Moeda · fuso</TableHead>
              <TableHead>Sincronização</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Última atualização</TableHead>
              {editable ? <TableHead className="pr-5" aria-label="Ações" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.adAccounts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="pl-5">
                  <p className="font-medium">{a.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{a.externalId}</p>
                </TableCell>
                <TableCell>
                  {editable ? (
                    <AccountClientSelect
                      accountId={a.id}
                      accountName={a.name}
                      clientId={a.clientId}
                      clients={clients}
                    />
                  ) : (
                    (a.clientName ?? <Badge variant="outline">Sem cliente</Badge>)
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {a.currency} · {a.timezone}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-2 text-[13px] text-texto">
                    <StatusDot tone={a.syncEnabled ? "ok" : "neutro"} />
                    {a.syncEnabled ? "Ativa" : "Desativada"}
                  </span>
                </TableCell>
                <TableCell>
                  <HealthBadge health={a.health} />
                </TableCell>
                <TableCell>{formatDateTime(a.lastSuccessAt, data.organizationTimezone)}</TableCell>
                {editable ? (
                  <TableCell className="pr-5 text-right">
                    <SyncNowButton accountId={a.id} accountName={a.name} />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableCard>
    </div>
  );
}
