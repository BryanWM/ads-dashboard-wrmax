"use client";

import { UserPlusIcon } from "lucide-react";
import { useActionState, useState } from "react";

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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { createClientAccess, type AccessLinkState } from "@/server/admin/actions";

import { AccessLinkPanel } from "./access-link-panel";

type Clients = { id: string; name: string }[];

/** Creates a client's login and shows the one-time link to send them. */
export function CreateAccessDialog({ clients }: { clients: Clients }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <Dialog onOpenChange={(open) => open && setAttempt((n) => n + 1)}>
      <DialogTrigger render={<Button disabled={clients.length === 0} />}>
        <UserPlusIcon data-icon="inline-start" />
        Criar acesso de cliente
      </DialogTrigger>
      <DialogContent>
        {/* Keyed: every opening starts a new form; a previous link never reappears. */}
        <CreateAccessBody key={attempt} clients={clients} />
      </DialogContent>
    </Dialog>
  );
}

function CreateAccessBody({ clients }: { clients: Clients }) {
  const [state, action, pending] = useActionState<AccessLinkState, FormData>(
    createClientAccess,
    {},
  );
  const errors = state.fieldErrors ?? {};
  const items = clients.map((c) => ({ value: c.id, label: c.name }));

  if (state.ok && state.link && state.email) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Acesso criado</DialogTitle>
          <DialogDescription>Falta só a pessoa criar a senha pelo link abaixo.</DialogDescription>
        </DialogHeader>
        <AccessLinkPanel link={state.link} email={state.email} />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Concluir</DialogClose>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Criar acesso de cliente</DialogTitle>
        <DialogDescription>A pessoa verá apenas os dados do cliente escolhido.</DialogDescription>
      </DialogHeader>
      <form action={action} noValidate className="space-y-6">
        <FieldGroup>
          <Field data-invalid={!!errors.name || undefined}>
            <FieldLabel htmlFor="access-name">Nome da pessoa</FieldLabel>
            <Input id="access-name" name="name" placeholder="Ex.: Carla Souza" />
            {errors.name ? <FieldError>{errors.name}</FieldError> : null}
          </Field>
          <Field data-invalid={!!errors.email || undefined}>
            <FieldLabel htmlFor="access-email">E-mail</FieldLabel>
            <Input
              id="access-email"
              name="email"
              type="email"
              autoComplete="off"
              placeholder="pessoa@empresa.com.br"
            />
            {errors.email ? <FieldError>{errors.email}</FieldError> : null}
          </Field>
          <Field data-invalid={!!errors.clientId || undefined}>
            <FieldLabel>Cliente</FieldLabel>
            <Select name="clientId" items={items}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha o cliente" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId ? <FieldError>{errors.clientId}</FieldError> : null}
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
            Criar acesso
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
