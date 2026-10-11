"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { ClientSummary } from "@/lib/domain/types";

import { useNavigationPending } from "./navigation-pending";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function ClientSwitcher({ clients }: { clients: ClientSummary[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate } = useNavigationPending();
  const { isMobile, setOpenMobile } = useSidebar();

  const selectedId = searchParams.get("client");
  const selected = clients.find((c) => c.id === selectedId) ?? clients[0];

  function select(id: string) {
    const params = new URLSearchParams(searchParams);
    params.set("client", id);
    if (isMobile) setOpenMobile(false);
    // Admin pages are organisation-wide; switching client goes to that client's overview.
    const target = pathname.startsWith("/admin") ? "/dashboard" : pathname;
    navigate(`${target}?${params.toString()}`);
  }

  if (!selected) return null;

  const identity = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg chip-ouro font-display text-xs font-semibold">
        {initials(selected.name)}
      </span>
      <span className="grid flex-1 text-left leading-tight">
        <span className="truncate text-sm font-medium">{selected.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {selected.adAccountCount === 1
            ? "1 conta de anúncios"
            : `${selected.adAccountCount} contas de anúncios`}
        </span>
      </span>
    </>
  );

  // A single visible client (typical for client users): nothing to switch.
  if (clients.length === 1) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex h-12 items-center gap-2 px-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0">
            {identity}
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent" />}
          >
            {identity}
            <ChevronsUpDownIcon className="ml-auto text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--anchor-width) min-w-60" align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Clientes</DropdownMenuLabel>
              {clients.map((client) => (
                <DropdownMenuItem key={client.id} onClick={() => select(client.id)}>
                  <span className="flex size-6 items-center justify-center rounded-md chip-ouro text-[10px] font-semibold">
                    {initials(client.name)}
                  </span>
                  <span className="flex-1 truncate">{client.name}</span>
                  {client.id === selected.id ? <CheckIcon className="text-dourado" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
