"use client";

import { BriefcaseIcon, ChevronsUpDownIcon, EyeIcon, LogOutIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import type { ViewerView } from "@/lib/domain/access";
import { switchDemoViewer } from "@/server/auth/actions";

function initials(name: string) {
  return name
    .replace(/\(.*\)/, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({ viewer, demo }: { viewer: ViewerView; demo: boolean }) {
  const [isPending, startTransition] = useTransition();

  function switchTo(kind: "agency" | "client") {
    startTransition(async () => {
      try {
        await switchDemoViewer(kind);
        // Full navigation on purpose: another "user" must not inherit UI state that
        // Next keeps alive in <Activity> (router.push would preserve it).
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/dashboard");
      } catch {
        toast.error("Não foi possível trocar a visualização", {
          description: "Tente novamente em instantes.",
        });
      }
    });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full chip-ouro font-display text-xs font-semibold">
              {isPending ? <Spinner /> : initials(viewer.name)}
            </span>
            <span className="grid flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium">{viewer.name}</span>
              <span className="truncate text-xs text-muted-foreground">{viewer.roleLabel}</span>
            </span>
            <ChevronsUpDownIcon className="ml-auto text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-(--anchor-width) min-w-60">
            {/* Base UI requires labels inside a group. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel>{viewer.email}</DropdownMenuLabel>
            </DropdownMenuGroup>
            {demo ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs">Demonstração</DropdownMenuLabel>
                  {viewer.isAgency ? (
                    <DropdownMenuItem disabled={isPending} onClick={() => switchTo("client")}>
                      <EyeIcon />
                      Visualizar como cliente
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem disabled={isPending} onClick={() => switchTo("agency")}>
                      <BriefcaseIcon />
                      Voltar para a visão da agência
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </>
            ) : null}
            <DropdownMenuSeparator />
            {/* Full navigation on logout so <Activity> does not keep this user's UI alive. */}
            <DropdownMenuItem render={<a href="/login" />}>
              <LogOutIcon />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
