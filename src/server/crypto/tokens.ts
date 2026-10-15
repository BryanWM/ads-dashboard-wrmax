import "server-only";

import { decodeKey, openStoredToken, sealToken } from "@/lib/crypto/token-cipher";
import { createServiceSupabase } from "@/server/supabase/admin";

/**
 * Platform tokens at rest: AES-256-GCM with TOKEN_ENCRYPTION_KEY, bound to the
 * connection id (AAD), stored in private.platform_credentials through service-role
 * RPCs (ADR-004). The plain token exists only in memory during a request; it is never
 * returned to the browser, logged or used as a cache key.
 *
 * Key rotation (docs/go-live.md): the new key becomes TOKEN_ENCRYPTION_KEY (+ version),
 * the old one moves to TOKEN_ENCRYPTION_KEY_PREVIOUS (+ version). Each token is
 * re-sealed with the new key the next time it is read; then the old key can go.
 */

function version(value: string | undefined, fallback: number): number {
  const v = Number(value ?? fallback);
  return Number.isInteger(v) && v > 0 ? v : fallback;
}

function currentVersion(): number {
  return version(process.env.TOKEN_ENCRYPTION_KEY_VERSION, 1);
}

function keyring(): Map<number, Buffer> {
  const keys = new Map<number, Buffer>([
    [currentVersion(), decodeKey(process.env.TOKEN_ENCRYPTION_KEY)],
  ]);
  if (process.env.TOKEN_ENCRYPTION_KEY_PREVIOUS) {
    const previous = version(process.env.TOKEN_ENCRYPTION_KEY_PREVIOUS_VERSION, 0);
    if (previous > 0 && previous !== currentVersion()) {
      keys.set(previous, decodeKey(process.env.TOKEN_ENCRYPTION_KEY_PREVIOUS));
    }
  }
  return keys;
}

export function isTokenVaultConfigured(): boolean {
  try {
    decodeKey(process.env.TOKEN_ENCRYPTION_KEY);
    return true;
  } catch {
    return false;
  }
}

export async function storeConnectionToken(connectionId: string, token: string): Promise<void> {
  const sealed = sealToken(
    token,
    decodeKey(process.env.TOKEN_ENCRYPTION_KEY),
    currentVersion(),
    connectionId,
  );
  const { error } = await createServiceSupabase().rpc("write_platform_credential", {
    p_connection_id: connectionId,
    p_ciphertext: sealed.ciphertext,
    p_iv: sealed.iv,
    p_auth_tag: sealed.authTag,
    p_key_version: sealed.keyVersion,
  });
  if (error) throw new Error(`Could not store credential: ${error.message}`);
}

/** Whether a token is stored for the connection (demo connections have none). Not decrypted. */
export async function hasConnectionToken(connectionId: string): Promise<boolean> {
  const { data, error } = await createServiceSupabase()
    .rpc("read_platform_credential", { p_connection_id: connectionId })
    .maybeSingle();
  if (error) throw new Error(`Could not read credential: ${error.message}`);
  return data !== null;
}

export async function readConnectionToken(connectionId: string): Promise<string> {
  const { data, error } = await createServiceSupabase()
    .rpc("read_platform_credential", { p_connection_id: connectionId })
    .maybeSingle();
  if (error) throw new Error(`Could not read credential: ${error.message}`);
  const row = data as {
    ciphertext: string;
    iv: string;
    auth_tag: string;
    key_version: number;
  } | null;
  if (!row) throw new Error("Credential not found for this connection");

  const { plain, needsReseal } = openStoredToken(
    { ciphertext: row.ciphertext, iv: row.iv, authTag: row.auth_tag, keyVersion: row.key_version },
    keyring(),
    currentVersion(),
    connectionId,
  );
  // Old key or pre-AAD format: store again with the current key, bound to the connection.
  if (needsReseal) await storeConnectionToken(connectionId, plain);
  return plain;
}
