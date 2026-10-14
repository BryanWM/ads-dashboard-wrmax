import { Suspense } from "react";

import { AppSidebar, AppSidebarSkeleton } from "@/components/layout/app-sidebar";
import { NavigationPendingProvider, PendingContent } from "@/components/layout/navigation-pending";
import { Topbar } from "@/components/layout/topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { canAccessAdmin, isAgencyMember, toViewerView } from "@/lib/domain/access";
import { getViewer, isDemoMode } from "@/server/auth/session";
import { getDataSource } from "@/server/data/source";

async function SidebarLoader() {
  const viewer = await getViewer();
  const clients = await getDataSource(viewer).listClients();
  return (
    <AppSidebar
      clients={clients}
      viewer={toViewerView(viewer)}
      showAdmin={canAccessAdmin(viewer)}
      demo={isDemoMode()}
    />
  );
}

async function TopbarLoader() {
  const viewer = await getViewer();
  const hasSimulated = await getDataSource(viewer).hasSimulatedData();
  return (
    <Topbar hasSimulated={hasSimulated} clientView={!isAgencyMember(viewer)} demo={isDemoMode()} />
  );
}

/**
 * Authenticated shell. The layout itself awaits nothing (it would block every
 * page); request-bound pieces (session, clients) stream inside their own
 * Suspense boundaries. Authorization is enforced again in each data call.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <NavigationPendingProvider>
        <Suspense fallback={<AppSidebarSkeleton />}>
          <SidebarLoader />
        </Suspense>
        <SidebarInset className="min-w-0">
          <Suspense fallback={<div className="h-14 border-b border-border/70" />}>
            <TopbarLoader />
          </Suspense>
          <PendingContent>
            {/*
              overflow-x: clip (not hidden) crops transient overflow from entrance
              animations without creating a scroll container, so sticky headers keep working.
            */}
            <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-x-clip px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </PendingContent>
        </SidebarInset>
      </NavigationPendingProvider>
    </SidebarProvider>
  );
}
