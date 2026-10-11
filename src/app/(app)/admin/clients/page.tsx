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
import { formatDateTime } from "@/lib/format";
import { loadAdminOverview } from "@/server/data/admin";

import {
  AdminAccessDenied,
  AdminSkeleton,
  AdminTableCard,
  ReadOnlyNotice,
} from "../_components/admin-ui";

export const metadata: Metadata = { title: "Clientes" };

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
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Clientes"
        description="Clientes finais da agência e situação dos dados de cada um."
      />
      <ReadOnlyNotice />
      <AdminTableCard title={`${data.clients.length} clientes`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Cliente</TableHead>
              <TableHead className="text-right">Contas de anúncio</TableHead>
              <TableHead className="text-right">Usuários do cliente</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="pr-5">Última atualização</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="figures-tabular">
            {data.clients.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="pl-5 font-medium">{c.name}</TableCell>
                <TableCell className="text-right">{c.adAccountCount}</TableCell>
                <TableCell className="text-right">{c.memberCount}</TableCell>
                <TableCell>
                  <HealthBadge health={c.health} />
                </TableCell>
                <TableCell className="pr-5">
                  {formatDateTime(c.lastSuccessAt, data.organizationTimezone)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableCard>
    </div>
  );
}
