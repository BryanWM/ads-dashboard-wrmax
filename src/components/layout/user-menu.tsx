"use client";

import {
  BriefcaseIcon,
  ChevronsUpDownIcon,
  EyeIcon,
  LogOutIcon,
  MonitorSmartphoneIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { useTheme } from "@/hooks/use-theme";
import type { ViewerView } from "@/lib/domain/access";
import { parsePreference } from "@/lib/theme";
import { switchDemoViewer } from "@/server/auth/actions";

const THEME_OPTIONS = [
  { value: "auto", label: "Automático", Icon: MonitorSmartphoneIcon },
  { value: "claro", label: "Claro", Icon: SunIcon },
  { value: "escuro", label: "Escuro", Icon: MoonIcon },
] as const;

/** Light/dark choice; "Automático" follows the device. */
function ThemeOptions() {
  const { preference, setPreference } = useTheme();
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="text-xs">Tema</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={preference}
        onValueChange={(value) => setPreference(parsePreference(String(value)))}
      >
        {THEME_OPTIONS.map(({ value, label, Icon }) => (
          <DropdownMenuRadioItem key={value} value={value} closeOnClick={false}>
            <Icon />
            {label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  );
}

function initials(name: string) {
  return name
    .replace(/\(.*\)/, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const SIGN_OUT_FORM = "sign-out-form";

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
            <ThemeOptions />
            <DropdownMenuSeparator />
            {/*
              Native POST + 303 = full navigation, so <Activity> does not keep this
              person's screens alive after signing out.
            */}
            <DropdownMenuItem
              onClick={() => {
                const form = document.getElementById(SIGN_OUT_FORM) as HTMLFormElement | null;
                form?.requestSubmit();
              }}
            >
              <LogOutIcon />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <form id={SIGN_OUT_FORM} method="post" action="/auth/sign-out" hidden />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
