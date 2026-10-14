"use client";

import { SegmentedControl } from "@/components/filters/segmented-control";
import { useTheme } from "@/hooks/use-theme";
import type { ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "auto", label: "Automático" },
  { value: "claro", label: "Claro" },
  { value: "escuro", label: "Escuro" },
];

/** Inline theme control (the app itself offers the same choice in the user menu). */
export function ThemeSwitch({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  return (
    <SegmentedControl
      aria-label="Tema"
      options={OPTIONS}
      value={preference}
      onChange={setPreference}
      className={className}
    />
  );
}
