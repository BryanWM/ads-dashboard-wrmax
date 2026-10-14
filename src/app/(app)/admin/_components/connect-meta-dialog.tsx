"use client";

import { PlugIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { connectMeta, type MetaActionState } from "@/server/admin/meta-actions";

/**
 * Paste a Meta system-user token. It goes straight to the server action, is checked
 * with Meta, encrypted and stored — the browser never gets it back.
 */
export function ConnectMetaDialog({ reconnect = false }: { reconnect?: boolean }) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setAttempt((n) => n + 1);
      }}
    >
      {reconnect ? (
        <DialogTrigger render={<Button variant="outline" size="sm" />}>Trocar chave</DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <PlugIcon data-icon="inline-start" />
          Conectar Meta
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{reconnect ? "Trocar a chave da Meta" : "Conectar a Meta"}</DialogTitle>
          <DialogDescription>
            Cole a chave do usuário do sistema do Business Manager (permissão ads_read). Ela é
            conferida com a Meta e guardada criptografada; ninguém consegue vê-la depois.
          </DialogDescription>
        </DialogHeader>
        <ConnectForm
          key={attempt}
          onDone={(message) => {
            setOpen(false);
            toast.success("Meta conectada", { description: message });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function ConnectForm({ onDone }: { onDone: (message: string) => void }) {
  const [state, action, pending] = useActionState<MetaActionState, FormData>(async (prev, form) => {
    const result = await connectMeta(prev, form);
    if (result.ok) onDone(result.message ?? "");
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="space-y-6" autoComplete="off">
      <FieldGroup>
        <Field data-invalid={!!errors.label || undefined}>
          <FieldLabel htmlFor="meta-label">Nome da conexão</FieldLabel>
          <Input id="meta-label" name="label" defaultValue="Business Manager WRMax" />
          {errors.label ? <FieldError>{errors.label}</FieldError> : null}
        </Field>
        <Field data-invalid={!!errors.token || undefined}>
          <FieldLabel htmlFor="meta-token">Chave de acesso (token)</FieldLabel>
          <Textarea
            id="meta-token"
            name="token"
            rows={4}
            spellCheck={false}
            autoComplete="off"
            className="font-mono text-xs"
            placeholder="EAA…"
          />
          {errors.token ? (
            <FieldError>{errors.token}</FieldError>
          ) : (
            <FieldDescription>
              Não cole esta chave em nenhum outro lugar (chat, e-mail, planilha).
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>

      {state.formError ? (
        <Alert role="alert" className="border-linha bg-superficie-2">
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Conferindo com a Meta…" : "Conectar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
