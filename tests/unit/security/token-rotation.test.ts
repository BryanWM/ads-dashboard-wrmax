import { describe, expect, it } from "vitest";

import { decodeKey, openStoredToken, openToken, sealToken } from "@/lib/crypto/token-cipher";

const oldKey = decodeKey(Buffer.alloc(32, 1).toString("base64"));
const newKey = decodeKey(Buffer.alloc(32, 2).toString("base64"));
const keys = new Map([
  [1, oldKey],
  [2, newKey],
]);

describe("token binding (AAD) and key rotation", () => {
  it("a token sealed for one connection never opens on another", () => {
    const sealed = sealToken("EAA-segredo", newKey, 2, "conexao-A");
    expect(openToken(sealed, newKey, "conexao-A")).toBe("EAA-segredo");
    expect(() => openToken(sealed, newKey, "conexao-B")).toThrow();
    // Not even through the legacy fallback.
    expect(() => openStoredToken(sealed, keys, 2, "conexao-B")).toThrow();
  });

  it("current key + AAD: opens with nothing to do", () => {
    const sealed = sealToken("EAA-segredo", newKey, 2, "conexao-A");
    expect(openStoredToken(sealed, keys, 2, "conexao-A")).toEqual({
      plain: "EAA-segredo",
      needsReseal: false,
    });
  });

  it("previous key or pre-AAD format: opens and asks to be re-sealed", () => {
    const oldVersion = sealToken("EAA-segredo", oldKey, 1, "conexao-A");
    expect(openStoredToken(oldVersion, keys, 2, "conexao-A")).toEqual({
      plain: "EAA-segredo",
      needsReseal: true,
    });
    const legacy = sealToken("EAA-segredo", newKey, 2); // sealed before AAD existed
    expect(openStoredToken(legacy, keys, 2, "conexao-A")).toEqual({
      plain: "EAA-segredo",
      needsReseal: true,
    });
  });

  it("fails when the key for that version is gone", () => {
    const sealed = sealToken("EAA-segredo", oldKey, 1, "conexao-A");
    expect(() => openStoredToken(sealed, new Map([[2, newKey]]), 2, "conexao-A")).toThrow(
      /version 1/,
    );
  });
});
