import { createHash, timingSafeEqual } from "node:crypto";

/** A secret shorter than this is treated as missing (the route stays closed). */
export const MIN_CRON_SECRET_LENGTH = 16;

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * Checks Vercel Cron's "Authorization: Bearer <CRON_SECRET>". Constant-time compare
 * over hashes (equal lengths); without a configured secret nothing is authorised.
 */
export function isCronAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < MIN_CRON_SECRET_LENGTH || !header) return false;
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
