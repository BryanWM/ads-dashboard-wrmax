import { ImageOffIcon } from "lucide-react";
import Image from "next/image";

import type { AdView, CampaignRow } from "@/lib/domain/types";
import { formatMetricValue } from "@/lib/format";
import { resultNames } from "@/lib/metrics/result-types";
import { cn } from "@/lib/utils";

interface AdsChampionsProps {
  ads: AdView[] | null;
  campaigns: CampaignRow[];
  indicator: string | null;
  currency: string;
  /** Compact list for the narrow desktop bento column (keeps 1440×900 scroll-free). */
  compact?: boolean;
  className?: string;
}

const money = (v: number | null, currency: string) =>
  formatMetricValue(v, "currency", { currency });

/** Best = lowest cost per main result, among items that produced that result. */
function rankAds(ads: AdView[], indicator: string | null) {
  return ads
    .filter(
      (a) => a.resultIndicator === indicator && (a.results ?? 0) > 0 && a.costPerResult !== null,
    )
    .sort((a, b) => a.costPerResult! - b.costPerResult!)
    .slice(0, 3);
}

function rankCampaigns(campaigns: CampaignRow[], indicator: string | null) {
  return campaigns
    .filter((c) => c.resultIndicator === indicator && (c.metrics.results ?? 0) > 0)
    .sort((a, b) => (a.metrics.costPerResult ?? Infinity) - (b.metrics.costPerResult ?? Infinity));
}

export function AdsChampions({
  ads,
  campaigns,
  indicator,
  currency,
  compact = false,
  className,
}: AdsChampionsProps) {
  const names = resultNames(indicator);
  const topAds = ads ? rankAds(ads, indicator) : [];
  const ranked = rankCampaigns(campaigns, indicator).slice(0, compact ? 3 : 5);
  const maxResults = Math.max(...ranked.map((c) => c.metrics.results ?? 0), 1);

  return (
    <div className={cn(compact ? "space-y-5" : "space-y-6", className)}>
      {topAds.length > 0 && compact ? (
        <ol className="space-y-3" aria-label="Anúncios campeões">
          {topAds.map((ad, i) => (
            <li key={ad.id} className="flex items-center gap-3">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-campo">
                {ad.thumbnailUrl ? (
                  <Image
                    src={ad.thumbnailUrl}
                    alt=""
                    fill
                    sizes="48px"
                    unoptimized
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-texto">
                  <span className="text-ouro">{i + 1}º</span> {ad.name}
                </p>
                <p className="text-xs text-texto-apagado figures-tabular">
                  {money(ad.costPerResult, currency)} por {names.singular}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : topAds.length > 0 ? (
        <section aria-label="Anúncios campeões" className="space-y-3">
          <h2 className="etiqueta text-texto-apagado">Anúncios campeões</h2>
          {/* Horizontal scroll is allowed only inside carousels. Focusable for keyboard scroll. */}
          <ol
            tabIndex={0}
            className="-mx-4 flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-1 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dourado lg:mx-0 lg:px-0"
          >
            {topAds.map((ad, i) => (
              <li
                key={ad.id}
                className="w-[68%] max-w-60 shrink-0 snap-start overflow-hidden rounded-xl border border-linha bg-superficie sm:w-[40%] lg:w-44"
              >
                <div className="relative aspect-square bg-campo">
                  {ad.thumbnailUrl ? (
                    <Image
                      src={ad.thumbnailUrl}
                      alt=""
                      fill
                      sizes="240px"
                      // Meta thumbnails are small, signed and short-lived (fbcdn): load them
                      // as-is instead of caching expiring URLs in the optimiser.
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <ImageOffIcon
                      aria-hidden
                      className="absolute inset-0 m-auto size-6 text-texto-inativo"
                    />
                  )}
                  <span className="absolute top-2 left-2 rounded-chip chip-ouro px-2 py-0.5 font-display text-xs font-bold backdrop-blur-md">
                    {i + 1}º
                  </span>
                </div>
                <div className="space-y-1 p-3">
                  <p className="line-clamp-2 text-[13px] leading-snug font-semibold text-texto">
                    {ad.name}
                  </p>
                  <p className="text-xs text-texto-apagado figures-tabular">
                    <strong className="font-semibold text-texto">
                      {money(ad.costPerResult, currency)}
                    </strong>{" "}
                    por {names.singular} · {formatMetricValue(ad.results, "integer")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : ads === null ? (
        <p className="text-[13px] leading-relaxed text-texto-inativo">
          Os criativos aparecem aqui quando os dados por anúncio estiverem disponíveis. Enquanto
          isso, veja as campanhas.
        </p>
      ) : null}

      <section aria-label="Ranking de campanhas" className="space-y-3">
        <h2 className="etiqueta text-texto-apagado">
          Campanhas · menor custo por {names.singular}
        </h2>
        {ranked.length === 0 ? (
          <p className="text-[13px] text-texto-inativo">
            Nenhuma campanha com {names.pluralNoun} no período.
          </p>
        ) : (
          <ol className="space-y-3">
            {ranked.map((c) => (
              <li key={c.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 truncate text-texto">{c.name}</span>
                  <span className="shrink-0 font-semibold text-texto figures-tabular">
                    {money(c.metrics.costPerResult, currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-campo" aria-hidden>
                    <div
                      className="h-full rounded-full bg-dourado"
                      style={{ width: `${((c.metrics.results ?? 0) / maxResults) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs text-texto-apagado figures-tabular">
                    {formatMetricValue(c.metrics.results, "integer")} {names.pluralNoun}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
