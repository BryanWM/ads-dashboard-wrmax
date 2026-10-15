import "server-only";

import { createHmac } from "node:crypto";

import {
  classifyMetaError,
  sanitizeMetaMessage,
  type MetaApiErrorBody,
  type MetaErrorKind,
} from "@/lib/meta/errors";
import { parseMetaUsage, type MetaUsage } from "@/lib/meta/usage";

/**
 * Minimal Graph API client. The token travels only in the Authorization header —
 * never in a URL that could end up in logs — and errors carry sanitised text only.
 */

const GRAPH = "https://graph.facebook.com";
const TIMEOUT_MS = 60_000;
const MAX_PAGES = 200; // safety net against an endless `paging.next`

export function graphVersion(): string {
  const v = process.env.META_GRAPH_API_VERSION ?? "v25.0";
  if (!/^v\d+\.\d+$/.test(v)) throw new Error("META_GRAPH_API_VERSION must look like v25.0");
  return v;
}

export class MetaApiError extends Error {
  constructor(
    readonly kind: MetaErrorKind,
    readonly status: number,
    readonly code: number | null,
    message: string,
    readonly usage: MetaUsage | null,
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

export interface GraphResponse<T> {
  data: T;
  usage: MetaUsage;
}

function withProof(url: URL, token: string) {
  // appsecret_proof: required when the app enables "Require App Secret". It is a
  // per-token HMAC, not the secret itself.
  const secret = process.env.META_APP_SECRET;
  if (secret)
    url.searchParams.set(
      "appsecret_proof",
      createHmac("sha256", secret).update(token).digest("hex"),
    );
}

async function request<T>(url: URL, token: string): Promise<GraphResponse<T>> {
  withProof(url, token);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new MetaApiError(
      "transient",
      0,
      null,
      "Sem resposta da Meta (rede ou tempo esgotado).",
      null,
    );
  }

  const usage = parseMetaUsage(response.headers);
  const body = (await response.json().catch(() => null)) as
    (T & { error?: MetaApiErrorBody }) | null;

  if (!response.ok || body?.error) {
    const error = body?.error;
    throw new MetaApiError(
      classifyMetaError(response.status, error),
      response.status,
      error?.code ?? null,
      sanitizeMetaMessage(error?.message),
      usage,
    );
  }
  if (body === null)
    throw new MetaApiError("transient", response.status, null, "Resposta vazia da Meta.", usage);
  return { data: body, usage };
}

type Params = Record<string, string | number | boolean | object>;

function buildUrl(path: string, params: Params): URL {
  const url = new URL(`${GRAPH}/${graphVersion()}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  }
  return url;
}

export function graphGet<T>(path: string, params: Params, token: string) {
  return request<T>(buildUrl(path, params), token);
}

/** Follows `paging.next` until the end. Returns every item and the last usage seen. */
export async function graphGetAll<T>(
  path: string,
  params: Params,
  token: string,
): Promise<{ items: T[]; usage: MetaUsage | null }> {
  const items: T[] = [];
  let usage: MetaUsage | null = null;
  let url: URL | null = buildUrl(path, params);
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const result: GraphResponse<{ data?: T[]; paging?: { next?: string } }> = await request(
      url,
      token,
    );
    usage = result.usage;
    items.push(...(result.data.data ?? []));
    const next = result.data.paging?.next;
    // `next` repeats our query string (and Meta may echo a token in it): rebuild it
    // without credentials; the token goes in the header again.
    if (next) {
      const nextUrl = new URL(next);
      // The token is sent again with the next page: only ever to Meta's own host.
      if (nextUrl.origin !== url.origin) {
        throw new Error(`Unexpected pagination host: ${nextUrl.origin}`);
      }
      nextUrl.searchParams.delete("access_token");
      nextUrl.searchParams.delete("appsecret_proof");
      url = nextUrl;
    } else {
      url = null;
    }
  }
  return { items, usage };
}
