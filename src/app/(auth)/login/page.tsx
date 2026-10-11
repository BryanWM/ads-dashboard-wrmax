import type { Metadata } from "next";

import { BrandLogo } from "@/components/layout/brand-logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="flex flex-col items-center gap-6 text-center">
        <BrandLogo width={160} />
        <div className="space-y-2">
          <p className="text-ouro etiqueta">Métricas de tráfego pago</p>
          <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight text-texto">
            Suas campanhas em <span className="text-ouro">foco</span>
          </h1>
        </div>
      </div>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Use o e-mail cadastrado pela sua agência.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
