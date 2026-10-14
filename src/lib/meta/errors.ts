/**
 * Meta Graph API errors → categories the sync engine understands, so it never needs
 * Meta-specific codes (docs/meta-integration.md · Erros e mapeamento).
 */

export type MetaErrorKind =
  | "auth" // token invalid/expired/revoked → connection needs re-authorization, no retry
  | "permission" // missing permission/asset access → no retry
  | "rate_limit" // throttled → retry after the suggested wait
  | "transient" // Meta-side hiccup → retry with backoff
  | "too_much_data" // reduce the window or go async
  | "invalid"; // bad request on our side → no retry

export interface MetaApiErrorBody {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  is_transient?: boolean;
  fbtrace_id?: string;
}

const RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);

export function classifyMetaError(
  status: number,
  body: MetaApiErrorBody | undefined,
): MetaErrorKind {
  const code = body?.code;
  if (code === 190 || code === 102) return "auth";
  if (code === 10 || (code !== undefined && code >= 200 && code <= 299)) return "permission";
  if (
    (code !== undefined && RATE_LIMIT_CODES.has(code)) ||
    (code !== undefined && code >= 80000 && code <= 80014)
  ) {
    return "rate_limit";
  }
  if (code === 100 && body?.error_subcode === 1487534) return "too_much_data";
  if (code === 1 || code === 2 || body?.is_transient || status >= 500 || status === 0) {
    return "transient";
  }
  return "invalid";
}

export function isRetryable(kind: MetaErrorKind): boolean {
  return kind === "rate_limit" || kind === "transient" || kind === "too_much_data";
}

/** Strips anything token-like before a message is stored or logged. */
export function sanitizeMetaMessage(message: string | undefined): string {
  return (message ?? "Erro desconhecido da Meta")
    .replace(/access_token=[^&\s]+/gi, "access_token=[removido]")
    .replace(/appsecret_proof=[^&\s]+/gi, "appsecret_proof=[removido]")
    .replace(/\bEAA[A-Za-z0-9]{20,}\b/g, "[token removido]")
    .slice(0, 500);
}

/** Plain-language message shown to the agency (never the raw API text). */
export function friendlyMetaError(kind: MetaErrorKind): string {
  switch (kind) {
    case "auth":
      return "A chave de acesso da Meta expirou ou foi revogada. Gere uma nova e reconecte.";
    case "permission":
      return "A chave não tem permissão para esta conta. Confira o acesso do usuário do sistema no Business Manager.";
    case "rate_limit":
      return "Limite de requisições da Meta atingido. Nova tentativa agendada automaticamente.";
    case "transient":
      return "A Meta está instável no momento. Nova tentativa agendada automaticamente.";
    case "too_much_data":
      return "Volume de dados grande demais para uma consulta. O período será dividido.";
    case "invalid":
      return "A Meta recusou a consulta. A equipe técnica foi avisada pelo registro de erros.";
  }
}
