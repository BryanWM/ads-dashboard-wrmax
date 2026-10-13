"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { ClientAdminView } from "@/lib/domain/admin-types";
import { saveClient, type FormState } from "@/server/admin/actions";

const OBJECTIVES = [
  { value: "purchases", label: "Vendas online" },
  { value: "messages", label: "Conversas no WhatsApp/Direct" },
  { value: "leads", label: "Cadastros" },
  { value: "none", label: "Não definido (usa o de maior investimento)" },
];

function goalText(goal: number | null) {
  return goal === null
    ? ""
    : goal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Create (no `client`) or edit a client: name, objective and cost-per-result goal. */
export function ClientFormDialog({ client }: { client?: ClientAdminView }) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const editing = client !== undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setAttempt((n) => n + 1);
      }}
    >
      {editing ? (
        <DialogTrigger render={<Button variant="ghost" size="sm" />}>
          <PencilIcon data-icon="inline-start" />
          Editar
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <PlusIcon data-icon="inline-start" />
          Novo cliente
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? `Editar ${client.name}` : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            O objetivo define o resultado principal da visão do cliente; a meta liga o selo Saudável
            · Atenção · Crítico.
          </DialogDescription>
        </DialogHeader>
        {/* Keyed: every opening starts with fresh values and no old errors. */}
        <ClientForm
          key={attempt}
          client={client}
          onSaved={() => {
            setOpen(false);
            toast.success(editing ? "Cliente atualizado" : "Cliente criado");
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function ClientForm({ client, onSaved }: { client?: ClientAdminView; onSaved: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await saveClient(prev, form);
    if (result.ok) onSaved();
    return result;
  }, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="space-y-6">
      <input type="hidden" name="id" value={client?.id ?? ""} />
      <FieldGroup>
        <Field data-invalid={!!errors.name || undefined}>
          <FieldLabel htmlFor="client-name">Nome</FieldLabel>
          <Input
            id="client-name"
            name="name"
            defaultValue={client?.name}
            placeholder="Ex.: Forno Paulista"
            aria-invalid={!!errors.name || undefined}
          />
          {errors.name ? <FieldError>{errors.name}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel>Objetivo dos anúncios</FieldLabel>
          <Select name="objective" items={OBJECTIVES} defaultValue={client?.objective ?? "none"}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OBJECTIVES.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field data-invalid={!!errors.costPerResultGoal || undefined}>
          <FieldLabel htmlFor="client-goal">Meta de custo por resultado (R$)</FieldLabel>
          <Input
            id="client-goal"
            name="costPerResultGoal"
            inputMode="decimal"
            defaultValue={goalText(client?.costPerResultGoal ?? null)}
            placeholder="Ex.: 24,50"
            aria-invalid={!!errors.costPerResultGoal || undefined}
          />
          {errors.costPerResultGoal ? (
            <FieldError>{errors.costPerResultGoal}</FieldError>
          ) : (
            <FieldDescription>Opcional. Sem meta, o selo de saúde não aparece.</FieldDescription>
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
          {client ? "Salvar" : "Criar cliente"}
        </Button>
      </DialogFooter>
    </form>
  );
}
