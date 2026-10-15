/**
 * Two-factor rules (ADR-016). The agency role sees every client, so it only counts
 * with a session verified by an authenticator app (TOTP → aal2). The database enforces
 * the same rule (app.admin_org_ids), so this is the friendly front door, not the lock.
 */

export type MembershipRole = "admin" | "client";

/** An admin whose session is not aal2 must go to /mfa before anything else. */
export function adminNeedsMfa(role: MembershipRole | null, aal: unknown): boolean {
  return role === "admin" && aal !== "aal2";
}

/** What /mfa shows: confirm a code, or set up the app first. */
export function mfaStep(hasVerifiedTotp: boolean): "verify" | "enroll" {
  return hasVerifiedTotp ? "verify" : "enroll";
}

/** 6 digits from the authenticator app (spaces typed by people are ignored). */
export function normalizeTotpCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.replace(/\s+/g, "");
  return /^\d{6}$/.test(code) ? code : null;
}

/** Supabase returns the QR as SVG markup (or already as a data URI). */
export function qrDataUri(qr: string): string {
  return qr.startsWith("data:") ? qr : `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`;
}
