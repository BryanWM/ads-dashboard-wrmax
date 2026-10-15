"use client";

import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { verifyMfa, type MfaVerifyState } from "@/server/auth/mfa";

/** 6-digit code from the authenticator app; success opens the app (session → aal2). */
export function MfaVerifyForm({ factorId, enrolling }: { factorId: string; enrolling: boolean }) {
  const [state, action, pending] = useActionState<MfaVerifyState, FormData>(verifyMfa, {});

  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="factorId" value={factorId} />
      <input type="hidden" name="enrolling" value={enrolling ? "1" : "0"} />
      <Field data-invalid={!!state.error || undefined}>
        <FieldLabel htmlFor="code">Código do aplicativo</FieldLabel>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000 000"
          maxLength={7}
          autoFocus
          className="text-center font-display text-lg tracking-[0.3em] figures-tabular"
          aria-invalid={!!state.error || undefined}
        />
      </Field>

      {state.error ? (
        <Alert role="alert" className="border-linha bg-superficie-2">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner data-icon="inline-start" /> : null}
        {enrolling ? "Ativar e entrar" : "Confirmar e entrar"}
      </Button>
    </form>
  );
}
