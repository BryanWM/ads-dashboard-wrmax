/**
 * Human labels for Meta result indicators (the action type a campaign optimises
 * for). Unknown indicators fall back to a generic label but are never merged.
 */
const RESULT_LABELS: Record<string, string> = {
  "actions:lead": "Leads",
  "actions:onsite_conversion.lead_grouped": "Leads",
  "actions:onsite_conversion.messaging_conversation_started_7d": "Conversas iniciadas",
  "actions:offsite_conversion.fb_pixel_purchase": "Compras",
  "actions:offsite_conversion.fb_pixel_lead": "Leads (site)",
  "actions:link_click": "Cliques no link",
};

export function resultLabel(indicator: string | null): string {
  if (indicator === null) return "Sem resultado definido";
  return RESULT_LABELS[indicator] ?? "Resultados";
}
