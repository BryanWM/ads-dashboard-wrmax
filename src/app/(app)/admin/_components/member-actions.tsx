"use client";

import { LinkIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { newAccessLink, removeClientAccess } from "@/server/admin/actions";

import { AccessLinkPanel } from "./access-link-panel";

/** Row actions for a CLIENT login: new one-time link, or remove the access. */
export function MemberActions({ userId, name }: { userId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<{ link: string; email: string } | null>(null);

  function generate() {
    startTransition(async () => {
      const result = await newAccessLink(userId);
      if (result.ok && result.link && result.email)
        setLink({ link: result.link, email: result.email });
      else toast.error(result.formError ?? "Não foi possível gerar o link.");
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeClientAccess(userId);
      if (result.ok) toast.success("Acesso removido");
      else toast.error(result.formError ?? "Não foi possível remover o acesso.");
    });
  }

  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={generate} disabled={pending}>
        {pending ? <Spinner data-icon="inline-start" /> : <LinkIcon data-icon="inline-start" />}
        Novo link
      </Button>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              aria-label={`Remover acesso de ${name}`}
            />
          }
        >
          <Trash2Icon />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover o acesso de {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              A pessoa deixa de entrar imediatamente. Os dados do cliente não são apagados; dá para
              criar um novo acesso depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Remover acesso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={link !== null} onOpenChange={(open) => !open && setLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo link de acesso</DialogTitle>
            <DialogDescription>{name} vai definir uma nova senha por este link.</DialogDescription>
          </DialogHeader>
          {link ? <AccessLinkPanel link={link.link} email={link.email} /> : null}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Concluir</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
