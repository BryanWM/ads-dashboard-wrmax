import type { Metadata } from "next";
import { Suspense } from "react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { AccessForm } from "./access-form";

// The URL carries a one-time token: never index it, never leak it in Referer.
export const metadata: Metadata = {
  title: "Criar senha",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function AccessCard({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const type = params.type === "recovery" ? "recovery" : "invite";
  const isNew = type === "invite";
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>{isNew ? "Crie sua senha" : "Defina uma nova senha"}</CardTitle>
        <CardDescription>
          {isNew
            ? "Sua agência liberou seu acesso aos resultados dos anúncios. Escolha uma senha para entrar."
            : "Escolha uma nova senha para voltar a acessar seus resultados."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AccessForm tokenHash={tokenHash} type={type} />
      </CardContent>
    </Card>
  );
}

export default function AccessPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="flex justify-center">
        <BrandLogo width={160} />
      </div>
      <Suspense fallback={<Skeleton className="h-80 w-full rounded-2xl" />}>
        <AccessCard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
