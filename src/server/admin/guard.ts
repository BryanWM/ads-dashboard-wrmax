import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { canAccessAdmin } from "@/lib/domain/access";
import { getViewer, isDemoMode } from "@/server/auth/session";
import { createUserSupabase } from "@/server/supabase/server";

export class AdminActionError extends Error {}

export interface AdminContext {
  userId: string;
  organizationId: string;
  /** Acts as the admin: RLS and column grants still apply. */
  db: SupabaseClient;
}

/** Every admin action starts here: session, role and organisation are re-checked. */
export async function requireAdmin(): Promise<AdminContext> {
  if (isDemoMode()) throw new AdminActionError("Indisponível no modo demonstração.");
  const viewer = await getViewer();
  if (!canAccessAdmin(viewer) || viewer.organizationId === null) {
    throw new AdminActionError("Apenas a agência pode fazer isso.");
  }
  return {
    userId: viewer.id,
    organizationId: viewer.organizationId,
    db: await createUserSupabase(),
  };
}

/** Append-only audit trail, written as the admin (policy: actor = self). */
export async function audit(
  ctx: AdminContext,
  entry: { action: string; targetType: string; targetId: string; label: string },
): Promise<void> {
  const { error } = await ctx.db.from("audit_logs").insert({
    organization_id: ctx.organizationId,
    actor_user_id: ctx.userId,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId,
    metadata: { label: entry.label },
  });
  if (error) throw new Error(`Audit insert failed: ${error.message}`);
}
