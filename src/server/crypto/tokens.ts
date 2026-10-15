import "server-only";

import { decodeKey, openToken, sealToken } from "@/lib/crypto/token-cipher";
import { createServiceSupabase } from "@/server/supabase/admin";

/**
 * Platform tokens at rest: AES-256-GCM with TOKEN_ENCRYPTION_KEY, stored in
 * private.platform_credentials through service-role RPCs (ADR-004). The plain token
 * exists only in memory during a request; it is never returned to the browser,
 * logged or used as a cache key.
 */

function keyVersion(): number {
  const v = Number(process.env.TOKEN_ENCRYPTION_KEY_VERSION ?? "1");
  return Number.isInteger(v) && v > 0 ? v : 1;
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
  const sealed = sealToken(token, decodeKey(process.env.TOKEN_ENCRYPTION_KEY), keyVersion());
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
  return openToken(
    { ciphertext: row.ciphertext, iv: row.iv, authTag: row.auth_tag, keyVersion: row.key_version },
    decodeKey(process.env.TOKEN_ENCRYPTION_KEY),
  );
}
