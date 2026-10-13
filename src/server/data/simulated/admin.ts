import { addDays } from "@/lib/dates/periods";
import type {
  AdAccountView,
  AdminOverview,
  AuditEventView,
  MemberView,
  SyncRunView,
} from "@/lib/domain/admin-types";

import { syncStatusFor, type SimContext } from "./build";
import { SIM_CLIENTS, SIM_CURRENCY, SIM_ORG_NAME, SIM_TIMEZONE } from "./catalog";

const MEMBERS: MemberView[] = [
  {
    id: "usr-1",
    name: "Ana Administradora",
    email: "ana@example.com",
    role: "admin",
    clientName: null,
    lastSeenAt: null,
  },
  {
    id: "usr-3",
    name: "Carla (Auto Center)",
    email: "carla@example.com",
    role: "client",
    clientName: "Auto Center Modelo",
    lastSeenAt: null,
  },
  {
    id: "usr-4",
    name: "Diego (Clínica)",
    email: "diego@example.com",
    role: "client",
    clientName: "Clínica Exemplo",
    lastSeenAt: null,
  },
];

function hoursAgo(now: Date, hours: number) {
  return new Date(now.getTime() - hours * 3_600_000).toISOString();
}

function syncRuns(ctx: SimContext): SyncRunView[] {
  const failingClient = SIM_CLIENTS.find((c) => c.sync.kind === "failing");
  const failingDays =
    failingClient?.sync.kind === "failing" ? failingClient.sync.daysSinceSuccess : 0;
  const accountsTotal = SIM_CLIENTS.reduce((n, c) => n + c.accounts.length, 0);

  return Array.from({ length: 10 }, (_, i) => {
    const date = addDays(ctx.today, -i);
    const startedAt = `${date}T09:10:00.000Z`;
    if (new Date(startedAt) > ctx.now) return null;
    const failed = i < failingDays ? (failingClient?.accounts.length ?? 0) : 0;
    return {
      id: `run-${date}`,
      trigger: "cron" as const,
      startedAt,
      finishedAt: `${date}T09:12:${failed ? "41" : "07"}.000Z`,
      status: failed ? ("partial" as const) : ("succeeded" as const),
      accountsTotal,
      accountsFailed: failed,
      rowsUpserted: (accountsTotal - failed) * 28 * 2,
      failureSummary: failed
        ? `${failed} conta com limite de requisições (código 17). Retentativa agendada.`
        : null,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);
}

function audit(ctx: SimContext): AuditEventView[] {
  return [
    {
      hours: 3,
      actor: "Ana Administradora",
      action: "Sincronização manual solicitada",
      target: "Clínica Exemplo",
    },
    {
      hours: 26,
      actor: "Ana Administradora",
      action: "Acesso concedido",
      target: "Carla (Auto Center) → Auto Center Modelo",
    },
    {
      hours: 50,
      actor: "Ana Administradora",
      action: "Conta associada a cliente",
      target: "act_000000000002 → Auto Center Modelo",
    },
    {
      hours: 74,
      actor: "Ana Administradora",
      action: "Integração Meta conectada",
      target: "Business Manager (demonstração)",
    },
    {
      hours: 98,
      actor: "Ana Administradora",
      action: "Cliente criado",
      target: "Imobiliária Demonstração",
    },
  ].map((e, i) => ({
    id: `aud-${i}`,
    at: hoursAgo(ctx.now, e.hours),
    actor: e.actor,
    action: e.action,
    target: e.target,
  }));
}

export function buildAdminOverview(ctx: SimContext): AdminOverview {
  const adAccounts: AdAccountView[] = SIM_CLIENTS.flatMap((client) => {
    const sync = syncStatusFor(client, ctx);
    return client.accounts.map((a) => ({
      id: a.id,
      externalId: a.externalId,
      name: a.name,
      clientId: client.id,
      clientName: client.name,
      currency: SIM_CURRENCY,
      timezone: SIM_TIMEZONE,
      syncEnabled: true,
      health: sync.health,
      lastSuccessAt: sync.lastSuccessAt,
    }));
  });

  // One account discovered via the connection but not yet assigned to a client.
  adAccounts.push({
    id: "acc-unassigned",
    externalId: "act_000000000004",
    name: "Conta sem cliente (teste)",
    clientId: null,
    clientName: null,
    currency: SIM_CURRENCY,
    timezone: SIM_TIMEZONE,
    syncEnabled: false,
    health: "never",
    lastSuccessAt: null,
  });

  return {
    origin: "simulated",
    organizationName: SIM_ORG_NAME,
    organizationTimezone: SIM_TIMEZONE,
    connections: [
      {
        id: "conn-1",
        platform: "meta",
        label: "Business Manager (demonstração)",
        status: "active",
        tokenType: "system_user",
        scopes: ["ads_read", "business_management"],
        lastValidatedAt: hoursAgo(ctx.now, 5),
        expiresAt: null,
      },
    ],
    clients: SIM_CLIENTS.map((client) => {
      const sync = syncStatusFor(client, ctx);
      return {
        id: client.id,
        name: client.name,
        adAccountCount: client.accounts.length,
        memberCount: MEMBERS.filter((m) => m.clientName === client.name).length,
        health: sync.health,
        lastSuccessAt: sync.lastSuccessAt,
      };
    }),
    adAccounts,
    syncRuns: syncRuns(ctx),
    members: MEMBERS.map((m, i) => ({ ...m, lastSeenAt: hoursAgo(ctx.now, 2 + i * 19) })),
    audit: audit(ctx),
  };
}
