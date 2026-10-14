"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { friendlyMetaError } from "@/lib/meta/errors";
import {
  isTokenVaultConfigured,
  readConnectionToken,
  storeConnectionToken,
} from "@/server/crypto/tokens";
import {
  getGrantedPermissions,
  getTokenOwner,
  listAdAccounts,
} from "@/server/integrations/meta/api";
import { MetaApiError } from "@/server/integrations/meta/client";
import { createServiceSupabase } from "@/server/supabase/admin";
import { runSync } from "@/server/sync/run";

import { AdminActionError, audit, requireAdmin } from "./guard";

export interface MetaActionState {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  formError?: string;
}

function failure(error: unknown): MetaActionState {
  if (error instanceof AdminActionError) return { formError: error.message };
  if (error instanceof MetaApiError) return { formError: friendlyMetaError(error.kind) };
  console.error("[meta action]", error instanceof Error ? error.message : "unknown error");
  return { formError: "Não foi possível concluir. Tente novamente em instantes." };
}

const connectSchema = z.object({
  label: z.string().trim().min(2, "Dê um nome à conexão.").max(80),
  // System-user tokens are long opaque strings; we only sanity-check the shape.
  token: z
    .string()
    .trim()
    .min(40, "Cole a chave completa.")
    .max(2048)
    .regex(
      /^[A-Za-z0-9_\-|.]+$/,
      "A chave tem caracteres inesperados. Copie de novo, sem espaços.",
    ),
});

/** Upserts the ad accounts the token can see (new ones arrive without client, sync off). */
async function discoverAccounts(organizationId: string, connectionId: string, token: string) {
  const accounts = await listAdAccounts(token);
  if (accounts.length === 0) return 0;
  const { error } = await createServiceSupabase()
    .from("ad_accounts")
    .upsert(
      accounts.map((a) => ({
        organization_id: organizationId,
        connection_id: connectionId,
        platform: "meta",
        external_id: a.id,
        name: a.name,
        currency: a.currency,
        timezone_name: a.timezone_name,
        account_status: String(a.account_status),
      })),
      { onConflict: "platform,external_id,organization_id" },
    );
  if (error) throw new Error(`upsert ad accounts: ${error.message}`);
  return accounts.length;
}

/**
 * Connects (or reconnects) Meta with a system-user token pasted by the agency.
 * The token is validated against Meta, encrypted and stored; it is never echoed back.
 */
export async function connectMeta(
  _prev: MetaActionState,
  form: FormData,
): Promise<MetaActionState> {
  const parsed = connectSchema.safeParse({ label: form.get("label"), token: form.get("token") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }
  try {
    const ctx = await requireAdmin();
    if (!isTokenVaultConfigured()) {
      throw new AdminActionError(
        "Falta a chave de criptografia (TOKEN_ENCRYPTION_KEY) no servidor. Configure antes de conectar.",
      );
    }
    const { label, token } = parsed.data;

    const [owner, permissions] = await Promise.all([
      getTokenOwner(token),
      getGrantedPermissions(token),
    ]);
    if (!permissions.includes("ads_read")) {
      throw new AdminActionError(
        "A chave não tem a permissão ads_read. Gere outra marcando ads_read.",
      );
    }

    const service = createServiceSupabase();
    const { data: existing } = await service
      .from("platform_connections")
      .select("id")
      .eq("organization_id", ctx.organizationId)
      .eq("platform", "meta")
      .eq("external_business_id", owner.id)
      .maybeSingle();

    const values = {
      label,
      token_type: "system_user",
      scopes: permissions,
      status: "active",
      last_validated_at: new Date().toISOString(),
    };
    let connectionId: string;
    if (existing) {
      connectionId = existing.id;
      const { error } = await service
        .from("platform_connections")
        .update(values)
        .eq("id", connectionId);
      if (error) throw new Error(error.message);
    } else {
      const { data, error } = await service
        .from("platform_connections")
        .insert({
          ...values,
          organization_id: ctx.organizationId,
          platform: "meta",
          external_business_id: owner.id,
          created_by: ctx.userId,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message ?? "insert connection");
      connectionId = data.id;
    }

    await storeConnectionToken(connectionId, token);
    const found = await discoverAccounts(ctx.organizationId, connectionId, token);
    await audit(ctx, {
      action: existing ? "Integração Meta reconectada" : "Integração Meta conectada",
      targetType: "platform_connection",
      targetId: connectionId,
      label,
    });
    refresh();
    return {
      ok: true,
      message:
        found === 0
          ? "Conectado, mas a chave não enxerga nenhuma conta de anúncio. Atribua contas ao usuário do sistema no Business Manager."
          : `Conectado. ${found} ${found === 1 ? "conta encontrada" : "contas encontradas"}: associe cada uma a um cliente em Contas de anúncio.`,
    };
  } catch (error) {
    return failure(error);
  }
}

const idSchema = z.uuid();

export async function refreshMetaAccounts(connectionId: string): Promise<MetaActionState> {
  if (!idSchema.safeParse(connectionId).success) return { formError: "Conexão inválida." };
  try {
    const ctx = await requireAdmin();
    const { data } = await ctx.db
      .from("platform_connections")
      .select("id, label")
      .eq("id", connectionId)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();
    if (!data) throw new AdminActionError("Conexão não encontrada.");
    const found = await discoverAccounts(
      ctx.organizationId,
      data.id,
      await readConnectionToken(data.id),
    );
    await audit(ctx, {
      action: "Lista de contas atualizada",
      targetType: "platform_connection",
      targetId: data.id,
      label: `${data.label} · ${found} contas`,
    });
    refresh();
    return { ok: true, message: `${found} ${found === 1 ? "conta" : "contas"} na conexão.` };
  } catch (error) {
    if (error instanceof Error && /Credential not found/.test(error.message)) {
      return { formError: "Esta conexão é de demonstração e não tem chave da Meta." };
    }
    return failure(error);
  }
}

/** "Buscar dados agora" for one account: runs the same sync the scheduler will run. */
export async function syncAccountNow(accountId: string): Promise<MetaActionState> {
  if (!idSchema.safeParse(accountId).success) return { formError: "Conta inválida." };
  try {
    const ctx = await requireAdmin();
    const { data: account } = await ctx.db
      .from("ad_accounts")
      .select("id, name, connection_id")
      .eq("id", accountId)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();
    if (!account) throw new AdminActionError("Conta não encontrada.");

    const { results } = await runSync(
      createServiceSupabase(),
      ctx.organizationId,
      [account.id],
      "manual",
      ctx.userId,
    );
    const result = results[0];
    await audit(ctx, {
      action: "Sincronização manual",
      targetType: "ad_account",
      targetId: account.id,
      label: account.name,
    });
    refresh();
    if (!result) return { formError: "Conta não sincronizável." };
    if (!result.ok) {
      const demo = result.error?.startsWith("Falha interna");
      return {
        formError: demo
          ? "Não foi possível buscar os dados. Se esta conta é de demonstração, ela não tem chave da Meta."
          : result.error,
      };
    }
    const extra = result.warnings.length ? ` Avisos: ${result.warnings.join(" ")}` : "";
    return {
      ok: true,
      message: `Dados de ${result.window.from} a ${result.window.to} atualizados (${result.rows} linhas).${extra}`,
    };
  } catch (error) {
    return failure(error);
  }
}
