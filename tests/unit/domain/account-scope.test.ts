import { describe, expect, it } from "vitest";

import { resolveAccountScope, type AdAccountRef } from "@/lib/domain/account-scope";

const acc = (id: string, currency = "BRL"): AdAccountRef => ({
  id,
  name: id,
  currency,
  timezone: "America/Sao_Paulo",
});

describe("account scope", () => {
  it("shows every account by default", () => {
    expect(resolveAccountScope([acc("a"), acc("b")], undefined)).toEqual({
      accountId: null,
      allowAll: true,
    });
  });

  it("honours a requested account of this client", () => {
    expect(resolveAccountScope([acc("a"), acc("b")], "b").accountId).toBe("b");
  });

  it("ignores an account of another client (never reaches a query)", () => {
    expect(resolveAccountScope([acc("a"), acc("b")], "of-someone-else").accountId).toBeNull();
  });

  it("never sums currencies: no 'all accounts', first account by default", () => {
    const accounts = [acc("brl", "BRL"), acc("usd", "USD")];
    expect(resolveAccountScope(accounts, null)).toEqual({ accountId: "brl", allowAll: false });
    expect(resolveAccountScope(accounts, "usd")).toEqual({ accountId: "usd", allowAll: false });
  });

  it("handles a client without accounts", () => {
    expect(resolveAccountScope([], "x")).toEqual({ accountId: null, allowAll: true });
  });
});
