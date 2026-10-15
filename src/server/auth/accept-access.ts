"use server";

import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { fieldErrors, passwordSchema } from "@/lib/admin/schemas";
import { securityEvent } from "@/server/security/log";
import { createUserSupabase } from "@/server/supabase/server";

export interface AcceptAccessState {
  fieldErrors?: Record<string, string>;
  formError?: string;
}

const tokenSchema = z.object({
  tokenHash: z.string().min(10).max(512),
  type: z.enum(["invite", "recovery"]),
});

/**
 * Consumes the one-time link ONLY on submit (POST). Opening the URL does nothing,
 * so link previews (WhatsApp, e-mail scanners) cannot burn it.
 */
export async function acceptAccess(
  _prev: AcceptAccessState,
  form: FormData,
): Promise<AcceptAccessState> {
  const token = tokenSchema.safeParse({
    tokenHash: form.get("token_hash"),
    type: form.get("type"),
  });
  if (!token.success) return { formError: "Link inválido. Peça um novo link à sua agência." };

  const password = passwordSchema.safeParse({
    password: form.get("password"),
    confirm: form.get("confirm"),
  });
  if (!password.success) return { fieldErrors: fieldErrors(password.error) };

  const supabase = await createUserSupabase();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: token.data.type,
    token_hash: token.data.tokenHash,
  });
  if (verifyError) {
    securityEvent("access.link_rejected", { type: token.data.type });
    return { formError: "Este link expirou ou já foi usado. Peça um novo link à sua agência." };
  }

  const { error } = await supabase.auth.updateUser({ password: password.data.password });
  if (error) {
    const weak = /password/i.test(error.message);
    return {
      formError: weak
        ? "Essa senha não foi aceita. Tente uma senha mais longa e menos comum."
        : "Não foi possível salvar a senha. Tente novamente.",
    };
  }
  securityEvent("access.password_set", { type: token.data.type });
  redirect("/dashboard");
}
