import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminNeedsMfa, mfaStep, type MembershipRole } from "@/lib/auth/mfa";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createUserSupabase } from "@/server/supabase/server";

import { MfaEnroll } from "./mfa-enroll";
import { MfaVerifyForm } from "./mfa-verify-form";

export const metadata: Metadata = {
  title: "Verificação em duas etapas",
  robots: { index: false, follow: false },
};

async function MfaCard() {
  if (!isSupabaseConfigured()) redirect("/dashboard");
  // Verifying the JWT reads the clock: request time only.
  await connection();
  const supabase = await createUserSupabase();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");

  // Own membership stays readable without MFA (ADR-016), so the role is known here.
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", claims.sub)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  const role = (membership?.role as MembershipRole | undefined) ?? null;
  if (!adminNeedsMfa(role, claims.aal)) redirect("/dashboard");

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = factors?.totp?.[0] ?? null;
  const step = mfaStep(verified !== null);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>
          {step === "verify" ? "Verificação em duas etapas" : "Proteja o acesso da agência"}
        </CardTitle>
        <CardDescription>
          {step === "verify"
            ? "Abra o aplicativo de autenticação no celular e digite o código de 6 números do WRMax Metrics."
            : "Quem administra vê os dados de todos os clientes. Por isso, além da senha, o acesso pede um código gerado no seu celular."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {verified ? <MfaVerifyForm factorId={verified.id} enrolling={false} /> : <MfaEnroll />}
        <form action="/auth/sign-out" method="post" className="flex justify-center">
          <Button type="submit" variant="link" className="text-texto-apagado">
            Sair e entrar com outra conta
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function MfaPage() {
  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="flex justify-center">
        <BrandLogo width={160} />
      </div>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <MfaCard />
      </Suspense>
    </div>
  );
}
