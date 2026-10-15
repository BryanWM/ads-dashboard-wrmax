import { createHash } from "node:crypto";

/**
 * Security events for the log drain (alerts: docs/seguranca.md). One JSON line per
 * event with a fixed tag, so a drain can filter `"tag":"security"` without parsing
 * free text. Never put passwords, tokens, links or full e-mails in `detail`.
 */
export type SecurityEventType =
  | "login.failed"
  | "login.rate_limited"
  | "login.succeeded"
  | "access.password_set"
  | "access.link_rejected"
  | "cron.unauthorized";

/** Stable, non-reversible id for an e-mail (spot repeated attempts without storing it). */
export function emailFingerprint(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 12);
}

export function formatSecurityEvent(
  type: SecurityEventType,
  detail: Record<string, string | number | boolean | null> = {},
  at: Date = new Date(),
): string {
  return JSON.stringify({ tag: "security", type, at: at.toISOString(), ...detail });
}
