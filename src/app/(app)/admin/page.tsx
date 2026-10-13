import { CircleAlertIcon, CircleCheckIcon, KeyRoundIcon, UnlinkIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { HealthBadge } from "@/components/feedback/health-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ConnectionStatus } from "@/lib/domain/admin-types";
import { formatDateTime } from "@/lib/format";
import { loadAdminOverview } from "@/server/data/admin";

import {
  AdminAccessDenied,
  AdminSkeleton,
  AdminTableCard,
  DemoReadOnlyNotice,
  MetaPendingNotice,
} from "./_components/admin-ui";
import { isDemoMode } from "@/server/auth/session";

export const metadata: Metadata = { title: "Integrações" };

const CONNECTION_STATUS: Record<ConnectionStatus, string> = {
  active: "Ativa",
  needs_reauth: "Reautorização necessária",
  revoked: "Revogada",
  error: "Com erro",
};

export default function AdminIntegrationsPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Integrations />
    </Suspense>
  );
}

async function Integrations() {
  const data = await loadAdminOverview();
  if (!data) return <AdminAccessDenied />;
  const tz = data.organizationTimezone;
  const failing = data.adAccounts.filter((a) => a.health === "failing");
  const unassigned = data.adAccounts.filter((a) => a.clientId === null);
  const healthy = data.adAccounts.filter((a) => a.health === "ok");
  const attention = [...failing, ...unassigned];

  const stats = [
    {
      label: "Contas atualizadas",
      value: healthy.length,
      Icon: CircleCheckIcon,
      tone: "text-success",
    },
    {
      label: "Contas com falha",
      value: failing.length,
      Icon: CircleAlertIcon,
      tone: "text-critical",
    },
    {
      label: "Contas sem cliente",
      value: unassigned.length,
      Icon: UnlinkIcon,
      tone: "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Integrações"
        description={`${data.organizationName} · status das conexões e das contas de anúncios`}
      />
      {isDemoMode() ? <DemoReadOnlyNotice /> : <MetaPendingNotice />}

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, Icon, tone }) => (
          <Card key={label} size="sm">
            <CardContent className="flex items-center gap-3">
              <Icon className={`size-5 ${tone}`} aria-hidden />
              <div>
                <p className="text-2xl font-semibold tracking-tight figures-tabular">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.connections.map((c) => (
        <Card key={c.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRoundIcon className="size-4 text-muted-foreground" aria-hidden />
              Meta Ads · {c.label}
            </CardTitle>
            <CardDescription>
              Token de {c.tokenType === "system_user" ? "usuário do sistema" : "usuário"} armazenado
              cifrado no servidor. O valor nunca é exibido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <HealthBadge
                    health={c.status === "active" ? "ok" : "failing"}
                    label={CONNECTION_STATUS[c.status]}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Permissões</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {c.scopes.map((s) => (
                    <Badge key={s} variant="outline" className="font-mono">
                      {s}
                    </Badge>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Última validação</dt>
                <dd className="mt-1">{formatDateTime(c.lastValidatedAt, tz)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Expiração</dt>
                <dd className="mt-1">
                  {c.expiresAt ? formatDateTime(c.expiresAt, tz) : "Não expira"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      ))}

      <AdminTableCard
        title="Contas que precisam de atenção"
        description="Falhas de atualização e contas descobertas que ainda não foram associadas a um cliente."
      >
        {attention.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">Nenhuma pendência.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Conta</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="pr-5">Última atualização</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attention.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="pl-5">
                    <p className="font-medium">{a.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{a.externalId}</p>
                  </TableCell>
                  <TableCell>
                    {a.clientName ?? <Badge variant="outline">Sem cliente</Badge>}
                  </TableCell>
                  <TableCell>
                    <HealthBadge health={a.health} />
                  </TableCell>
                  <TableCell className="pr-5">{formatDateTime(a.lastSuccessAt, tz)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AdminTableCard>
    </div>
  );
}
