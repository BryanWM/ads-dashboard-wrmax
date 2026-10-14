"use client";

import { usePathname, useSearchParams } from "next/navigation";

import type { ClientSummary } from "@/lib/domain/types";

import { useNavigationPending } from "./navigation-pending";

/** Current client (from `?client=`) and a function to switch to another one. */
export function useSelectClient(clients: ClientSummary[]) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate } = useNavigationPending();

  const selectedId = searchParams.get("client");
  const selected = clients.find((c) => c.id === selectedId) ?? clients[0] ?? null;

  function select(id: string) {
    const params = new URLSearchParams(searchParams);
    params.set("client", id);
    params.delete("conta"); // an ad account belongs to one client only
    // Admin pages are organisation-wide; switching client goes to that client's overview.
    const target = pathname.startsWith("/admin") ? "/dashboard" : pathname;
    navigate(`${target}?${params.toString()}`);
  }

  return { selected, select };
}

export function clientInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
