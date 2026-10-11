import type { ClientObjective } from "@/lib/domain/types";

/**
 * Friendly names for Meta result indicators (the action a campaign optimises
 * for). Unknown indicators fall back to a generic label but are never merged.
 */
interface ResultNames {
  /** Plural label for cards and lists ("Compras"). */
  plural: string;
  /** Singular noun for sentences ("compra"). */
  singular: string;
  /** Plural noun for sentences ("compras"). */
  pluralNoun: string;
  /** Grammatical gender, for agreement in sentences ("compras registradas"). */
  feminine: boolean;
}

const PURCHASE = "actions:offsite_conversion.fb_pixel_purchase";
const MESSAGES = "actions:onsite_conversion.messaging_conversation_started_7d";
const LEAD = "actions:lead";

const RESULT_NAMES: Record<string, ResultNames> = {
  [LEAD]: { plural: "Cadastros", singular: "cadastro", pluralNoun: "cadastros", feminine: false },
  "actions:onsite_conversion.lead_grouped": {
    plural: "Cadastros",
    singular: "cadastro",
    pluralNoun: "cadastros",
    feminine: false,
  },
  [MESSAGES]: {
    plural: "Conversas",
    singular: "conversa",
    pluralNoun: "conversas",
    feminine: true,
  },
  [PURCHASE]: { plural: "Compras", singular: "compra", pluralNoun: "compras", feminine: true },
  "actions:offsite_conversion.fb_pixel_lead": {
    plural: "Cadastros no site",
    singular: "cadastro",
    pluralNoun: "cadastros",
    feminine: false,
  },
  "actions:link_click": {
    plural: "Cliques",
    singular: "clique",
    pluralNoun: "cliques",
    feminine: false,
  },
};

const FALLBACK: ResultNames = {
  plural: "Resultados",
  singular: "resultado",
  pluralNoun: "resultados",
  feminine: false,
};

/** The result indicator that represents each client objective. */
export const OBJECTIVE_INDICATOR: Record<ClientObjective, string> = {
  purchases: PURCHASE,
  messages: MESSAGES,
  leads: LEAD,
};

export function resultNames(indicator: string | null): ResultNames {
  return indicator === null ? FALLBACK : (RESULT_NAMES[indicator] ?? FALLBACK);
}

export function resultLabel(indicator: string | null): string {
  if (indicator === null) return "Sem resultado definido";
  return resultNames(indicator).plural;
}

export function isPurchaseIndicator(indicator: string | null): boolean {
  return indicator === PURCHASE;
}
