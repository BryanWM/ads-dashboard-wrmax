import { describe, expect, it } from "vitest";

import { parsePeriodSelection } from "@/lib/dates/period-params";
import { sumNullable } from "@/lib/metrics/derive";
import { buildCampaigns, buildDashboard, findClient } from "@/server/data/simulated/build";

// 10:00 in São Paulo, after the 06:12 daily sync.
const ctx = { today: "2026-10-10", now: new Date("2026-10-10T13:00:00Z") };
const last30 = parsePeriodSelection({}, ctx.today);

function client(id: string) {
  const c = findClient(id);
  if (!c) throw new Error(`missing simulated client ${id}`);
  return c;
}

describe("simulated read model", () => {
  it("reports data through yesterday for a healthy client", () => {
    const d = buildDashboard(client("demo-auto-center"), last30, ctx);
    expect(d.origin).toBe("simulated");
    expect(d.sync.health).toBe("ok");
    expect(d.sync.dataThrough).toBe("2026-10-09");
    expect(d.daily.at(-1)?.current).not.toBeNull();
  });

  it("keeps the last valid data when sync is failing, without inventing newer days", () => {
    const d = buildDashboard(client("demo-clinica"), last30, ctx);
    expect(d.sync.health).toBe("failing");
    expect(d.sync.dataThrough).toBe("2026-10-07");
    expect(d.sync.lastError).toMatch(/limite/i);
    const after = d.daily.filter((p) => p.date > "2026-10-07");
    expect(after.length).toBeGreaterThan(0);
    expect(after.every((p) => p.current === null)).toBe(true);
  });

  it("compares a partially synced period day-for-day", () => {
    const last7 = parsePeriodSelection({ period: "last_7d" }, ctx.today);
    const d = buildDashboard(client("demo-clinica"), last7, ctx);
    // Data through Oct 7: 5 covered days vs the first 5 days of the previous week.
    expect(d.partial).toBe(true);
    expect(d.comparisonRange).toEqual({ from: "2026-09-26", to: "2026-09-30" });
    // The compared total must equal the spend of exactly those 5 previous days.
    const reference = buildDashboard(
      client("demo-clinica"),
      { ...last7, preset: null, range: d.comparisonRange },
      ctx,
    );
    expect(d.previous.metrics.spend).toBeCloseTo(reference.current.metrics.spend ?? Number.NaN, 6);
  });

  it("returns only missing values for a client without accounts", () => {
    const d = buildDashboard(client("demo-imobiliaria"), last30, ctx);
    expect(d.client.adAccountCount).toBe(0);
    expect(d.current.metrics.spend).toBeNull();
    expect(d.daily.every((p) => p.current === null)).toBe(true);
  });

  it("does not merge different result types", () => {
    const d = buildDashboard(client("demo-auto-center"), last30, ctx);
    expect(d.current.metrics.mixedResultTypes).toBe(true);
    expect(d.current.metrics.results).toBeNull();
    expect(d.current.resultTypes.map((r) => r.resultIndicator).sort()).toEqual([
      "actions:lead",
      "actions:onsite_conversion.messaging_conversation_started_7d",
    ]);
  });

  it("offers reach only for preset periods", () => {
    const preset = buildDashboard(client("demo-auto-center"), last30, ctx);
    expect(preset.reachAvailable).toBe(true);
    expect(preset.current.metrics.reach).not.toBeNull();

    const custom = parsePeriodSelection(
      { period: "custom", from: "2026-09-01", to: "2026-09-15" },
      ctx.today,
    );
    const d = buildDashboard(client("demo-auto-center"), custom, ctx);
    expect(d.reachAvailable).toBe(false);
    expect(d.current.metrics.reach).toBeNull();
    expect(d.current.metrics.frequency).toBeNull();
  });

  it("stops a paused campaign's rows at the pause date", () => {
    const last7 = parsePeriodSelection({ period: "last_7d" }, ctx.today);
    const data = buildCampaigns(client("demo-auto-center"), last7, ctx);
    const paused = data.campaigns.find((c) => c.status === "paused");
    expect(paused?.components.spend).toBeNull();
  });

  it("keeps dashboard and campaign totals consistent", () => {
    const dash = buildDashboard(client("demo-auto-center"), last30, ctx);
    const camps = buildCampaigns(client("demo-auto-center"), last30, ctx);
    const total = sumNullable(camps.campaigns.map((c) => c.components.spend));
    expect(total).toBeCloseTo(dash.current.metrics.spend ?? Number.NaN, 6);
  });

  it("is deterministic for the same day", () => {
    const a = buildDashboard(client("demo-auto-center"), last30, ctx);
    const b = buildDashboard(client("demo-auto-center"), last30, ctx);
    expect(a.current.metrics).toEqual(b.current.metrics);
  });
});
