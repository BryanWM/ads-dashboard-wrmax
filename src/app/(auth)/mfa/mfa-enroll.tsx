"use client";

import Image from "next/image";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { startMfaEnrollment, type MfaEnrollment } from "@/server/auth/mfa";

import { MfaVerifyForm } from "./mfa-verify-form";

/** First access of an admin: install an authenticator app, scan, confirm one code. */
export function MfaEnroll() {
  const [pending, startTransition] = useTransition();
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null);

  if (!enrollment?.factorId) {
    return (
      <div className="space-y-5">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-texto-apagado marker:text-texto-inativo">
          <li>
            Instale um aplicativo de autenticação no celular (Google Authenticator, Microsoft
            Authenticator ou 1Password).
          </li>
          <li>Toque no botão abaixo e escaneie o código que vai aparecer.</li>
          <li>Digite os 6 números que o aplicativo mostrar.</li>
        </ol>
        {enrollment?.error ? (
          <Alert role="alert" className="border-linha bg-superficie-2">
            <AlertDescription>{enrollment.error}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => startTransition(async () => setEnrollment(await startMfaEnrollment()))}
        >
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Configurar aplicativo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-texto-apagado">
        No aplicativo, toque em <strong className="text-texto">adicionar conta</strong> e escaneie:
      </p>
      <div className="mx-auto w-fit rounded-xl qr-fundo p-3">
        <Image
          src={enrollment.qr ?? ""}
          alt="Código QR para adicionar o WRMax Metrics ao aplicativo de autenticação"
          width={176}
          height={176}
          unoptimized
        />
      </div>
      <details className="text-sm text-texto-apagado">
        <summary className="cursor-pointer text-texto">Não consegue escanear?</summary>
        <p className="mt-2">Digite esta chave no aplicativo (tipo: baseada em tempo):</p>
        <code className="mt-1 block rounded-lg bg-campo px-3 py-2 font-mono text-xs break-all text-texto">
          {enrollment.secret}
        </code>
      </details>
      <MfaVerifyForm factorId={enrollment.factorId} enrolling />
    </div>
  );
}
