import { describe, expect, it } from "vitest";

import { emailFingerprint, formatSecurityEvent } from "@/lib/security/events";

describe("security events", () => {
  it("fingerprints e-mails case-insensitively without exposing them", () => {
    const a = emailFingerprint("Ana@Agencia.com ");
    expect(a).toBe(emailFingerprint("ana@agencia.com"));
    expect(a).toHaveLength(12);
    expect(a).not.toContain("ana");
  });

  it("is one JSON line with a fixed tag for the log drain", () => {
    const line = formatSecurityEvent(
      "login.failed",
      { email: "abc123" },
      new Date("2026-10-16T12:00:00Z"),
    );
    expect(JSON.parse(line)).toEqual({
      tag: "security",
      type: "login.failed",
      at: "2026-10-16T12:00:00.000Z",
      email: "abc123",
    });
  });
});
