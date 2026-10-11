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
import type { SyncRunStatus, SyncRunView } from "@/lib/domain/admin-types";
import type { SyncHealth } from "@/lib/domain/types";
import { formatDateTime, formatMetricValue } from "@/lib/format";
import { loadAdminOverview } from "@/server/data/admin";

import {
  AdminAccessDenied,
  AdminSkeleton,
  AdminTableCard,
  ReadOnlyNotice,
} from "../_components/admin-ui";

export const metadata: Metadata = { title: "Sincronizações" };

const STATUS: Record<SyncRunStatus, { label: string; health: SyncHealth }> = {
  running: { label: "Em execução", health: "stale" },
  succeeded: { label: "Concluída", health: "ok" },
  partial: { label: "Parcial", health: "failing" },
  failed: { label: "Falhou", health: "failing" },
};

const TRIGGER: Record<SyncRunView["trigger"], string> = {
  cron: "Agendada",
  manual: "Manual",
  retry: "Retentativa",
};

function duration(run: SyncRunView) {
  if (!run.finishedAt) return "—";
  const seconds = Math.round((Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000);
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
}

export default function AdminSyncPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <SyncRuns />
    </Suspense>
  );
}

async function SyncRuns() {
  const data = await loadAdminOverview();
  if (!data) return <AdminAccessDenied />;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Sincronizações"
        description="Execuções diárias do agendador (06:10, horário de Brasília) e retentativas."
      />
      <ReadOnlyNotice />
      <AdminTableCard title="Histórico recente">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Início</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead className="text-right">Duração</TableHead>
              <TableHead className="text-right">Contas</TableHead>
              <TableHead className="text-right">Linhas gravadas</TableHead>
              <TableHead className="pr-5">Falhas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="figures-tabular">
            {data.syncRuns.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="pl-5">
                  {formatDateTime(run.startedAt, data.organizationTimezone)}
                </TableCell>
                <TableCell>{TRIGGER[run.trigger]}</TableCell>
                <TableCell>
                  <HealthBadge
                    health={STATUS[run.status].health}
                    label={STATUS[run.status].label}
                  />
                </TableCell>
                <TableCell className="text-right">{duration(run)}</TableCell>
                <TableCell className="text-right">
                  {run.accountsTotal - run.accountsFailed}/{run.accountsTotal}
                </TableCell>
                <TableCell className="text-right">
                  {formatMetricValue(run.rowsUpserted, "integer")}
                </TableCell>
                <TableCell className="max-w-72 pr-5 text-xs whitespace-normal text-muted-foreground">
                  {run.failureSummary ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableCard>
    </div>
  );
}
