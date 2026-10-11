/**
 * Static catalogue of the SIMULATED organisation. All names, ids and e-mails are
 * fictitious (example.com, act_0000…) so they can never be mistaken for real data.
 */
import type { CampaignStatus } from "@/lib/domain/types";

export const SIM_ORG_NAME = "Agência Demonstração";
export const SIM_TIMEZONE = "America/Sao_Paulo";
export const SIM_CURRENCY = "BRL";
/** Simulated history starts here so past values stay stable day after day. */
export const SIM_EPOCH = "2025-01-01";

export type SimSyncProfile =
  { kind: "ok" } | { kind: "failing"; daysSinceSuccess: number; error: string } | { kind: "never" };

export interface SimCampaign {
  id: string;
  name: string;
  objectiveLabel: string;
  resultIndicator: string | null;
  seed: number;
  baseSpend: number;
  /** Days before "today" the campaign started delivering. */
  startedDaysAgo: number;
  /** Paused campaigns stop producing rows this many days ago. */
  pausedDaysAgo?: number;
  status: CampaignStatus;
}

export interface SimAdAccount {
  id: string;
  externalId: string;
  name: string;
  campaigns: SimCampaign[];
}

export interface SimClient {
  id: string;
  name: string;
  sync: SimSyncProfile;
  accounts: SimAdAccount[];
}

const LEAD = "actions:lead";
const MESSAGES = "actions:onsite_conversion.messaging_conversation_started_7d";
const PURCHASE = "actions:offsite_conversion.fb_pixel_purchase";

export const SIM_CLIENTS: SimClient[] = [
  {
    id: "demo-auto-center",
    name: "Auto Center Modelo",
    sync: { kind: "ok" },
    accounts: [
      {
        id: "acc-auto-1",
        externalId: "act_000000000001",
        name: "Auto Center Modelo · Principal",
        campaigns: [
          {
            id: "cmp-a1",
            name: "Leads · Revisão preventiva",
            objectiveLabel: "Cadastros",
            resultIndicator: LEAD,
            seed: 11,
            baseSpend: 85,
            startedDaysAgo: 300,
            status: "active",
          },
          {
            id: "cmp-a2",
            name: "Mensagens · Orçamento de pneus",
            objectiveLabel: "Mensagens",
            resultIndicator: MESSAGES,
            seed: 23,
            baseSpend: 60,
            startedDaysAgo: 200,
            status: "active",
          },
          {
            id: "cmp-a3",
            name: "Leads · Alinhamento e balanceamento",
            objectiveLabel: "Cadastros",
            resultIndicator: LEAD,
            seed: 37,
            baseSpend: 40,
            startedDaysAgo: 150,
            pausedDaysAgo: 12,
            status: "paused",
          },
        ],
      },
      {
        id: "acc-auto-2",
        externalId: "act_000000000002",
        name: "Auto Center Modelo · Institucional",
        campaigns: [
          {
            id: "cmp-a4",
            name: "Reconhecimento · Marca na cidade",
            objectiveLabel: "Reconhecimento",
            resultIndicator: null,
            seed: 41,
            baseSpend: 30,
            startedDaysAgo: 365,
            status: "active",
          },
          {
            id: "cmp-a5",
            name: "Tráfego · Página de serviços",
            objectiveLabel: "Tráfego",
            resultIndicator: null,
            seed: 53,
            baseSpend: 25,
            startedDaysAgo: 45,
            status: "active",
          },
        ],
      },
    ],
  },
  {
    id: "demo-clinica",
    name: "Clínica Exemplo",
    sync: {
      kind: "failing",
      daysSinceSuccess: 2,
      error: "Limite de requisições da Meta atingido. Nova tentativa agendada automaticamente.",
    },
    accounts: [
      {
        id: "acc-clin-1",
        externalId: "act_000000000003",
        name: "Clínica Exemplo",
        campaigns: [
          {
            id: "cmp-c1",
            name: "Vendas · Pacote de check-up",
            objectiveLabel: "Vendas",
            resultIndicator: PURCHASE,
            seed: 61,
            baseSpend: 120,
            startedDaysAgo: 240,
            status: "active",
          },
          {
            id: "cmp-c2",
            name: "Mensagens · Agendamento",
            objectiveLabel: "Mensagens",
            resultIndicator: MESSAGES,
            seed: 67,
            baseSpend: 55,
            startedDaysAgo: 240,
            status: "active",
          },
        ],
      },
    ],
  },
  {
    id: "demo-imobiliaria",
    name: "Imobiliária Demonstração",
    sync: { kind: "never" },
    accounts: [],
  },
];
