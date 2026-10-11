"use client";

import { FlaskConicalIcon, InfoIcon } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha tem pelo menos 8 caracteres."),
});

type Errors = Partial<Record<"email" | "password", string>>;

/**
 * Phase 4: client-side validation only. Credentials are never sent anywhere —
 * Supabase Auth (server-side, Phase 5) replaces the notice below.
 */
export function LoginForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        next[key] ??= issue.message;
      }
      setErrors(next);
      setNotice(false);
      return;
    }
    setErrors({});
    setNotice(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FieldGroup>
        <Field data-invalid={!!errors.email || undefined}>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@empresa.com.br"
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
            aria-invalid={!!errors.password || undefined}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password ? <FieldError id="password-error">{errors.password}</FieldError> : null}
        </Field>
      </FieldGroup>

      {notice ? (
        <Alert role="status" className="border-linha bg-superficie-2">
          <InfoIcon className="text-dourado" />
          <AlertTitle>Login ainda não habilitado</AlertTitle>
          <AlertDescription>
            A autenticação será ativada junto com o backend (Fase 5). Nenhum dado foi enviado. Use o
            modo demonstração para explorar a interface.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2.5">
        <Button type="submit" size="lg" className="w-full">
          Entrar
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          render={<Link href="/dashboard" />}
          nativeButton={false}
        >
          <FlaskConicalIcon data-icon="inline-start" />
          Explorar com dados simulados
        </Button>
      </div>
    </form>
  );
}
