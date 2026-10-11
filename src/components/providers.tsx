"use client";

import { MotionConfig } from "motion/react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Client-side providers shared by every route.
 * - Single dark theme (WRMax DS): the `dark` class is static on <html>.
 * - MotionConfig honours the OS "reduce motion" preference for all motion/react
 *   animations; CSS animations are covered by the media query in globals.css.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delay={300}>
        {children}
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </MotionConfig>
  );
}
