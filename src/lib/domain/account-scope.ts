/**
 * Which ad account(s) a client page shows. The `?conta=` URL value is only a
 * request: it is honoured only if it is one of THIS client's accounts.
 */

export interface AdAccountRef {
  id: string;
  name: string;
  currency: string;
  timezone: string;
}

export interface AccountScope {
  /** null = every account of the client. */
  accountId: string | null;
  /** "All accounts" is offered only when it can be summed (same currency). */
  allowAll: boolean;
}

export function hasMixedCurrencies(accounts: readonly AdAccountRef[]): boolean {
  return new Set(accounts.map((a) => a.currency)).size > 1;
}

export function resolveAccountScope(
  accounts: readonly AdAccountRef[],
  requested: string | null | undefined,
): AccountScope {
  const allowAll = !hasMixedCurrencies(accounts);
  const match = accounts.find((a) => a.id === requested);
  if (match) return { accountId: match.id, allowAll };
  // Money in different currencies is never summed: fall back to the first account.
  return { accountId: allowAll ? null : (accounts[0]?.id ?? null), allowAll };
}
