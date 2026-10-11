import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CampaignRow } from "@/lib/domain/types";
import { formatMetricValue } from "@/lib/format";
import { resultLabel } from "@/lib/metrics/result-types";

export function TopCampaignsCard({
  campaigns,
  currency,
  href,
}: {
  campaigns: CampaignRow[];
  currency: string;
  href: string;
}) {
  const top = campaigns
    .filter((c) => c.metrics.spend !== null)
    .sort((a, b) => (b.metrics.spend ?? 0) - (a.metrics.spend ?? 0))
    .slice(0, 5);
  const totalSpend = top.reduce((s, c) => s + (c.metrics.spend ?? 0), 0);
  const money = (v: number | null) => formatMetricValue(v, "currency", { currency });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campanhas com maior investimento</CardTitle>
        <CardDescription>No período selecionado</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" render={<Link href={href} />} nativeButton={false}>
            Ver todas
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma campanha com investimento no período.
          </p>
        ) : (
          <ul className="space-y-4">
            {top.map((c) => {
              const share = totalSpend > 0 ? ((c.metrics.spend ?? 0) / totalSpend) * 100 : 0;
              return (
                <li key={c.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="shrink-0 figures-tabular">{money(c.metrics.spend)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-campo" aria-hidden>
                    <div className="h-full rounded-full bg-ouro" style={{ width: `${share}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground figures-tabular">
                    {c.resultIndicator
                      ? `${formatMetricValue(c.metrics.results, "integer")} ${resultLabel(c.resultIndicator).toLowerCase()} · ${money(c.metrics.costPerResult)} por resultado`
                      : `${formatMetricValue(c.metrics.linkClicks, "integer")} cliques no link · sem resultado definido`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
