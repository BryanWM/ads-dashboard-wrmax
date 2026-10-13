/**
 * Configuração inicial do banco (Supabase):
 *   1. cria (ou reaproveita) a agência;
 *   2. liga um usuário JÁ CRIADO no Supabase Auth a ela, como administrador;
 *   3. carrega/atualiza os clientes de DEMONSTRAÇÃO (source = 'simulated').
 *
 * Uso:  pnpm db:seed --admin-email voce@empresa.com.br [--org-name "WRMax"] [--org-slug wrmax]
 *       pnpm db:seed --admin-email ... --no-demo     (só agência + administrador)
 *
 * Usa NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY do .env.local (nunca os imprime).
 * Idempotente: rodar de novo atualiza os dados de demonstração até ontem.
 */
import { parseArgs } from "node:util";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { todayInTimeZone } from "@/lib/dates/periods";
import { SIM_TIMEZONE } from "@/server/data/simulated/catalog";
import { buildSeedPlan } from "@/server/data/simulated/seed-plan";

const BATCH = 500;

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

async function upsert(
  db: SupabaseClient,
  table: string,
  rows: object[],
  onConflict: string,
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + BATCH), { onConflict });
    if (error) fail(`Falha ao gravar ${table}: ${error.message}`);
  }
}

async function findUserId(db: SupabaseClient, email: string): Promise<string | null> {
  const target = email.toLowerCase();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`Não foi possível listar usuários do Auth: ${error.message}`);
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found.id;
    if (data.users.length < 200) return null;
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      "admin-email": { type: "string" },
      "org-name": { type: "string", default: "WRMax Marketing" },
      "org-slug": { type: "string", default: "wrmax" },
      "no-demo": { type: "boolean", default: false },
    },
  });

  const email = values["admin-email"];
  if (!email)
    fail("Informe o e-mail do administrador: pnpm db:seed --admin-email voce@empresa.com.br");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    fail("Preencha NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local.");
  }
  const db = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Administrador (precisa existir no Auth: Supabase → Authentication → Add user).
  const userId = await findUserId(db, email);
  if (!userId) {
    fail(
      `Usuário ${email} não existe no Supabase Auth.\n` +
        "  Crie em: Supabase → Authentication → Users → Add user → Create new user\n" +
        "  (marque 'Auto Confirm User'), depois rode este comando de novo.",
    );
  }

  // 2. Agência.
  const { data: org, error: orgError } = await db
    .from("organizations")
    .upsert({ name: values["org-name"], slug: values["org-slug"] }, { onConflict: "slug" })
    .select("id, name")
    .single();
  if (orgError || !org) fail(`Falha ao criar a agência: ${orgError?.message}`);
  console.log(`✔ Agência: ${org.name}`);

  const { error: memberError } = await db
    .from("memberships")
    .upsert(
      { organization_id: org.id, user_id: userId, role: "admin", client_id: null },
      { onConflict: "organization_id,user_id" },
    );
  if (memberError) fail(`Falha ao ligar o administrador: ${memberError.message}`);
  console.log(`✔ Administrador: ${email}`);

  if (values["no-demo"]) return;

  // 3. Dados de demonstração.
  const now = new Date();
  const plan = buildSeedPlan(org.id, { now, today: todayInTimeZone(SIM_TIMEZONE, now) });

  await upsert(db, "platform_connections", [plan.connection], "id");
  await upsert(db, "clients", plan.clients, "id");
  await upsert(db, "ad_accounts", plan.adAccounts, "id");
  await upsert(db, "campaigns", plan.campaigns, "id");
  await upsert(db, "ads", plan.ads, "id");
  await upsert(
    db,
    "campaign_metrics_daily",
    plan.campaignMetrics,
    "campaign_id,date,attribution_setting",
  );
  await upsert(db, "ad_metrics_daily", plan.adMetrics, "ad_id,date,attribution_setting");
  await upsert(db, "ad_account_sync_state", plan.syncStates, "ad_account_id");

  // Alcance: os períodos-padrão mudam todo dia → substitui os da demonstração.
  const accountIds = plan.adAccounts.map((a) => a.id);
  const { error: reachDelete } = await db
    .from("reach_snapshots")
    .delete()
    .in("ad_account_id", accountIds)
    .eq("source", "simulated");
  if (reachDelete) fail(`Falha ao limpar alcance: ${reachDelete.message}`);
  await upsert(
    db,
    "reach_snapshots",
    plan.reachSnapshots,
    "ad_account_id,campaign_id,date_start,date_stop,attribution_setting",
  );

  const { error: auditError } = await db.from("audit_logs").insert({
    organization_id: org.id,
    actor_user_id: userId,
    action: "Dados de demonstração carregados",
    target_type: "organization",
    target_id: org.id,
    metadata: {
      label: `${plan.clients.length} clientes de demonstração`,
      rows: plan.campaignMetrics.length,
    },
  });
  if (auditError) fail(`Falha ao registrar auditoria: ${auditError.message}`);

  console.log(
    `✔ Demonstração: ${plan.clients.length} clientes, ${plan.campaigns.length} campanhas, ` +
      `${plan.campaignMetrics.length} dias de campanha, ${plan.adMetrics.length} dias de anúncio`,
  );
  console.log("\nPronto. Rode `pnpm dev` e entre com o e-mail acima.\n");
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
