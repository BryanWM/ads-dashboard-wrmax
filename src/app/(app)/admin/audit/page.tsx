import type { Metadata } from "next";
import { Suspense } from "react";

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
  DemoReadOnlyNotice,
} from "../_components/admin-ui";
import { isDemoMode } from "@/server/auth/session";

export const metadata: Metadata = { title: "Auditoria" };

export default function AdminAuditPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Audit />
    </Suspense>
  );
}

async function Audit() {
  const data = await loadAdminOverview();
  if (!data) return <AdminAccessDenied />;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Auditoria"
        description="Registro imutável das ações administrativas: quem fez, o quê e quando."
      />
      {isDemoMode() ? <DemoReadOnlyNotice /> : null}
      <AdminTableCard title="Eventos recentes">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Quando</TableHead>
              <TableHead>Quem</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead className="pr-5">Alvo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.audit.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="pl-5 figures-tabular">
                  {formatDateTime(e.at, data.organizationTimezone)}
                </TableCell>
                <TableCell>{e.actor}</TableCell>
                <TableCell className="font-medium">{e.action}</TableCell>
                <TableCell className="pr-5 text-muted-foreground">{e.target}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableCard>
    </div>
  );
}
