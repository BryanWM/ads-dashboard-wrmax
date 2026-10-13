import { InfoIcon, LockIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/feedback/state-panels";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** States plainly that admin writes are not wired yet (no fake buttons). */
export function ReadOnlyNotice() {
  return (
    <Alert>
      <InfoIcon />
      <AlertDescription>
        Visualização somente leitura. Criar, editar e vincular registros será habilitado com o
        backend e as permissões (Fase 5); a conexão real com a Meta chega na Fase 6.
      </AlertDescription>
    </Alert>
  );
}

export function AdminTableCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="pb-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-0">{children}</CardContent>
    </Card>
  );
}

/** Rendered when the server refuses the admin read model (not the agency admin). */
export function AdminAccessDenied() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <EmptyState
        className="max-w-lg"
        icon={<LockIcon />}
        title="Acesso restrito"
        description="Esta área é exclusiva para administradores da agência. Se você precisa de acesso, fale com o responsável pela sua conta."
        action={
          <Button variant="outline" render={<Link href="/dashboard" />} nativeButton={false}>
            Ir para a visão geral
          </Button>
        }
      />
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div className="space-y-6" aria-busy aria-label="Carregando">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
