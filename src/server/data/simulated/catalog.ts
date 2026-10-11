/**
 * Static catalogue of the SIMULATED organisation. All names, ids and e-mails are
 * fictitious (example.com, act_0000…) so they can never be mistaken for real data.
 */
import type { CampaignStatus, ClientObjective } from "@/lib/domain/types";

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
  /** Average order value (sales campaigns only). */
  averageTicket?: number;
  /** Ad-level demo data. Each ad takes a share of the campaign's spend/results. */
  ads?: SimAd[];
}

export interface SimAd {
  id: string;
  name: string;
  /** Local demo artwork under /public/demo/ads (never a real creative). */
  thumbnailUrl: string;
  spendShare: number;
  resultShare: number;
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
  objective: ClientObjective | null;
  costPerResultGoal: number | null;
  accounts: SimAdAccount[];
}

const LEAD = "actions:lead";
const MESSAGES = "actions:onsite_conversion.messaging_conversation_started_7d";
const PURCHASE = "actions:offsite_conversion.fb_pixel_purchase";

const SERVICE_CLIENTS: SimClient[] = [
  {
    id: "demo-auto-center",
    name: "Auto Center Modelo",
    sync: { kind: "ok" },
    // No declared objective: the main result falls back to the type with most spend.
    objective: null,
    costPerResultGoal: 30,
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
    objective: "messages",
    costPerResultGoal: null,
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
            averageTicket: 260,
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
    objective: "leads",
    costPerResultGoal: null,
    accounts: [],
  },
];

/**
 * Online-sales demo (pizzaria with delivery), authorised to showcase the sales
 * layout: purchase value (ROAS), 5-step funnel and ad-level data. Every field
 * here is what the Meta integration will fill in Phase 6.
 */
const PIZZARIA: SimClient = {
  id: "demo-pizzaria",
  name: "Pizzaria Demonstração",
  sync: { kind: "ok" },
  objective: "purchases",
  costPerResultGoal: 24,
  accounts: [
    {
      id: "acc-pizza-1",
      externalId: "act_000000000005",
      name: "Pizzaria Demonstração · Delivery",
      campaigns: [
        {
          id: "cmp-p1",
          name: "Vendas · Delivery noite",
          objectiveLabel: "Vendas",
          resultIndicator: PURCHASE,
          seed: 71,
          baseSpend: 95,
          startedDaysAgo: 320,
          status: "active",
          averageTicket: 78,
          ads: [
            {
              id: "ad-p1",
              name: "Pizza saindo do forno",
              thumbnailUrl: "/demo/ads/forno.svg",
              spendShare: 0.45,
              resultShare: 0.55,
            },
            {
              id: "ad-p2",
              name: "Promo terça em dobro",
              thumbnailUrl: "/demo/ads/promo.svg",
              spendShare: 0.35,
              resultShare: 0.3,
            },
            {
              id: "ad-p3",
              name: "Depoimento de cliente",
              thumbnailUrl: "/demo/ads/depoimento.svg",
              spendShare: 0.2,
              resultShare: 0.15,
            },
          ],
        },
        {
          id: "cmp-p2",
          name: "Vendas · Combo família fim de semana",
          objectiveLabel: "Vendas",
          resultIndicator: PURCHASE,
          seed: 79,
          baseSpend: 60,
          startedDaysAgo: 200,
          status: "active",
          averageTicket: 112,
          ads: [
            {
              id: "ad-p4",
              name: "Combo família 2 pizzas",
              thumbnailUrl: "/demo/ads/combo.svg",
              spendShare: 0.6,
              resultShare: 0.7,
            },
            {
              id: "ad-p5",
              name: "Bordas recheadas",
              thumbnailUrl: "/demo/ads/borda.svg",
              spendShare: 0.4,
              resultShare: 0.3,
            },
          ],
        },
        {
          id: "cmp-p3",
          name: "Remarketing · Carrinho abandonado",
          objectiveLabel: "Vendas",
          resultIndicator: PURCHASE,
          seed: 83,
          baseSpend: 25,
          startedDaysAgo: 150,
          status: "active",
          averageTicket: 70,
          ads: [
            {
              id: "ad-p6",
              name: "Esqueceu sua pizza?",
              thumbnailUrl: "/demo/ads/carrinho.svg",
              spendShare: 1,
              resultShare: 1,
            },
          ],
        },
      ],
    },
  ],
};

// The sales demo comes first: it is the reference layout for the first real client.
export const SIM_CLIENTS: SimClient[] = [PIZZARIA, ...SERVICE_CLIENTS];
