import "server-only";

import { formatSecurityEvent, type SecurityEventType } from "@/lib/security/events";

/** Writes one security event to the server log (Vercel → log drain → alerts). */
export function securityEvent(
  type: SecurityEventType,
  detail: Record<string, string | number | boolean | null> = {},
): void {
  console.warn(formatSecurityEvent(type, detail));
}
