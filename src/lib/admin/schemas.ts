/**
 * Input validation for admin actions. Shared by the Server Actions (authoritative)
 * and their unit tests. Messages are shown to people, in Portuguese.
 */
import { z } from "zod";

const OBJECTIVES = ["purchases", "messages", "leads"] as const;

const GOAL_MESSAGE = "Informe um valor maior que zero, como 24,50.";

/** "24", "24,5", "1.234,56" or "24.5" → number; empty → null; anything else → NaN. */
export function parseMoney(raw: unknown): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  let s = raw.trim().replace(/^R\$\s*/i, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

export const clientSchema = z.object({
  id: z.uuid().nullable(),
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do cliente.")
    .max(120, "Use no máximo 120 caracteres."),
  objective: z.enum([...OBJECTIVES, "none"]).transform((v) => (v === "none" ? null : v)),
  costPerResultGoal: z
    .number({ error: GOAL_MESSAGE })
    .nullable()
    .refine((v) => v === null || (v > 0 && v < 1_000_000), { message: GOAL_MESSAGE }),
});

export type ClientInput = z.output<typeof clientSchema>;

export function readClientForm(form: FormData) {
  const id = form.get("id");
  return clientSchema.safeParse({
    id: typeof id === "string" && id !== "" ? id : null,
    name: form.get("name") ?? "",
    objective: form.get("objective") ?? "none",
    costPerResultGoal: parseMoney(form.get("costPerResultGoal")),
  });
}

export const clientAccessSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da pessoa.").max(120),
  email: z.email("Informe um e-mail válido.").transform((v) => v.trim().toLowerCase()),
  clientId: z.uuid("Escolha o cliente."),
});

export function readClientAccessForm(form: FormData) {
  return clientAccessSchema.safeParse({
    name: form.get("name") ?? "",
    email: String(form.get("email") ?? "").trim(),
    clientId: form.get("clientId") ?? "",
  });
}

/**
 * New passwords (client logins are single-factor): NIST SP 800-63B rev. 4 asks for at
 * least 15 characters, no composition rules and no forced rotation. A short phrase is
 * easy to remember and meets it. 72 = bcrypt's byte limit in Supabase Auth.
 */
export const MIN_PASSWORD_LENGTH = 15;

export const passwordSchema = z
  .object({
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      .max(72, "Use no máximo 72 caracteres."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "As senhas não são iguais.",
  });

/** Field → first message, for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
