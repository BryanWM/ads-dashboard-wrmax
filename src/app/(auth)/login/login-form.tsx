"use client";

import { FlaskConicalIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { signIn, type SignInState } from "@/server/auth/sign-in";

/**
 * Supabase mode: e-mail + password checked on the server (Server Action).
 * Demo mode: only the "explore" button works; the form explains why.
 */
export function LoginForm({ demo }: { demo: boolean }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="space-y-5">
      <FieldGroup>
        <Field data-invalid={!!errors.email || undefined}>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@empresa.com.br"
            defaultValue={state.email}
            disabled={demo}
            aria-invalid={!!errors.email || undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email ? <FieldError id="email-error">{errors.email}</FieldError> : null}
        </Field>
        <Field data-invalid={!!errors.password || undefined}>
          <FieldLabel htmlFor="password">Senha</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Digite sua senha"
            disabled={demo}
            aria-invalid={!!errors.password || undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password ? <FieldError id="password-error">{errors.password}</FieldError> : null}
        </Field>
      </FieldGroup>

      {state.formError ? (
        <Alert role="alert" className="border-linha bg-superficie-2">
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2.5">
        {demo ? (
          <Button
            size="lg"
            className="w-full"
            render={<Link href="/dashboard" />}
            nativeButton={false}
          >
            <FlaskConicalIcon data-icon="inline-start" />
            Explorar com dados simulados
          </Button>
        ) : (
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Entrar
          </Button>
        )}
      </div>
    </form>
  );
}
