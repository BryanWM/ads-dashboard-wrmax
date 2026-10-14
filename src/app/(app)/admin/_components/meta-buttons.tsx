"use client";

import { DownloadCloudIcon, RefreshCwIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  refreshMetaAccounts,
  syncAccountNow,
  type MetaActionState,
} from "@/server/admin/meta-actions";

function report(result: MetaActionState, success: string) {
  if (result.ok) toast.success(success, { description: result.message });
  else toast.error(result.formError ?? "Não foi possível concluir.");
}

export function RefreshAccountsButton({ connectionId }: { connectionId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () =>
          report(await refreshMetaAccounts(connectionId), "Lista de contas atualizada"),
        )
      }
    >
      {pending ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
      Atualizar lista de contas
    </Button>
  );
}

/** Fetches this account's data from Meta now (same engine as the daily schedule). */
export function SyncNowButton({
  accountId,
  accountName,
}: {
  accountId: string;
  accountName: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`Buscar dados de ${accountName} agora`}
      onClick={() =>
        start(async () => report(await syncAccountNow(accountId), `${accountName} atualizada`))
      }
    >
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <DownloadCloudIcon data-icon="inline-start" />
      )}
      {pending ? "Buscando…" : "Buscar dados"}
    </Button>
  );
}
