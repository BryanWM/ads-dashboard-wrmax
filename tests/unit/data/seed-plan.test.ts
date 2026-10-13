import { describe, expect, it } from "vitest";

import { buildSeedPlan, demoId } from "@/server/data/simulated/seed-plan";

const ORG = "11111111-1111-4111-8111-111111111111";
const ctx = { today: "2026-10-13", now: new Date("2026-10-13T15:00:00Z") };

describe("demo seed plan", () => {
  const plan = buildSeedPlan(ORG, ctx);

  it("derives stable, valid UUIDs per organisation", () => {
    expect(demoId(ORG, "demo-pizzaria")).toBe(demoId(ORG, "demo-pizzaria"));
    expect(demoId(ORG, "demo-pizzaria")).not.toBe(demoId("other-org", "demo-pizzaria"));
    expect(demoId(ORG, "x")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("marks every metric row as simulated", () => {
    expect(plan.campaignMetrics.length).toBeGreaterThan(0);
    expect(plan.campaignMetrics.every((r) => r.source === "simulated")).toBe(true);
    expect(plan.adMetrics.every((r) => r.source === "simulated")).toBe(true);
    expect(plan.reachSnapshots.every((r) => r.source === "simulated")).toBe(true);
  });

  it("references only accounts, campaigns and ads of the plan", () => {
    const accounts = new Set(plan.adAccounts.map((a) => a.id));
    const campaigns = new Set(plan.campaigns.map((c) => c.id));
    const ads = new Set(plan.ads.map((a) => a.id));
    expect(plan.campaigns.every((c) => accounts.has(c.ad_account_id))).toBe(true);
    expect(plan.campaignMetrics.every((m) => campaigns.has(m.campaign_id))).toBe(true);
    expect(plan.adMetrics.every((m) => ads.has(m.ad_id))).toBe(true);
    expect(new Set(plan.campaignMetrics.map((m) => `${m.campaign_id}:${m.date}`)).size).toBe(
      plan.campaignMetrics.length,
    );
  });

  it("stops data at the last successful sync and keeps the failing client's error", () => {
    const yesterday = "2026-10-12";
    expect(plan.campaignMetrics.every((m) => m.date <= yesterday)).toBe(true);
    const failing = plan.syncStates.filter((s) => s.consecutive_failures > 0);
    expect(failing).toHaveLength(1);
    expect(failing[0]!.last_error_message).toMatch(/Limite de requisições/);
  });

  it("has no ad accounts for the client that never synced", () => {
    const imob = plan.clients.find((c) => c.name === "Imobiliária Demonstração")!;
    expect(plan.adAccounts.some((a) => a.client_id === imob.id)).toBe(false);
  });
});
