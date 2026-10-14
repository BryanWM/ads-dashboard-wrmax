"use client";

import { Building2Icon, CheckIcon, MenuIcon, UserIcon, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

import { PILL_CLASS } from "@/components/filters/segmented-control";
import { PILL } from "@/components/motion/presets";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSidebar } from "@/components/ui/sidebar";
import type { ViewerView } from "@/lib/domain/access";
import type { ClientSummary } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

import { CLIENT_NAV, isActive, scopedHref } from "./nav-config";
import { clientInitials, useSelectClient } from "./use-select-client";

const ITEM =
  "relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-chip px-1 text-xs font-semibold text-texto-inativo outline-none transition-colors duration-[450ms] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dourado";

function ItemContent({
  icon: Icon,
  label,
  active,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <>
      {active ? (
        // WRMax DS · pílula deslizante (shared layoutId across the bar).
        <motion.span
          layoutId="bottom-nav-pill"
          transition={PILL}
          aria-hidden
          className={PILL_CLASS}
        />
      ) : null}
      <Icon aria-hidden className={cn("relative size-5", active && "text-dourado")} />
      <span className={cn("relative truncate", active && "text-texto")}>{label}</span>
    </>
  );
}

function ClientPicker({
  clients,
  open,
  onOpenChange,
}: {
  clients: ClientSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { selected, select } = useSelectClient(clients);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[80svh] gap-0 overflow-y-auto rounded-t-2xl border-t border-linha-2 bg-superficie pb-[env(safe-area-inset-bottom)]"
      >
        <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-linha-2" />
        <SheetHeader className="px-5 pt-4 pb-2">
          <SheetTitle className="font-display text-lg font-bold text-texto">Clientes</SheetTitle>
          <SheetDescription className="text-texto-apagado">
            Escolha o cliente para ver os resultados.
          </SheetDescription>
        </SheetHeader>
        <ul className="px-3 pb-4">
          {clients.map((client) => {
            const current = client.id === selected?.id;
            return (
              <li key={client.id}>
                <button
                  type="button"
                  aria-current={current || undefined}
                  onClick={() => {
                    onOpenChange(false);
                    if (!current) select(client.id);
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left text-sm text-texto outline-none hover:bg-superficie-2 focus-visible:outline-2 focus-visible:outline-dourado"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg chip-ouro font-display text-xs font-semibold">
                    {clientInitials(client.name)}
                  </span>
                  <span className="flex-1 truncate font-medium">{client.name}</span>
                  {current ? (
                    <CheckIcon className="size-4 text-dourado" aria-label="Selecionado" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Phones only (< 768px, hidden by CSS so nothing flickers): the main sections at
 * thumb reach. "Mais"/"Conta" open the full menu (admin pages, profile, sign out);
 * "Clientes" (agency with several clients) opens a client picker.
 */
export function BottomNav({
  clients,
  viewer,
  className,
}: {
  clients: ClientSummary[];
  viewer: ViewerView;
  /** Catalog preview only (renders in place instead of fixed). */
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setOpenMobile } = useSidebar();
  const [picking, setPicking] = useState(false);
  const showClients = viewer.isAgency && clients.length > 1;
  const inMenu = pathname.startsWith("/admin");

  const buttons: ReactNode[] = [];
  if (showClients) {
    buttons.push(
      <button key="clients" type="button" className={ITEM} onClick={() => setPicking(true)}>
        <ItemContent icon={Building2Icon} label="Clientes" active={false} />
      </button>,
    );
  }
  buttons.push(
    <button
      key="menu"
      type="button"
      className={cn(ITEM, inMenu && "text-texto")}
      aria-current={inMenu ? "page" : undefined}
      onClick={() => setOpenMobile(true)}
    >
      <ItemContent
        icon={viewer.isAgency ? MenuIcon : UserIcon}
        label={viewer.isAgency ? "Mais" : "Conta"}
        active={inMenu}
      />
    </button>,
  );

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-linha surface-glass px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden",
          className,
        )}
      >
        <div className="mx-auto flex max-w-md items-stretch gap-1">
          {CLIENT_NAV.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={scopedHref(item, searchParams)}
                aria-current={active ? "page" : undefined}
                className={cn(ITEM, active && "text-texto")}
              >
                <ItemContent icon={item.icon} label={item.label} active={active} />
              </Link>
            );
          })}
          {buttons}
        </div>
      </nav>
      {showClients ? (
        <ClientPicker clients={clients} open={picking} onOpenChange={setPicking} />
      ) : null}
    </>
  );
}
