"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Shows the one-time access link ONCE (it is not stored). The agency sends it to the
 * client, who opens it and chooses a password.
 */
export function AccessLinkPanel({ link, email }: { link: string; email: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-texto-apagado">
        Envie este link para <span className="font-medium text-texto">{email}</span> (por exemplo,
        pelo WhatsApp). Ao abrir, a pessoa cria a própria senha.
      </p>
      <div className="flex gap-2">
        <Input
          readOnly
          value={link}
          aria-label="Link de acesso"
          onFocus={(e) => e.target.select()}
        />
        <Button type="button" variant="outline" onClick={copy} aria-label="Copiar link">
          {copied ? <CheckIcon /> : <CopyIcon />}
        </Button>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-xs text-texto-inativo">
        <li>O link vale uma única vez e expira; se expirar, gere um novo na lista de acessos.</li>
        <li>Ele não fica salvo em lugar nenhum: copie agora.</li>
        <li>Quem tiver o link pode criar a senha — envie só para a pessoa certa.</li>
      </ul>
    </div>
  );
}
