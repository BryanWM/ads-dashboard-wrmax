import { Building2Icon, PlugIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { EmptyState } from "./state-panels";

export function NoClientsState() {
  return (
    <EmptyState
      icon={<Building2Icon />}
      title="Nenhum cliente disponível"
      description="Você ainda não tem acesso a nenhum cliente. Peça a um administrador da agência para liberar o acesso."
    />
  );
}

export function NoAdAccountsState({
  clientName,
  clientId,
  audience,
}: {
  clientName: string;
  clientId: string;
  audience: "agency" | "client";
}) {
  if (audience === "client") {
    return (
      <EmptyState
        icon={<PlugIcon />}
        title="Seus relatórios estão sendo preparados"
        description="A agência ainda está configurando as contas de anúncios. Assim que estiverem conectadas, as métricas aparecem aqui automaticamente."
      />
    );
  }

  return (
    <EmptyState
      icon={<PlugIcon />}
      title="Nenhuma conta de anúncios vinculada"
      description={`${clientName} ainda não tem contas do Meta Ads associadas. Assim que uma conta for vinculada, as métricas aparecem aqui após a próxima sincronização.`}
      action={
        <Button
          render={<Link href={`/admin/ad-accounts?client=${encodeURIComponent(clientId)}`} />}
          nativeButton={false}
        >
          Vincular conta de anúncios
        </Button>
      }
    />
  );
}
