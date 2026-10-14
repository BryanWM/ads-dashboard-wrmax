import { describe, expect, it } from "vitest";

import { parsePreference, resolveTheme, THEME_BOOT_SCRIPT } from "@/lib/theme";

describe("theme preference", () => {
  it("follows the device on auto and honours a fixed choice", () => {
    expect(resolveTheme("auto", true)).toBe("light");
    expect(resolveTheme("auto", false)).toBe("dark");
    expect(resolveTheme("claro", false)).toBe("light");
    expect(resolveTheme("escuro", true)).toBe("dark");
  });

  it("treats unknown stored values as auto", () => {
    expect(parsePreference(null)).toBe("auto");
    expect(parsePreference("roxo")).toBe("auto");
    expect(parsePreference("claro")).toBe("claro");
  });

  it("boot script mirrors the same rule and never throws on blocked storage", () => {
    function run(stored: string | null, prefersLight: boolean, storageThrows = false) {
      const attrs: Record<string, string> = {};
      const classes = new Set(["dark"]);
      const doc = {
        documentElement: {
          setAttribute: (k: string, v: string) => (attrs[k] = v),
          classList: {
            toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)),
          },
        },
      };
      const storage = {
        getItem: () => {
          if (storageThrows) throw new Error("blocked");
          return stored;
        },
      };
      const win = { matchMedia: () => ({ matches: prefersLight }) };
      new Function("localStorage", "window", "document", THEME_BOOT_SCRIPT)(storage, win, doc);
      return { theme: attrs["data-theme"], dark: classes.has("dark") };
    }
    expect(run(null, true)).toEqual({ theme: "light", dark: false });
    expect(run("escuro", true)).toEqual({ theme: "dark", dark: true });
    expect(run("claro", false)).toEqual({ theme: "light", dark: false });
    expect(run(null, false, true)).toEqual({ theme: undefined, dark: true }); // dark default kept
  });
});
