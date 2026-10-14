"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import {
  parsePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";

const LIGHT_QUERY = "(prefers-color-scheme: light)";
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    return parsePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "auto"; // storage blocked (private mode, policies): follow the device
  }
}

function apply(preference: ThemePreference) {
  const theme = resolveTheme(preference, window.matchMedia(LIGHT_QUERY).matches);
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Current preference + setter. The boot script already applied it before paint. */
export function useTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "auto" as const);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      if (next === "auto") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Not persisted; still applied for this page view.
    }
    apply(next);
    listeners.forEach((l) => l());
  }, []);

  // "Automático" keeps following the device while the app is open.
  useEffect(() => {
    if (preference !== "auto") return;
    const mql = window.matchMedia(LIGHT_QUERY);
    const onChange = () => apply("auto");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [preference]);

  return { preference, setPreference };
}
