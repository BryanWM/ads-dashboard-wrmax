"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { createContext, use, useCallback, useMemo, useTransition, type ReactNode } from "react";

import { DURATION, EASE_MAC } from "@/components/motion/presets";

interface NavigationPending {
  isPending: boolean;
  /** router.push inside a transition: the current UI stays until the next one is ready. */
  navigate: (href: string) => void;
}

const NavigationPendingContext = createContext<NavigationPending | null>(null);

export function NavigationPendingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const navigate = useCallback(
    (href: string) => startTransition(() => router.push(href, { scroll: false })),
    [router],
  );
  const value = useMemo(() => ({ isPending, navigate }), [isPending, navigate]);
  return <NavigationPendingContext value={value}>{children}</NavigationPendingContext>;
}

export function useNavigationPending(): NavigationPending {
  const ctx = use(NavigationPendingContext);
  if (!ctx) throw new Error("useNavigationPending must be used inside NavigationPendingProvider");
  return ctx;
}

/** Dims (never hides) the current content while the next state renders. */
export function PendingContent({ children }: { children: ReactNode }) {
  const { isPending } = useNavigationPending();
  return (
    <div
      aria-busy={isPending}
      data-pending={isPending || undefined}
      className="flex flex-1 flex-col transition-opacity duration-200 data-pending:pointer-events-none data-pending:opacity-60"
    >
      {children}
    </div>
  );
}

/** Thin indeterminate bar at the top of the content area. */
export function PendingBar() {
  const { isPending } = useNavigationPending();
  return (
    <AnimatePresence>
      {isPending ? (
        <motion.div
          key="pending-bar"
          role="progressbar"
          aria-label="Carregando"
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ouro"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 0.85, transition: { duration: 2.5, ease: EASE_MAC } }}
          exit={{ scaleX: 1, opacity: 0, transition: { duration: DURATION.fade } }}
        />
      ) : null}
    </AnimatePresence>
  );
}
