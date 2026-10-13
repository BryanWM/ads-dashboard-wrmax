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
import { loadAdminOverview } from "@/server/data/admin";

import {
  AdminAccessDenied,
  AdminSkeleton,
  AdminTableCard,
  ReadOnlyNotice,
} from "../_components/admin-ui";

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
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Acessos"
        description="A agência vê todos os clientes; cada cliente vê apenas os próprios dados."
      />
      <ReadOnlyNotice />
      <AdminTableCard title={`${data.members.length} usuários`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Escopo</TableHead>
              <TableHead className="pr-5">Último acesso</TableHead>
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
                <TableCell className="pr-5">
                  {formatDateTime(m.lastSeenAt, data.organizationTimezone)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableCard>
    </div>
  );
}
