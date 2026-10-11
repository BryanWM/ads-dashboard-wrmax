"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { PILL_CLASS } from "@/components/filters/segmented-control";
import { PILL } from "@/components/motion/presets";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import type { ViewerView } from "@/lib/domain/access";
import type { ClientSummary } from "@/lib/domain/types";

import { BrandLogo } from "./brand-logo";
import { ClientSwitcher } from "./client-switcher";
import { ADMIN_NAV, CLIENT_NAV, isActive, scopedHref, type NavItem } from "./nav-config";
import { UserMenu } from "./user-menu";

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="h-7 etiqueta text-texto-inativo">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(item, pathname);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={item.label}
                  className="relative h-9 font-medium text-texto-inativo transition-colors duration-[450ms] hover:bg-transparent hover:text-texto-apagado data-active:bg-transparent data-active:font-semibold data-active:text-texto [&>svg]:relative"
                  render={
                    <Link
                      href={scopedHref(item, searchParams)}
                      aria-current={active ? "page" : undefined}
                      onClick={() => isMobile && setOpenMobile(false)}
                    />
                  }
                >
                  {active ? (
                    // WRMax DS · pílula deslizante (one layoutId across groups).
                    <motion.span
                      layoutId="sidebar-active-pill"
                      transition={PILL}
                      aria-hidden
                      className={PILL_CLASS}
                    />
                  ) : null}
                  <item.icon className={active ? "text-dourado" : undefined} />
                  <span className="relative">{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

interface AppSidebarProps {
  clients: ClientSummary[];
  viewer: ViewerView;
  /** Computed on the server from the viewer's role; the admin pages check it again. */
  showAdmin: boolean;
  demo: boolean;
}

export function AppSidebar({ clients, viewer, showAdmin, demo }: AppSidebarProps) {
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="gap-4">
        <div className="px-2 pt-2 group-data-[collapsible=icon]:hidden">
          <BrandLogo width={112} />
        </div>
        <ClientSwitcher clients={clients} />
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label={viewer.isAgency ? "Cliente" : "Relatórios"} items={CLIENT_NAV} />
        {showAdmin ? <NavGroup label="Administração" items={ADMIN_NAV} /> : null}
      </SidebarContent>
      <SidebarFooter>
        <UserMenu viewer={viewer} demo={demo} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function AppSidebarSkeleton() {
  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="gap-4">
        <div className="px-2 pt-2 group-data-[collapsible=icon]:hidden">
          <BrandLogo width={112} />
        </div>
        <SidebarMenuSkeleton showIcon className="h-12" />
      </SidebarHeader>
      <SidebarContent className="px-2">
        {["62%", "78%", "55%", "84%", "68%", "74%"].map((width, i) => (
          <SidebarMenuSkeleton key={i} showIcon width={width} />
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
