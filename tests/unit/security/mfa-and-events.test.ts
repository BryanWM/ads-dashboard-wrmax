import { describe, expect, it } from "vitest";

import { adminNeedsMfa, mfaStep, normalizeTotpCode, qrDataUri } from "@/lib/auth/mfa";
import { emailFingerprint, formatSecurityEvent } from "@/lib/security/events";

describe("admin second factor (ADR-016)", () => {
  it("only an admin without an aal2 session is sent to /mfa", () => {
    expect(adminNeedsMfa("admin", "aal1")).toBe(true);
    expect(adminNeedsMfa("admin", undefined)).toBe(true);
    expect(adminNeedsMfa("admin", "aal2")).toBe(false);
    expect(adminNeedsMfa("client", "aal1")).toBe(false);
    expect(adminNeedsMfa(null, undefined)).toBe(false);
  });

  it("asks to set the app up only when there is no verified factor yet", () => {
    expect(mfaStep(false)).toBe("enroll");
    expect(mfaStep(true)).toBe("verify");
  });

  it("accepts exactly 6 digits, ignoring spaces people type", () => {
    expect(normalizeTotpCode("123 456")).toBe("123456");
    expect(normalizeTotpCode("12345")).toBeNull();
    expect(normalizeTotpCode("12345a")).toBeNull();
    expect(normalizeTotpCode(null)).toBeNull();
  });

  it("turns the SVG QR into a data URI the CSP allows (img-src data:)", () => {
    expect(qrDataUri("<svg></svg>")).toBe("data:image/svg+xml;utf8,%3Csvg%3E%3C%2Fsvg%3E");
    expect(qrDataUri("data:image/svg+xml;utf8,x")).toBe("data:image/svg+xml;utf8,x");
  });
});

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
