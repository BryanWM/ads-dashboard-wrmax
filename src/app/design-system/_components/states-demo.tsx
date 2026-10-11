import { PlugIcon, RefreshCwIcon } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/feedback/state-panels";
import { KpiCardSkeleton } from "@/components/metrics/kpi-card";
import { Button } from "@/components/ui/button";

import { CatalogSection } from "./section";

export function StatesDemo() {
  return (
    <CatalogSection
      id="estados"
      title="Carregamento, vazio e erro"
      description="Skeletons reproduzem o formato do conteúdo real. Estados vazios e de erro explicam o motivo e oferecem a próxima ação."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <EmptyState
          icon={<PlugIcon />}
          title="Nenhuma conta de anúncios conectada"
          description="Conecte o Meta Ads e selecione as contas deste cliente para começar a sincronizar métricas."
          action={<Button>Conectar Meta Ads</Button>}
        />
        <ErrorState
          title="Não foi possível atualizar os dados"
          description="A última sincronização falhou por limite de requisições da Meta. Os dados exibidos são de 08/10/2026, 06:12."
          action={
            <Button variant="outline">
              <RefreshCwIcon data-icon="inline-start" />
              Tentar novamente
            </Button>
          }
        />
      </div>
    </CatalogSection>
  );
}
