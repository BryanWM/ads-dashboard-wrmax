"use client";

import { CopyIcon, SendIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { toast } from "sonner";

import { PendingContent } from "@/components/layout/navigation-pending";
import { Button } from "@/components/ui/button";

/** Renders WhatsApp markup (*bold*, _italic_) the way the message will look. */
function renderLine(line: string): ReactNode {
  return line.split(/(\*[^*\n]+\*|_[^_\n]+_)/g).map((part, i) => {
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
      return (
        <strong key={i} className="font-semibold text-texto">
          {part.slice(1, -1)}
        </strong>
      );
    }
    if (part.length > 2 && part.startsWith("_") && part.endsWith("_")) {
      return (
        <em key={i} className="text-texto-apagado">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/** Older copy path for browsers that block the Clipboard API (in-app browsers). */
function copyWithSelection(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

/** Preview + copy / open in WhatsApp. The text is sent by the agency's own WhatsApp. */
export function ReportPreview({ text }: { text: string }) {
  async function copy() {
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = copyWithSelection(text);
    }
    if (copied) toast.success("Texto copiado. É só colar no WhatsApp.");
    else toast.error("Não foi possível copiar. Selecione o texto da prévia e copie manualmente.");
  }

  return (
    <section
      aria-label="Prévia do relatório"
      className="space-y-4 rounded-2xl border border-linha bg-superficie p-4 sm:p-5"
    >
      <h2 className="etiqueta text-texto-apagado">Prévia</h2>
      <PendingContent>
        <div className="max-w-xl rounded-xl rounded-tl-sm border border-linha bg-superficie-2 px-4 py-3 text-sm leading-relaxed text-texto select-text">
          {text.split("\n").map((line, i) =>
            line === "" ? (
              <div key={i} aria-hidden className="h-3" />
            ) : (
              <p key={i} className="break-words">
                {renderLine(line)}
              </p>
            ),
          )}
        </div>
      </PendingContent>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" onClick={copy}>
          <CopyIcon data-icon="inline-start" />
          Copiar texto
        </Button>
        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          render={
            <a
              href={`https://wa.me/?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
        >
          <SendIcon data-icon="inline-start" />
          Enviar pelo WhatsApp
        </Button>
      </div>
    </section>
  );
}
