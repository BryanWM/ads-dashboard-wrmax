/**
 * Access rules shared by every data source. Phase 5 enforces the same rules in
 * PostgreSQL (RLS); these functions are the application-side mirror (DAL).
 */
import { ROLE_LABELS, type MembershipRole } from "./admin-types";

export interface Viewer {
  id: string;
  name: string;
  email: string;
  role: MembershipRole;
  /** The single client a client user belongs to; null for the agency admin. */
  clientId: string | null;
}

/** Serializable subset for Client Components (no ids beyond what the UI needs). */
export interface ViewerView {
  name: string;
  email: string;
  role: MembershipRole;
  roleLabel: string;
  isAgency: boolean;
}

export function isAgencyMember(viewer: Viewer): boolean {
  return viewer.role === "admin";
}

/** Admin area (integrations, accounts, access, audit): agency only. */
export function canAccessAdmin(viewer: Viewer): boolean {
  return isAgencyMember(viewer);
}

export function canViewClient(viewer: Viewer, clientId: string): boolean {
  if (isAgencyMember(viewer)) return true;
  return viewer.clientId !== null && viewer.clientId === clientId;
}

export function visibleClients<T extends { id: string }>(
  viewer: Viewer,
  clients: readonly T[],
): T[] {
  return clients.filter((c) => canViewClient(viewer, c.id));
}

export function toViewerView(viewer: Viewer): ViewerView {
  return {
    name: viewer.name,
    email: viewer.email,
    role: viewer.role,
    roleLabel: ROLE_LABELS[viewer.role],
    isAgency: isAgencyMember(viewer),
  };
}
