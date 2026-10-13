import type { Metadata } from "next";
import { Suspense } from "react";

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
import { ROLE_LABELS } from "@/lib/domain/admin-types";
import { formatDateTime } from "@/lib/format";
import { isDemoMode } from "@/server/auth/session";
import { loadAdminOverview } from "@/server/data/admin";

import {
  AdminAccessDenied,
  AdminSkeleton,
  AdminTableCard,
  DemoReadOnlyNotice,
} from "../_components/admin-ui";
import { CreateAccessDialog } from "../_components/create-access-dialog";
import { MemberActions } from "../_components/member-actions";

export const metadata: Metadata = { title: "Acessos" };

export default function AdminAccessPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Access />
    </Suspense>
  );
}

async function Access() {
  const data = await loadAdminOverview();
  if (!data) return <AdminAccessDenied />;
  const editable = !isDemoMode();
  const clients = data.clients.map((c) => ({ id: c.id, name: c.name }));
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Acessos"
        description="A agência vê todos os clientes; cada cliente vê apenas os próprios dados."
        actions={editable ? <CreateAccessDialog clients={clients} /> : null}
      />
      {editable ? null : <DemoReadOnlyNotice />}
      <AdminTableCard title={`${data.members.length} usuários`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Escopo</TableHead>
              <TableHead>Último acesso</TableHead>
              {editable ? <TableHead className="pr-5" aria-label="Ações" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="pl-5">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </TableCell>
                <TableCell>
                  <Badge variant={m.role === "client" ? "outline" : "secondary"}>
                    {ROLE_LABELS[m.role]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{m.clientName ?? "Todos os clientes"}</TableCell>
                <TableCell>
                  {m.lastSeenAt
                    ? formatDateTime(m.lastSeenAt, data.organizationTimezone)
                    : m.role === "client"
                      ? "Ainda não entrou"
                      : "—"}
                </TableCell>
                {editable ? (
                  <TableCell className="pr-5">
                    {m.role === "client" ? <MemberActions userId={m.id} name={m.name} /> : null}
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
