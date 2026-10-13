import type { Metadata } from "next";
import { Suspense } from "react";

import { HealthBadge } from "@/components/feedback/health-badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClientObjective } from "@/lib/domain/types";
import { formatDateTime, formatMetricValue } from "@/lib/format";
import { isDemoMode } from "@/server/auth/session";
import { loadAdminOverview } from "@/server/data/admin";

import {
  AdminAccessDenied,
  AdminSkeleton,
  AdminTableCard,
  DemoReadOnlyNotice,
} from "../_components/admin-ui";
import { ClientFormDialog } from "../_components/client-form-dialog";

export const metadata: Metadata = { title: "Clientes" };

const OBJECTIVE_LABEL: Record<ClientObjective, string> = {
  purchases: "Vendas online",
  messages: "Conversas",
  leads: "Cadastros",
};

export default function AdminClientsPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Clients />
    </Suspense>
  );
}

async function Clients() {
  const data = await loadAdminOverview();
  if (!data) return <AdminAccessDenied />;
  const editable = !isDemoMode();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Clientes"
        description="Clientes finais da agência, objetivo, meta e situação dos dados de cada um."
        actions={editable ? <ClientFormDialog /> : null}
      />
      {editable ? null : <DemoReadOnlyNotice />}
      <AdminTableCard title={`${data.clients.length} clientes`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Cliente</TableHead>
              <TableHead>Objetivo</TableHead>
              <TableHead className="text-right">Meta por resultado</TableHead>
              <TableHead className="text-right">Contas</TableHead>
              <TableHead className="text-right">Acessos</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Última atualização</TableHead>
              {editable ? <TableHead className="pr-5" aria-label="Ações" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody className="figures-tabular">
            {data.clients.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="pl-5 font-medium">{c.name}</TableCell>
                <TableCell className="text-texto-apagado">
                  {c.objective ? OBJECTIVE_LABEL[c.objective] : "Não definido"}
                </TableCell>
                <TableCell className="text-right">
                  {c.costPerResultGoal === null
                    ? "—"
                    : formatMetricValue(c.costPerResultGoal, "currency", { currency: "BRL" })}
                </TableCell>
                <TableCell className="text-right">{c.adAccountCount}</TableCell>
                <TableCell className="text-right">{c.memberCount}</TableCell>
                <TableCell>
                  <HealthBadge health={c.health} />
                </TableCell>
                <TableCell>{formatDateTime(c.lastSuccessAt, data.organizationTimezone)}</TableCell>
                {editable ? (
                  <TableCell className="pr-5 text-right">
                    <ClientFormDialog client={c} />
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
