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
  /** Clients a client_viewer may see; null = every client of the organisation. */
  clientIds: string[] | null;
}

/** Serializable subset for Client Components (no ids beyond what the UI needs). */
export interface ViewerView {
  name: string;
  email: string;
  role: MembershipRole;
  roleLabel: string;
  isAgency: boolean;
}

const AGENCY_ROLES: readonly MembershipRole[] = ["owner", "admin", "analyst"];
const ADMIN_ROLES: readonly MembershipRole[] = ["owner", "admin"];

export function isAgencyMember(viewer: Viewer): boolean {
  return AGENCY_ROLES.includes(viewer.role);
}

/** Admin area (integrations, accounts, access, audit). Analysts and clients are excluded. */
export function canAccessAdmin(viewer: Viewer): boolean {
  return ADMIN_ROLES.includes(viewer.role);
}

export function canViewClient(viewer: Viewer, clientId: string): boolean {
  if (isAgencyMember(viewer)) return true;
  return viewer.clientIds?.includes(clientId) ?? false;
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
