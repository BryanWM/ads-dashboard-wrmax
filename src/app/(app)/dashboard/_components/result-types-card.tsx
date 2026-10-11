import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ResultTypeBreakdown } from "@/lib/metrics/derive";
import { formatMetricValue } from "@/lib/format";
import { resultLabel } from "@/lib/metrics/result-types";

/** Results per type: shown when the period mixes objectives (never summed together). */
export function ResultTypesCard({
  resultTypes,
  currency,
}: {
  resultTypes: ResultTypeBreakdown[];
  currency: string;
}) {
  if (resultTypes.length < 2) return null;
  const money = (v: number | null) => formatMetricValue(v, "currency", { currency });

  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>Resultados por tipo</CardTitle>
        <CardDescription>
          As campanhas deste período otimizam para resultados diferentes, que não podem ser somados
          em um único número.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Tipo de resultado</TableHead>
              <TableHead className="text-right">Resultados</TableHead>
              <TableHead className="text-right">Investimento</TableHead>
              <TableHead className="pr-5 text-right">Custo por resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="figures-tabular">
            {resultTypes.map((r) => (
              <TableRow key={r.resultIndicator}>
                <TableCell className="pl-5 font-medium">{resultLabel(r.resultIndicator)}</TableCell>
                <TableCell className="text-right">
                  {formatMetricValue(r.results, "integer")}
                </TableCell>
                <TableCell className="text-right">{money(r.spend)}</TableCell>
                <TableCell className="pr-5 text-right">{money(r.costPerResult)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
