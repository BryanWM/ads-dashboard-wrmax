"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { fieldErrors, readClientAccessForm, readClientForm } from "@/lib/admin/schemas";
import { createServiceSupabase } from "@/server/supabase/admin";

import { AdminActionError, audit, requireAdmin, type AdminContext } from "./guard";

export interface FormState {
  ok?: boolean;
  fieldErrors?: Record<string, string>;
  formError?: string;
}

export interface AccessLinkState extends FormState {
  /** One-time link the agency sends to the client (shown once, never stored). */
  link?: string;
  email?: string;
}

function failure(error: unknown): { formError: string } {
  if (error instanceof AdminActionError) return { formError: error.message };
  console.error("[admin action]", error instanceof Error ? error.message : "unknown error");
  return { formError: "Não foi possível salvar. Tente novamente em instantes." };
}

async function clientInOrg(ctx: AdminContext, clientId: string) {
  const { data } = await ctx.db
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();
  if (!data) throw new AdminActionError("Cliente não encontrado.");
  return data as { id: string; name: string };
}

// ----------------------------------------------------------------- clientes

export async function saveClient(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = readClientForm(form);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  try {
    const ctx = await requireAdmin();
    const { id, name, objective, costPerResultGoal } = parsed.data;
    const values = { name, objective, cost_per_result_goal: costPerResultGoal };

    if (id === null) {
      const { data, error } = await ctx.db
        .from("clients")
        .insert({ organization_id: ctx.organizationId, ...values })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "insert returned nothing");
      await audit(ctx, {
        action: "Cliente criado",
        targetType: "client",
        targetId: data.id,
        label: name,
      });
    } else {
      await clientInOrg(ctx, id);
      const { error } = await ctx.db.from("clients").update(values).eq("id", id);
      if (error) throw new Error(error.message);
      await audit(ctx, {
        action: "Cliente editado",
        targetType: "client",
        targetId: id,
        label: name,
      });
    }
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// ----------------------------------------------------------------- contas de anúncio

const assignSchema = z.object({ accountId: z.uuid(), clientId: z.uuid().nullable() });

export async function assignAdAccount(input: {
  accountId: string;
  clientId: string | null;
}): Promise<FormState> {
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { formError: "Seleção inválida." };
  try {
    const ctx = await requireAdmin();
    const { accountId, clientId } = parsed.data;
    const client = clientId ? await clientInOrg(ctx, clientId) : null;

    const { data, error } = await ctx.db
      .from("ad_accounts")
      .update({ client_id: clientId })
      .eq("id", accountId)
      .eq("organization_id", ctx.organizationId)
      .select("name")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new AdminActionError("Conta não encontrada.");

    await audit(ctx, {
      action: client ? "Conta associada a cliente" : "Conta desassociada",
      targetType: "ad_account",
      targetId: accountId,
      label: client ? `${data.name} → ${client.name}` : data.name,
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

// ----------------------------------------------------------------- acessos de cliente

async function linkOrigin(): Promise<string> {
  const h = await headers();
  return h.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function accessLink(origin: string, tokenHash: string, type: "invite" | "recovery") {
  const url = new URL("/acesso", origin);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  return url.toString();
}

/**
 * Creates the client's login (Supabase Auth, service role) and returns a one-time
 * link where the person sets their own password. Nothing is e-mailed: the agency
 * sends the link (e.g. WhatsApp). The link is not stored anywhere.
 */
export async function createClientAccess(
  _prev: AccessLinkState,
  form: FormData,
): Promise<AccessLinkState> {
  const parsed = readClientAccessForm(form);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  try {
    const ctx = await requireAdmin();
    const { name, email, clientId } = parsed.data;
    const client = await clientInOrg(ctx, clientId);

    const service = createServiceSupabase();
    const { data, error } = await service.auth.admin.generateLink({
      type: "invite",
      email,
      options: { data: { full_name: name } },
    });
    if (error || !data.user) {
      if (error?.status === 422 || /already/i.test(error?.message ?? "")) {
        throw new AdminActionError(
          "Este e-mail já tem login. Para trocar a senha, use “Novo link” na lista de acessos.",
        );
      }
      throw new Error(error?.message ?? "generateLink returned no user");
    }

    const { error: memberError } = await service.from("memberships").insert({
      organization_id: ctx.organizationId,
      user_id: data.user.id,
      role: "client",
      client_id: client.id,
    });
    if (memberError) {
      await service.auth.admin.deleteUser(data.user.id); // do not leave an orphan login
      throw new Error(memberError.message);
    }

    await audit(ctx, {
      action: "Acesso de cliente criado",
      targetType: "user",
      targetId: data.user.id,
      label: `${name} → ${client.name}`,
    });
    refresh();
    return {
      ok: true,
      email,
      link: accessLink(await linkOrigin(), data.properties.hashed_token, "invite"),
    };
  } catch (error) {
    return failure(error);
  }
}

const memberSchema = z.uuid();

/** The member must be a CLIENT user of this agency (never the admin, never another agency). */
async function clientMember(ctx: AdminContext, userId: string) {
  const { data } = await ctx.db
    .from("memberships")
    .select("user_id, role, profiles(email, full_name)")
    .eq("organization_id", ctx.organizationId)
    .eq("user_id", userId)
    .eq("role", "client")
    .maybeSingle();
  if (!data) throw new AdminActionError("Acesso não encontrado.");
  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const email = (profile as { email: string | null } | null)?.email;
  if (!email) throw new AdminActionError("Este acesso não tem e-mail cadastrado.");
  return { email, name: (profile as { full_name: string | null }).full_name ?? email };
}

/** New one-time link to (re)define the password — e.g. the client forgot it. */
export async function newAccessLink(userId: string): Promise<AccessLinkState> {
  if (!memberSchema.safeParse(userId).success) return { formError: "Acesso inválido." };
  try {
    const ctx = await requireAdmin();
    const member = await clientMember(ctx, userId);
    const { data, error } = await createServiceSupabase().auth.admin.generateLink({
      type: "recovery",
      email: member.email,
    });
    if (error) throw new Error(error.message);
    await audit(ctx, {
      action: "Novo link de acesso gerado",
      targetType: "user",
      targetId: userId,
      label: member.name,
    });
    return {
      ok: true,
      email: member.email,
      link: accessLink(await linkOrigin(), data.properties.hashed_token, "recovery"),
    };
  } catch (error) {
    return failure(error);
  }
}

/** Removes the client's login entirely (client users belong to exactly one client). */
export async function removeClientAccess(userId: string): Promise<FormState> {
  if (!memberSchema.safeParse(userId).success) return { formError: "Acesso inválido." };
  try {
    const ctx = await requireAdmin();
    const member = await clientMember(ctx, userId);
    const { error } = await createServiceSupabase().auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    await audit(ctx, {
      action: "Acesso de cliente removido",
      targetType: "user",
      targetId: userId,
      label: member.name,
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
