"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createUserSupabase } from "@/server/supabase/server";

const schema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha tem pelo menos 8 caracteres."),
});

export interface SignInState {
  fieldErrors?: Partial<Record<"email" | "password", string>>;
  /** Generic on purpose: never reveal whether the e-mail exists. */
  formError?: string;
  email?: string;
}

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  if (!isSupabaseConfigured()) return { formError: "O login ainda não está configurado." };

  const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
  const email = typeof form.get("email") === "string" ? String(form.get("email")) : "";
  if (!parsed.success) {
    const fieldErrors: SignInState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as "email" | "password";
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors, email };
  }

  const supabase = await createUserSupabase();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // The error object may carry details; only a neutral message reaches the browser.
    const tooMany = error.status === 429;
    return {
      email,
      formError: tooMany
        ? "Muitas tentativas. Aguarde alguns minutos e tente de novo."
        : "E-mail ou senha incorretos.",
    };
  }
  redirect("/dashboard");
}
