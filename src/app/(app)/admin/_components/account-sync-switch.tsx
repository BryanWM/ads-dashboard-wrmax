"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { setAccountSync } from "@/server/admin/actions";

/** Daily automatic update on/off for one ad account (needs a client to turn on). */
export function AccountSyncSwitch({
  accountId,
  accountName,
  enabled,
  hasClient,
}: {
  accountId: string;
  accountName: string;
  enabled: boolean;
  hasClient: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [checked, setOptimistic] = useOptimistic(enabled);

  return (
    <label className="inline-flex items-center gap-2.5 text-[13px] text-texto">
      <Switch
        checked={checked}
        disabled={pending || (!hasClient && !checked)}
        aria-label={`Atualização diária da conta ${accountName}`}
        onCheckedChange={(next) => {
          startTransition(async () => {
            setOptimistic(next);
            const result = await setAccountSync({ accountId, enabled: next });
            if (result.ok) {
              toast.success(next ? "Atualização diária ligada" : "Atualização diária desligada");
            } else {
              toast.error(result.formError ?? "Não foi possível atualizar a conta.");
            }
          });
        }}
      />
      {checked ? "Diária" : "Desligada"}
    </label>
  );
}
