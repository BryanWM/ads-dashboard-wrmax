import "server-only";

import type { DateRange } from "@/lib/dates/periods";

import { graphGet, graphGetAll } from "./client";

/** The few Graph API reads the product needs (Marketing API, read-only). */

export interface MetaTokenOwner {
  id: string;
  name?: string;
}

export async function getTokenOwner(token: string) {
  return (await graphGet<MetaTokenOwner>("me", { fields: "id,name" }, token)).data;
}

export async function getGrantedPermissions(token: string): Promise<string[]> {
  const { data } = await graphGet<{ data: { permission: string; status: string }[] }>(
    "me/permissions",
    {},
    token,
  );
  return data.data.filter((p) => p.status === "granted").map((p) => p.permission);
}

export interface MetaAdAccount {
  id: string; // act_123
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;
}

/** Ad accounts this token can read (for a system user: the ones assigned to it). */
export async function listAdAccounts(token: string) {
  return (
    await graphGetAll<MetaAdAccount>(
      "me/adaccounts",
      { fields: "id,name,currency,timezone_name,account_status", limit: 200 },
      token,
    )
  ).items;
}

export interface MetaCampaign {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  effective_status?: string;
  buying_type?: string;
  start_time?: string;
  stop_time?: string;
  updated_time?: string;
}

export async function listCampaigns(token: string, accountId: string) {
  return (
    await graphGetAll<MetaCampaign>(
      `${accountId}/campaigns`,
      {
        fields:
          "id,name,objective,status,effective_status,buying_type,start_time,stop_time,updated_time",
        limit: 200,
      },
      token,
    )
  ).items;
}

const INSIGHT_FIELDS =
  "date_start,date_stop,account_currency,spend,impressions,reach,clicks,inline_link_clicks,actions,action_values";

function timeRange(range: DateRange) {
  return { since: range.from, until: range.to };
}

/** Daily rows per campaign (or per ad), in the account timezone. */
export async function dailyInsights(
  token: string,
  accountId: string,
  level: "campaign" | "ad",
  range: DateRange,
) {
  const idFields = level === "ad" ? "campaign_id,ad_id,ad_name" : "campaign_id,campaign_name";
  return graphGetAll<unknown>(
    `${accountId}/insights`,
    {
      level,
      time_increment: 1,
      time_range: timeRange(range),
      fields: `${idFields},${INSIGHT_FIELDS}`,
      use_unified_attribution_setting: true,
      limit: 500,
    },
    token,
  );
}

/** Deduplicated reach for exactly one range, account level (docs/data-model §6). */
export async function accountReach(token: string, accountId: string, range: DateRange) {
  const { data } = await graphGet<{
    data: { reach?: string; impressions?: string; frequency?: string }[];
  }>(
    `${accountId}/insights`,
    {
      time_range: timeRange(range),
      fields: "reach,impressions,frequency",
      use_unified_attribution_setting: true,
    },
    token,
  );
  return data.data[0] ?? null;
}

export interface MetaAd {
  id: string;
  name: string;
  campaign_id?: string;
  effective_status?: string;
  creative?: { thumbnail_url?: string };
}

/** Ad names and thumbnails for the given ids (Graph `ids=` batch, 50 per call). */
export async function getAds(token: string, adIds: string[]): Promise<MetaAd[]> {
  const ads: MetaAd[] = [];
  for (let i = 0; i < adIds.length; i += 50) {
    const { data } = await graphGet<Record<string, MetaAd>>(
      "",
      {
        ids: adIds.slice(i, i + 50).join(","),
        fields: "id,name,campaign_id,effective_status,creative{thumbnail_url}",
      },
      token,
    );
    ads.push(...Object.values(data));
  }
  return ads;
}
