/**
 * Meta Insights rows → our *_metrics_daily columns. Pure: no I/O, no secrets.
 * Meta sends numbers as strings and omits action types that did not happen.
 */
import { z } from "zod";

import {
  ADD_TO_CART,
  eventValue,
  INITIATE_CHECKOUT,
  PURCHASE,
  type ActionStat,
  type ResultEvent,
} from "./results";

const numeric = z.union([z.string(), z.number()]).optional();
const actionList = z
  .array(z.object({ action_type: z.string(), value: z.union([z.string(), z.number()]) }))
  .optional();

export const insightRowSchema = z.object({
  date_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_stop: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  campaign_id: z.string().optional(),
  campaign_name: z.string().optional(),
  ad_id: z.string().optional(),
  ad_name: z.string().optional(),
  account_currency: z.string().length(3).optional(),
  spend: numeric,
  impressions: numeric,
  reach: numeric,
  frequency: numeric,
  clicks: numeric,
  inline_link_clicks: numeric,
  actions: actionList,
  action_values: actionList,
});

export type InsightRow = z.infer<typeof insightRowSchema>;

function toNumber(value: string | number | undefined): number | null {
  if (value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toInt(value: string | number | undefined): number | null {
  const n = toNumber(value);
  return n === null ? null : Math.round(n);
}

export interface MetricColumns {
  date: string;
  spend: number | null;
  impressions: number | null;
  reach_daily: number | null;
  clicks_all: number | null;
  inline_link_clicks: number | null;
  results: number | null;
  result_indicator: string | null;
  purchase_value: number | null;
  add_to_cart: number | null;
  initiate_checkout: number | null;
  actions: ActionStat[] | null;
  action_values: ActionStat[] | null;
}

/**
 * One daily row. `event` is the campaign's result event (chooseResultEvent):
 * - with an event, a missing action means ZERO results that day (Meta omits zeros);
 * - without an event (e.g. awareness) results stay NULL — "no result defined".
 * Sales funnel steps and purchase value only exist for purchase campaigns.
 */
export function toMetricColumns(row: InsightRow, event: ResultEvent | null): MetricColumns {
  const sales = event === PURCHASE;
  return {
    date: row.date_start,
    spend: toNumber(row.spend),
    impressions: toInt(row.impressions),
    reach_daily: toInt(row.reach),
    clicks_all: toInt(row.clicks),
    inline_link_clicks: toInt(row.inline_link_clicks),
    results: event ? (eventValue(row.actions, event) ?? 0) : null,
    result_indicator: event?.indicator ?? null,
    purchase_value: sales ? (eventValue(row.action_values, PURCHASE) ?? 0) : null,
    add_to_cart: sales ? (eventValue(row.actions, ADD_TO_CART) ?? 0) : null,
    initiate_checkout: sales ? (eventValue(row.actions, INITIATE_CHECKOUT) ?? 0) : null,
    actions: row.actions ?? null,
    action_values: row.action_values ?? null,
  };
}

/** Rows that fail validation are reported, never silently turned into zeros. */
export function parseInsightRows(raw: unknown[]): { rows: InsightRow[]; invalid: number } {
  const rows: InsightRow[] = [];
  let invalid = 0;
  for (const item of raw) {
    const parsed = insightRowSchema.safeParse(item);
    if (parsed.success) rows.push(parsed.data);
    else invalid++;
  }
  return { rows, invalid };
}
