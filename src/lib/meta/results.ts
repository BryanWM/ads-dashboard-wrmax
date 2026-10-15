/**
 * Which Meta action counts as a campaign's "result".
 *
 * Meta's Insights API returns `actions` (counts) and `action_values` (money) per
 * action type, and repeats the same event under several names (e.g. `purchase`,
 * `omni_purchase`, `offsite_conversion.fb_pixel_purchase` carry the SAME value).
 * We therefore pick ONE type per event — never sum the variants — and choose the
 * event from the campaign objective. Checked against Ads Manager on 2026-10-15
 * (docs/meta-integration.md).
 */

export interface ActionStat {
  action_type: string;
  value: string | number;
}

export interface ResultEvent {
  /** Our indicator (same strings as src/lib/metrics/result-types). */
  indicator: string;
  /** Equivalent Meta action types, in order of preference (duplicates of one event). */
  types: readonly string[];
}

export const PURCHASE: ResultEvent = {
  indicator: "actions:offsite_conversion.fb_pixel_purchase",
  types: [
    "offsite_conversion.fb_pixel_purchase",
    "omni_purchase",
    "purchase",
    "onsite_web_purchase",
  ],
};
export const LEAD: ResultEvent = {
  indicator: "actions:lead",
  types: ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"],
};
export const MESSAGES: ResultEvent = {
  indicator: "actions:onsite_conversion.messaging_conversation_started_7d",
  types: ["onsite_conversion.messaging_conversation_started_7d"],
};
export const LINK_CLICK: ResultEvent = { indicator: "actions:link_click", types: ["link_click"] };
export const ADD_TO_CART: ResultEvent = {
  indicator: "actions:add_to_cart",
  types: ["offsite_conversion.fb_pixel_add_to_cart", "omni_add_to_cart", "add_to_cart"],
};
export const INITIATE_CHECKOUT: ResultEvent = {
  indicator: "actions:initiate_checkout",
  types: [
    "offsite_conversion.fb_pixel_initiate_checkout",
    "omni_initiated_checkout",
    "initiate_checkout",
  ],
};

/** Candidate result events per campaign objective (ODAX + legacy names). */
const BY_OBJECTIVE: Record<string, readonly ResultEvent[]> = {
  OUTCOME_SALES: [PURCHASE, MESSAGES],
  OUTCOME_LEADS: [LEAD, MESSAGES],
  OUTCOME_ENGAGEMENT: [MESSAGES],
  OUTCOME_TRAFFIC: [LINK_CLICK],
  OUTCOME_AWARENESS: [],
  OUTCOME_APP_PROMOTION: [],
  CONVERSIONS: [PURCHASE, LEAD],
  LEAD_GENERATION: [LEAD],
  MESSAGES: [MESSAGES],
  LINK_CLICKS: [LINK_CLICK],
};

function num(value: string | number | undefined): number | null {
  if (value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Value of one event in a row: the first variant present (variants are duplicates). */
export function eventValue(
  stats: readonly ActionStat[] | undefined,
  event: ResultEvent,
): number | null {
  if (!stats) return null;
  for (const type of event.types) {
    const hit = stats.find((s) => s.action_type === type);
    if (hit) return num(hit.value);
  }
  return null;
}

/**
 * The campaign's result event, decided ONCE over all its rows so every day uses the
 * same type (a campaign never mixes result types). First candidate that actually
 * happened wins; if none happened, the objective's main event (results = 0).
 * null = objective without a countable result (e.g. awareness).
 */
export function chooseResultEvent(
  objective: string | null,
  rows: readonly { actions?: readonly ActionStat[] }[],
): ResultEvent | null {
  const candidates = BY_OBJECTIVE[(objective ?? "").toUpperCase()] ?? [];
  for (const event of candidates) {
    if (rows.some((r) => (eventValue(r.actions, event) ?? 0) > 0)) return event;
  }
  return candidates[0] ?? null;
}
