/**
 * Theme preference (ADR-013): "auto" follows the device, or a fixed choice. Stored in
 * localStorage only (a per-device convenience); never read on the server, so pages
 * stay static/prerenderable (CLAUDE.md: no cookie read on <html>).
 */

export const THEME_PREFERENCES = ["auto", "claro", "escuro"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "wrmax-tema";

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersLight: boolean,
): ResolvedTheme {
  if (preference === "claro") return "light";
  if (preference === "escuro") return "dark";
  return systemPrefersLight ? "light" : "dark";
}

export function parsePreference(value: string | null | undefined): ThemePreference {
  return (THEME_PREFERENCES as readonly string[]).includes(value ?? "")
    ? (value as ThemePreference)
    : "auto";
}

/**
 * Runs in <head> before the first paint (inlined as a string, so it must stay
 * self-contained ES5). Mirrors resolveTheme/applyTheme; failures keep the dark default.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var l=p==="claro"||(p!=="escuro"&&window.matchMedia("(prefers-color-scheme: light)").matches);var d=document.documentElement;d.setAttribute("data-theme",l?"light":"dark");d.classList.toggle("dark",!l);}catch(e){}})();`;
