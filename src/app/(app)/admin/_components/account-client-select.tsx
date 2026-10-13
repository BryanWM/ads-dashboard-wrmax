"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignAdAccount } from "@/server/admin/actions";

const NONE = "none";

/** Associates an ad account with a client; its whole history follows (DB trigger). */
export function AccountClientSelect({
  accountId,
  accountName,
  clientId,
  clients,
}: {
  accountId: string;
  accountName: string;
  clientId: string | null;
  clients: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [value, setOptimistic] = useOptimistic(clientId ?? NONE);
  const items = [
    { value: NONE, label: "Sem cliente" },
    ...clients.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <Select
      items={items}
      value={value}
      disabled={pending}
      onValueChange={(next) => {
        if (typeof next !== "string" || next === value) return;
        startTransition(async () => {
          setOptimistic(next);
          const result = await assignAdAccount({
            accountId,
            clientId: next === NONE ? null : next,
          });
          if (result.ok) toast.success("Conta atualizada");
          else toast.error(result.formError ?? "Não foi possível atualizar a conta.");
        });
      }}
    >
      <SelectTrigger className="w-56 max-w-full" aria-label={`Cliente da conta ${accountName}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
