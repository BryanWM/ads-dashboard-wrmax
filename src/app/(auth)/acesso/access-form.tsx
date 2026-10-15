"use client";

import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { MIN_PASSWORD_LENGTH } from "@/lib/admin/schemas";
import { acceptAccess, type AcceptAccessState } from "@/server/auth/accept-access";

export function AccessForm({
  tokenHash,
  type,
}: {
  tokenHash: string;
  type: "invite" | "recovery";
}) {
  const [state, action, pending] = useActionState<AcceptAccessState, FormData>(acceptAccess, {});
  const errors = state.fieldErrors ?? {};

  if (!tokenHash) {
    return (
      <Alert role="alert" className="border-linha bg-superficie-2">
        <AlertDescription>Link incompleto. Peça um novo link à sua agência.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={action} noValidate className="space-y-5">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <FieldGroup>
        <Field data-invalid={!!errors.password || undefined}>
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password || undefined}
            aria-describedby="password-help"
          />
          {errors.password ? (
            <FieldError>{errors.password}</FieldError>
          ) : (
            <FieldDescription id="password-help">
              Pelo menos {MIN_PASSWORD_LENGTH} caracteres. Dica: use uma frase fácil de lembrar,
              como “pizza de quinta com amigos”.
            </FieldDescription>
          )}
        </Field>
        <Field data-invalid={!!errors.confirm || undefined}>
          <FieldLabel htmlFor="confirm">Repita a senha</FieldLabel>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm || undefined}
          />
          {errors.confirm ? <FieldError>{errors.confirm}</FieldError> : null}
        </Field>
      </FieldGroup>

      {state.formError ? (
        <Alert role="alert" className="border-linha bg-superficie-2">
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Spinner data-icon="inline-start" /> : null}
        Salvar senha e entrar
      </Button>
    </form>
  );
}
