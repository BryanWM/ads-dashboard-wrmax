"use client";

import { RefreshCwIcon } from "lucide-react";

import { ErrorState } from "@/components/feedback/state-panels";
import { Button } from "@/components/ui/button";

/** Page-level failure. Never shows stack traces or raw error messages to users. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <ErrorState
        className="max-w-xl"
        title="Não foi possível carregar esta página"
        description={
          <>
            Tente novamente em instantes. Se o problema continuar, informe o código
            {error.digest ? (
              <code className="mx-1 font-mono text-xs">{error.digest}</code>
            ) : (
              " do erro"
            )}
            ao suporte.
          </>
        }
        action={
          <Button variant="outline" onClick={reset}>
            <RefreshCwIcon data-icon="inline-start" />
            Tentar novamente
          </Button>
        }
      />
    </div>
  );
}
