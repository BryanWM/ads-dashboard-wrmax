import { describe, expect, it } from "vitest";

import { canAccessAdmin, canViewClient, visibleClients, type Viewer } from "@/lib/domain/access";

const admin: Viewer = {
  id: "u1",
  name: "Ana",
  email: "a@example.com",
  role: "admin",
  organizationId: "org-1",
  clientId: null,
};
const client: Viewer = {
  id: "u3",
  name: "Carla",
  email: "c@example.com",
  role: "client",
  organizationId: "org-1",
  clientId: "c-auto",
};
const clients = [{ id: "c-auto" }, { id: "c-clinica" }, { id: "c-imob" }];

describe("access rules", () => {
  it("lets the agency admin see every client", () => {
    expect(visibleClients(admin, clients)).toHaveLength(3);
  });

  it("limits a client user to their own client", () => {
    expect(visibleClients(client, clients).map((c) => c.id)).toEqual(["c-auto"]);
    expect(canViewClient(client, "c-clinica")).toBe(false);
  });

  it("denies everything to a client user without a client", () => {
    const orphan = { ...client, clientId: null };
    expect(visibleClients(orphan, clients)).toEqual([]);
    expect(canViewClient(orphan, "c-auto")).toBe(false);
  });

  it("reserves the admin area for the agency", () => {
    expect(canAccessAdmin(admin)).toBe(true);
    expect(canAccessAdmin(client)).toBe(false);
  });

  it("gives nothing to a signed-in person without an organisation", () => {
    const unlinked = { ...admin, organizationId: null };
    expect(canAccessAdmin(unlinked)).toBe(false);
    expect(visibleClients(unlinked, clients)).toEqual([]);
  });
});
