import { describe, expect, it } from "vitest";

import {
  fieldErrors,
  parseMoney,
  passwordSchema,
  readClientAccessForm,
  readClientForm,
} from "@/lib/admin/schemas";

function form(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

describe("money input (pt-BR)", () => {
  it.each([
    ["24", 24],
    ["24,5", 24.5],
    ["1.234,56", 1234.56],
    ["R$ 30,00", 30],
    ["24.5", 24.5],
  ])("%s → %d", (raw, expected) => expect(parseMoney(raw)).toBe(expected));

  it("treats empty as 'no goal' and garbage as invalid", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("  ")).toBeNull();
    expect(parseMoney("abc")).toBeNaN();
    expect(parseMoney("-5")).toBeNaN();
  });
});

describe("client form", () => {
  it("accepts a new client without objective or goal", () => {
    const r = readClientForm(form({ name: " Forno Paulista ", objective: "none" }));
    expect(r.success && r.data).toEqual({
      id: null,
      name: "Forno Paulista",
      objective: null,
      costPerResultGoal: null,
    });
  });

  it("rejects empty names, unknown objectives and non-positive goals", () => {
    expect(readClientForm(form({ name: "", objective: "none" })).success).toBe(false);
    expect(readClientForm(form({ name: "X", objective: "hack" })).success).toBe(false);
    const r = readClientForm(form({ name: "X", objective: "leads", costPerResultGoal: "0" }));
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).costPerResultGoal).toMatch(/maior que zero/);
  });

  it("rejects a malformed id (never reaches the database)", () => {
    expect(readClientForm(form({ id: "1 or 1=1", name: "X", objective: "none" })).success).toBe(
      false,
    );
  });
});

describe("client access form", () => {
  it("normalises the e-mail", () => {
    const r = readClientAccessForm(
      form({
        name: "Carla",
        email: " Carla@Exemplo.com ",
        clientId: "11111111-1111-4111-8111-111111111111",
      }),
    );
    expect(r.success && r.data.email).toBe("carla@exemplo.com");
  });

  it("requires a client", () => {
    const r = readClientAccessForm(form({ name: "Carla", email: "c@exemplo.com", clientId: "" }));
    expect(r.success).toBe(false);
  });
});

describe("password", () => {
  it("requires 8+ characters with uppercase, lowercase, digit and symbol (same as Supabase)", () => {
    const check = (password: string) => passwordSchema.safeParse({ password, confirm: password });
    expect(check("Cur1a!").success).toBe(false); // too short
    const noUpper = check("senha-boa-123");
    expect(noUpper.success).toBe(false);
    if (!noUpper.success) {
      expect(fieldErrors(noUpper.error).password).toBe("Inclua pelo menos uma letra maiúscula.");
    }
    expect(check("SENHA-BOA-123").success).toBe(false); // no lowercase
    expect(check("Senha-Boa-sem").success).toBe(false); // no digit
    const noSymbol = check("SenhaBoa123");
    expect(noSymbol.success).toBe(false);
    if (!noSymbol.success) {
      expect(fieldErrors(noSymbol.error).password).toBe(
        "Inclua pelo menos um símbolo, como ! @ # $ ou *.",
      );
    }
    // Accents and spaces are not symbols for Supabase, so they do not count here either.
    expect(check("Senha Boa 123é").success).toBe(false);
    expect(check("Senha-Boa-123").success).toBe(true);
    expect(check("Pizza@2026").success).toBe(true);

    const r = passwordSchema.safeParse({ password: "Senha-Boa-123", confirm: "Outra-123" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).confirm).toBe("As senhas não são iguais.");
  });
});
