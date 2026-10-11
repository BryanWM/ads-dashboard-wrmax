"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/feedback/state-panels";
import { StatusDot } from "@/components/feedback/status-dot";
import { SegmentedControl, type SegmentOption } from "@/components/filters/segmented-control";
import { Card } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CampaignRow, CampaignStatus } from "@/lib/domain/types";
import { formatMetricValue, MISSING } from "@/lib/format";
import { METRICS, type MetricKey } from "@/lib/metrics/definitions";
import { aggregateComponents, deriveMetrics } from "@/lib/metrics/derive";
import { resultLabel } from "@/lib/metrics/result-types";
import { cn } from "@/lib/utils";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
});

const helper = createColumnHelper<typeof features, CampaignRow>();

const STATUS_LABEL: Record<CampaignStatus, string> = {
  active: "Ativa",
  paused: "Pausada",
  archived: "Arquivada",
};

type StatusFilter = "all" | CampaignStatus;

const STATUS_FILTERS: SegmentOption<StatusFilter>[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "paused", label: "Pausadas" },
];

const NUMERIC: MetricKey[] = [
  "spend",
  "impressions",
  "linkClicks",
  "linkCtr",
  "linkCpc",
  "cpm",
  "results",
  "costPerResult",
];

function metricColumn(metric: MetricKey, currency: string) {
  return helper.accessor(
    // Missing values become undefined so `sortUndefined: "last"` keeps them at the
    // bottom in both directions instead of sorting them as zero.
    (row) => row.metrics[metric] ?? undefined,
    {
      id: metric,
      header: METRICS[metric].label,
      sortFn: "basic",
      sortUndefined: "last",
      sortDescFirst: true,
      cell: (info) => {
        const value = info.getValue();
        if (metric === "results" && info.row.original.resultIndicator) {
          return (
            <span title={resultLabel(info.row.original.resultIndicator)}>
              {formatMetricValue(value ?? null, "integer")}
            </span>
          );
        }
        return formatMetricValue(value ?? null, METRICS[metric].format, { currency });
      },
    },
  );
}

export function CampaignsTable({
  campaigns,
  currency,
}: {
  campaigns: CampaignRow[];
  currency: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sorting, setSorting] = useState<SortingState>([{ id: "spend", desc: true }]);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return campaigns.filter(
      (c) =>
        (status === "all" || c.status === status) &&
        (q === "" || c.name.toLocaleLowerCase("pt-BR").includes(q)),
    );
  }, [campaigns, query, status]);

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("name", {
          header: "Campanha",
          sortFn: "alphanumeric",
          cell: (info) => (
            <div className="min-w-56">
              <p className="font-medium">{info.getValue()}</p>
              <p className="text-xs text-muted-foreground">
                {info.row.original.objectiveLabel} ·{" "}
                {resultLabel(info.row.original.resultIndicator)}
              </p>
            </div>
          ),
        }),
        helper.accessor("status", {
          header: "Status",
          enableSorting: false,
          cell: (info) => (
            <span className="inline-flex items-center gap-2 text-[13px] whitespace-nowrap text-texto">
              <StatusDot tone={info.getValue() === "active" ? "ok" : "neutro"} />
              {STATUS_LABEL[info.getValue()]}
            </span>
          ),
        }),
        ...NUMERIC.map((m) => metricColumn(m, currency)),
      ]),
    [currency],
  );

  const table = useTable({
    features,
    columns,
    data: visible,
    state: { sorting },
    onSortingChange: setSorting,
  });

  // Totals recomputed from summed components — never by adding up rates.
  const totals = deriveMetrics(aggregateComponents(visible.map((c) => c.components)));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            placeholder="Buscar campanha"
            aria-label="Buscar campanha"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>
        <SegmentedControl
          aria-label="Filtrar por status"
          value={status}
          onChange={setStatus}
          options={STATUS_FILTERS}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<SearchIcon />}
          title="Nenhuma campanha encontrada"
          description="Ajuste a busca ou o filtro de status."
        />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header, i) => {
                    const sorted = header.column.getIsSorted();
                    const numeric = i > 1;
                    return (
                      <TableHead
                        key={header.id}
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : undefined
                        }
                        className={cn(
                          numeric && "text-right",
                          i === 0 && "pl-5",
                          i === group.headers.length - 1 && "pr-5",
                        )}
                      >
                        {header.column.getCanSort() ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                              numeric && "flex-row-reverse",
                              sorted && "text-foreground",
                            )}
                          >
                            <table.FlexRender header={header} />
                            {sorted === "asc" ? (
                              <ArrowUpIcon className="size-3.5" aria-hidden />
                            ) : sorted === "desc" ? (
                              <ArrowDownIcon className="size-3.5" aria-hidden />
                            ) : (
                              <ArrowUpDownIcon className="size-3.5 opacity-40" aria-hidden />
                            )}
                          </button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="figures-tabular">
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell, i, all) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        i > 1 && "text-right",
                        i === 0 && "pl-5",
                        i === all.length - 1 && "pr-5",
                      )}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="figures-tabular">
              <TableRow>
                <TableCell className="pl-5 font-medium">
                  Total · {visible.length} {visible.length === 1 ? "campanha" : "campanhas"}
                </TableCell>
                <TableCell />
                {NUMERIC.map((m, i) => (
                  <TableCell
                    key={m}
                    className={cn("text-right font-medium", i === NUMERIC.length - 1 && "pr-5")}
                    title={
                      (m === "results" || m === "costPerResult") && totals.mixedResultTypes
                        ? "Tipos de resultado diferentes não são somados"
                        : undefined
                    }
                  >
                    {(m === "results" || m === "costPerResult") && totals.mixedResultTypes
                      ? MISSING
                      : formatMetricValue(totals[m], METRICS[m].format, { currency })}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          </Table>
        </Card>
      )}
      {totals.mixedResultTypes && visible.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          O total de resultados não é exibido porque as campanhas filtradas otimizam para tipos de
          resultado diferentes.
        </p>
      ) : null}
    </div>
  );
}
