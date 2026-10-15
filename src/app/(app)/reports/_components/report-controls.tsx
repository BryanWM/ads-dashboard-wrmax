"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { CompareToggle, PeriodPicker } from "@/components/filters/period-picker";
import { SegmentedControl, type SegmentOption } from "@/components/filters/segmented-control";
import { useNavigationPending } from "@/components/layout/navigation-pending";
import { withPeriod } from "@/lib/dates/period-params";
import type { DateRange, PeriodPreset } from "@/lib/dates/periods";
import { REPORT_TEMPLATES, TEMPLATE_LABELS, type ReportTemplate } from "@/lib/reports/build-report";
import type { ReportPeriodKind } from "@/lib/reports/report-period";

import { ReportDayPicker } from "./report-day-picker";

const TEMPLATE_OPTIONS: SegmentOption<ReportTemplate>[] = REPORT_TEMPLATES.map((value) => ({
  value,
  label: TEMPLATE_LABELS[value],
}));

const TEMPLATE_HINTS: Record<ReportTemplate, string> = {
  rapido: "Resumo rápido: totais e comparação. Bom para mandar todo dia.",
  campanhas: "Por campanha: totais e o resultado de cada campanha.",
  completo:
    "Completo: por campanha, mais alcance, cliques, funil e o anúncio campeão. Bom para fechar a semana ou o mês.",
};

type QuickPeriod = "ontem" | "last_7d" | "this_month" | "last_month";

const PERIOD_OPTIONS: SegmentOption<QuickPeriod>[] = [
  { value: "ontem", label: "Ontem" },
  { value: "last_7d", label: "7 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês ant." },
];

/** Template, period and comparison of the report; every change is a URL change. */
export function ReportControls({
  template,
  kind,
  preset,
  range,
  today,
  yesterday,
  compare,
}: {
  template: ReportTemplate;
  kind: ReportPeriodKind;
  preset: PeriodPreset | null;
  range: DateRange;
  today: string;
  yesterday: string;
  compare: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate } = useNavigationPending();
  const quick = PERIOD_OPTIONS.some((o) => o.value === kind) ? (kind as QuickPeriod) : null;

  function go(params: URLSearchParams) {
    navigate(`${pathname}?${params.toString()}`);
  }

  return (
    <section
      aria-label="Opções do relatório"
      className="space-y-6 rounded-2xl border border-linha bg-superficie p-4 sm:p-5"
    >
      <div className="space-y-2.5">
        <h2 className="etiqueta text-texto-apagado">Modelo</h2>
        <SegmentedControl
          aria-label="Modelo do relatório"
          size="lg"
          fill
          options={TEMPLATE_OPTIONS}
          value={template}
          onChange={(next) => {
            const params = new URLSearchParams(searchParams);
            params.set("modelo", next);
            go(params);
          }}
        />
        <p className="text-xs text-texto-inativo">{TEMPLATE_HINTS[template]}</p>
      </div>

      <div className="space-y-2.5">
        <h2 className="etiqueta text-texto-apagado">Período</h2>
        <SegmentedControl
          aria-label="Período do relatório"
          size="lg"
          fill
          options={PERIOD_OPTIONS}
          value={quick}
          onChange={(next) =>
            go(
              next === "ontem"
                ? withPeriod(searchParams, { range: { from: yesterday, to: yesterday } })
                : withPeriod(searchParams, { preset: next }),
            )
          }
        />
        <div className="flex items-center gap-2">
          <ReportDayPicker
            day={kind === "dia" || kind === "ontem" ? range.from : yesterday}
            active={kind === "dia"}
            today={today}
          />
          <PeriodPicker
            variant="chip"
            active={kind === "outro"}
            preset={preset}
            range={range}
            today={today}
          />
        </div>
      </div>

      <div className="space-y-2">
        <CompareToggle compare={compare} />
        <p className="text-xs text-texto-inativo">
          Um dia é comparado com o mesmo dia da semana anterior (quarta com quarta).
        </p>
      </div>
    </section>
  );
}
