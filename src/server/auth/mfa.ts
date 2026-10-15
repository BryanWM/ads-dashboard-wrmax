"use server";

import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { normalizeTotpCode, qrDataUri } from "@/lib/auth/mfa";
import { securityEvent } from "@/server/security/log";
import { createUserSupabase } from "@/server/supabase/server";

/**
 * Second factor for the agency (ADR-016): TOTP in an authenticator app.
 * Both actions run AS the signed-in user; Supabase stores the factor and upgrades the
 * session to aal2 on a correct code. Nothing here bypasses RLS.
 */

export interface MfaEnrollment {
  factorId?: string;
  /** data: URI with the QR (shown once; never logged). */
  qr?: string;
  /** Same secret as the QR, for typing it by hand. */
  secret?: string;
  error?: string;
}

export interface MfaVerifyState {
  error?: string;
}

async function signedInUser() {
  const supabase = await createUserSupabase();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return { supabase, userId };
}

/** Starts (or restarts) setting up the authenticator app. */
export async function startMfaEnrollment(): Promise<MfaEnrollment> {
  const { supabase } = await signedInUser();

  // A half-finished setup (QR shown, code never confirmed) would block a new one.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    if (factor.factor_type === "totp" && factor.status !== "verified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }
  if ((factors?.totp ?? []).length > 0) {
    return { error: "Este login já tem um aplicativo de autenticação. Use o código dele." };
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "WRMax Metrics",
    issuer: "WRMax Metrics",
  });
  if (error || !data) {
    return { error: "Não foi possível iniciar a configuração. Tente novamente em instantes." };
  }
  return { factorId: data.id, qr: qrDataUri(data.totp.qr_code), secret: data.totp.secret };
}

const verifySchema = z.object({ factorId: z.uuid(), enrolling: z.enum(["0", "1"]) });

/** Checks the 6-digit code; on success the session becomes aal2 and the app opens. */
export async function verifyMfa(_prev: MfaVerifyState, form: FormData): Promise<MfaVerifyState> {
  const parsed = verifySchema.safeParse({
    factorId: form.get("factorId"),
    enrolling: form.get("enrolling") ?? "0",
  });
  const code = normalizeTotpCode(form.get("code"));
  if (!parsed.success) return { error: "Sessão de verificação inválida. Recarregue a página." };
  if (!code) return { error: "Digite os 6 números que aparecem no aplicativo." };

  const { supabase, userId } = await signedInUser();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: parsed.data.factorId,
    code,
  });
  if (error) {
    securityEvent("mfa.failed", { user: userId, status: error.status ?? null });
    return {
      error:
        error.status === 429
          ? "Muitas tentativas. Aguarde alguns minutos e tente de novo."
          : "Código incorreto ou vencido. Confira o relógio do celular e use o código atual.",
    };
  }
  securityEvent(parsed.data.enrolling === "1" ? "mfa.enrolled" : "mfa.verified", {
    user: userId,
  });
  redirect("/dashboard");
}
