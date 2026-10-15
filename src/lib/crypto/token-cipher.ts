/**
 * AES-256-GCM for platform tokens (ADR-004). The key is passed in by the server
 * wrapper (src/server/crypto); this module never reads env and never logs.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface SealedToken {
  ciphertext: string; // base64
  iv: string; // base64, 12 bytes
  authTag: string; // base64, 16 bytes
  keyVersion: number;
}

/** Key from env: 32 random bytes in base64 (`openssl rand -base64 32`). */
export function decodeKey(base64: string | undefined): Buffer {
  if (!base64) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  const key = Buffer.from(base64, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes (base64)");
  return key;
}

/**
 * `aad` binds the ciphertext to its owner (the connection id): a sealed token copied
 * onto another connection no longer opens (Fase 8 · L4).
 */
export function sealToken(
  plain: string,
  key: Buffer,
  keyVersion: number,
  aad?: string,
): SealedToken {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  if (aad !== undefined) cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion,
  };
}

/** Throws if the data was altered or the key is wrong (GCM authentication). */
export function openToken(sealed: SealedToken, key: Buffer, aad?: string): string {
  // Full 16-byte tag only: Node would otherwise accept truncated tags.
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(sealed.iv, "base64"), {
    authTagLength: 16,
  });
  if (aad !== undefined) decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * Opens a stored token during key rotation and the AAD migration:
 * - the key is picked by `sealed.keyVersion` (current or the previous one);
 * - tokens sealed before AAD existed still open, once, without it.
 * `needsReseal` = it should be stored again with the current key + AAD. A token sealed
 * WITH another connection's AAD never opens (no fallback can unlock it).
 */
export function openStoredToken(
  sealed: SealedToken,
  keys: ReadonlyMap<number, Buffer>,
  currentVersion: number,
  aad: string,
): { plain: string; needsReseal: boolean } {
  const key = keys.get(sealed.keyVersion);
  if (!key) throw new Error(`No key for token version ${sealed.keyVersion}`);
  const outdatedKey = sealed.keyVersion !== currentVersion;
  try {
    return { plain: openToken(sealed, key, aad), needsReseal: outdatedKey };
  } catch {
    // Legacy (pre-AAD) token: opens without AAD, then gets re-sealed with it.
    return { plain: openToken(sealed, key), needsReseal: true };
  }
}
