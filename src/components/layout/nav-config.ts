import {
  Building2Icon,
  CreditCardIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  PlugIcon,
  RefreshCwIcon,
  ScrollTextIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Which search params survive navigation to this item. */
  keep: "period" | "client";
  /** Match only the exact path (for section roots like /admin). */
  exact?: boolean;
}

export const CLIENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboardIcon, keep: "period" },
  { href: "/campaigns", label: "Campanhas", icon: MegaphoneIcon, keep: "period" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Integrações", icon: PlugIcon, keep: "client", exact: true },
  { href: "/admin/clients", label: "Clientes", icon: Building2Icon, keep: "client" },
  { href: "/admin/ad-accounts", label: "Contas de anúncio", icon: CreditCardIcon, keep: "client" },
  { href: "/admin/sync", label: "Sincronizações", icon: RefreshCwIcon, keep: "client" },
  { href: "/admin/access", label: "Acessos", icon: UsersIcon, keep: "client" },
  { href: "/admin/audit", label: "Auditoria", icon: ScrollTextIcon, keep: "client" },
];

const PERIOD_KEYS = ["client", "conta", "period", "from", "to", "compare"] as const;

/** Builds an href that carries the selected client (and period, if relevant). */
export function scopedHref(item: Pick<NavItem, "href" | "keep">, current: URLSearchParams) {
  const keys = item.keep === "period" ? PERIOD_KEYS : (["client"] as const);
  const next = new URLSearchParams();
  for (const key of keys) {
    const value = current.get(key);
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `${item.href}?${query}` : item.href;
}

export function isActive(item: Pick<NavItem, "href" | "exact">, pathname: string) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
