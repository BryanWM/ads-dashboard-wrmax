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

export function sealToken(plain: string, key: Buffer, keyVersion: number): SealedToken {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion,
  };
}

/** Throws if the data was altered or the key is wrong (GCM authentication). */
export function openToken(sealed: SealedToken, key: Buffer): string {
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
