"use client";

import { EyeIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import { SimulatedDataBadge } from "@/components/feedback/simulated-data-badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { ADMIN_NAV, CLIENT_NAV, isActive } from "./nav-config";
import { PendingBar } from "./navigation-pending";

function SectionTitle({ clientView }: { clientView: boolean }) {
  const pathname = usePathname();
  const admin = pathname.startsWith("/admin");
  const item = [...CLIENT_NAV, ...ADMIN_NAV].find((i) => isActive(i, pathname));
  const section = admin ? "Administração" : clientView ? "Relatórios" : "Cliente";
  return (
    <p className="flex min-w-0 items-baseline gap-2 truncate">
      <span className="etiqueta text-texto-inativo">{section}</span>
      {item ? (
        <span className="truncate text-sm font-semibold text-texto">{item.label}</span>
      ) : null}
    </p>
  );
}

interface TopbarProps {
  /** The viewer can see some simulated rows (only used on admin pages). */
  hasSimulated: boolean;
  clientView: boolean;
  /** Demo mode: everything is simulated, and the client experience can be previewed. */
  demo: boolean;
}

/**
 * Badge rule: demo mode → always "Dados simulados". With Supabase, client pages show
 * their own badge from the numbers they render (a real client never gets one); admin
 * lists, which mix real and demo clients, show "Inclui dados simulados" here.
 */
function TopbarBadge({ hasSimulated, demo }: { hasSimulated: boolean; demo: boolean }) {
  const pathname = usePathname();
  if (demo) return <SimulatedDataBadge />;
  if (hasSimulated && pathname.startsWith("/admin")) return <SimulatedDataBadge scope="some" />;
  return null;
}

export function Topbar({ hasSimulated, clientView, demo }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-linha surface-glass px-3 sm:px-4 md:rounded-t-2xl">
      {/* Phones navigate with the bottom bar (its "Mais/Conta" opens this menu). */}
      <SidebarTrigger className="hidden md:-ml-1 md:inline-flex md:size-8" />
      <Separator orientation="vertical" className="mr-1 hidden h-4 bg-linha md:block" />
      <div className="min-w-0 flex-1">
        <SectionTitle clientView={clientView} />
      </div>
      {clientView && demo ? (
        <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-chip chip-ouro px-2.5 text-xs font-semibold">
          <EyeIcon className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Visão do cliente</span>
          <span className="sm:hidden">Cliente</span>
        </span>
      ) : null}
      <TopbarBadge hasSimulated={hasSimulated} demo={demo} />
      <PendingBar />
    </header>
  );
}
