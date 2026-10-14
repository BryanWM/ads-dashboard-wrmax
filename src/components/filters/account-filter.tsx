"use client";

import { CreditCardIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

import { useNavigationPending } from "@/components/layout/navigation-pending";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AccountScope, AdAccountRef } from "@/lib/domain/account-scope";
import { cn } from "@/lib/utils";

const ALL = "all";

/**
 * Narrows the client pages to one ad account (`?conta=`), or all of them. Shown only
 * when the client has 2+ accounts. "All accounts" is absent when currencies differ.
 */
export function AccountFilter({
  accounts,
  scope,
  className,
}: {
  accounts: AdAccountRef[];
  scope: AccountScope;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate } = useNavigationPending();
  if (accounts.length < 2) return null;

  const items = [
    ...(scope.allowAll ? [{ value: ALL, label: "Todas as contas" }] : []),
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  return (
    <Select
      items={items}
      value={scope.accountId ?? ALL}
      onValueChange={(next) => {
        if (typeof next !== "string") return;
        const params = new URLSearchParams(searchParams);
        if (next === ALL) params.delete("conta");
        else params.set("conta", next);
        const query = params.toString();
        navigate(query ? `${pathname}?${query}` : pathname);
      }}
    >
      <SelectTrigger
        aria-label="Conta de anúncio"
        className={cn("h-11 w-full min-w-0 lg:h-9 lg:w-64", className)}
      >
        <CreditCardIcon className="text-texto-inativo" aria-hidden />
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
