import { describe, expect, it } from "vitest";

import { canAccessAdmin, canViewClient, visibleClients, type Viewer } from "@/lib/domain/access";

const owner: Viewer = {
  id: "u1",
  name: "Ana",
  email: "a@example.com",
  role: "owner",
  clientIds: null,
};
const analyst: Viewer = { ...owner, id: "u2", role: "analyst" };
const clientViewer: Viewer = {
  id: "u3",
  name: "Carla",
  email: "c@example.com",
  role: "client_viewer",
  clientIds: ["c-auto"],
};
const clients = [{ id: "c-auto" }, { id: "c-clinica" }, { id: "c-imob" }];

describe("access rules", () => {
  it("lets agency members see every client", () => {
    expect(visibleClients(owner, clients)).toHaveLength(3);
    expect(visibleClients(analyst, clients)).toHaveLength(3);
  });

  it("limits a client viewer to the clients granted to them", () => {
    expect(visibleClients(clientViewer, clients).map((c) => c.id)).toEqual(["c-auto"]);
    expect(canViewClient(clientViewer, "c-clinica")).toBe(false);
  });

  it("denies everything to a client viewer without grants", () => {
    const empty = { ...clientViewer, clientIds: null };
    expect(visibleClients(empty, clients)).toEqual([]);
    expect(canViewClient({ ...clientViewer, clientIds: [] }, "c-auto")).toBe(false);
  });

  it("reserves the admin area for owners and admins", () => {
    expect(canAccessAdmin(owner)).toBe(true);
    expect(canAccessAdmin({ ...owner, role: "admin" })).toBe(true);
    expect(canAccessAdmin(analyst)).toBe(false);
    expect(canAccessAdmin(clientViewer)).toBe(false);
  });
});
