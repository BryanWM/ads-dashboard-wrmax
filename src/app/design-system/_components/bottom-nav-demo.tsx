"use client";

import { Suspense } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { NavigationPendingProvider } from "@/components/layout/navigation-pending";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { ViewerView } from "@/lib/domain/access";
import type { ClientSummary } from "@/lib/domain/types";

import { CatalogSection } from "./section";

const CLIENTS: ClientSummary[] = [
  "Pizzaria Demonstração",
  "Auto Center Modelo",
  "Clínica Exemplo",
].map((name, i) => ({
  id: `demo-${i}`,
  name,
  currency: "BRL",
  timezone: "America/Sao_Paulo",
  adAccountCount: 1,
  objective: null,
  costPerResultGoal: null,
}));

const AGENCY: ViewerView = {
  name: "Ana Administradora",
  email: "ana@example.com",
  role: "admin",
  roleLabel: "Agência",
  isAgency: true,
};
const CLIENT: ViewerView = {
  ...AGENCY,
  name: "Carla",
  role: "client",
  roleLabel: "Cliente",
  isAgency: false,
};

function Phone({ label, viewer }: { label: string; viewer: ViewerView }) {
  return (
    <figure className="w-full max-w-sm space-y-2">
      <figcaption className="etiqueta text-texto-inativo">{label}</figcaption>
      <div className="overflow-hidden rounded-2xl border border-linha bg-fundo">
        <div className="h-24" />
        <BottomNav clients={CLIENTS} viewer={viewer} className="static md:block" />
      </div>
    </figure>
  );
}

/** The phone navigation bar, shown in place (in the app it is fixed and phone-only). */
export function BottomNavDemo() {
  return (
    <CatalogSection
      id="navegacao-mobile"
      title="Navegação no celular"
      description="Barra inferior abaixo de 768 px. Agência: Clientes abre o seletor e Mais abre o menu completo. Cliente: Conta abre perfil e sair."
    >
      <SidebarProvider className="min-h-0">
        <NavigationPendingProvider>
          <Suspense>
            <div className="flex w-full flex-col gap-6 sm:flex-row">
              <Phone label="Agência" viewer={AGENCY} />
              <Phone label="Cliente" viewer={CLIENT} />
            </div>
          </Suspense>
        </NavigationPendingProvider>
      </SidebarProvider>
    </CatalogSection>
  );
}
