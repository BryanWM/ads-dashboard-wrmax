-- =============================================================================
-- WRMax Metrics — esquema inicial (Fase 5)
--
-- Como aplicar: Supabase → SQL Editor → cole este arquivo inteiro → Run.
-- Rode UMA vez, num projeto vazio. Desenho em docs/data-model.md; papéis em ADR-009.
--
-- Isolamento (RLS): toda tabela de negócio carrega organization_id (e client_id quando
-- aplicável). A agência (role 'admin') vê a organização inteira; o usuário 'client' vê só
-- o próprio cliente. Métricas e sincronização só são gravadas pela service role.
-- =============================================================================

create schema if not exists app;      -- funções auxiliares (não exposto pela API)
create schema if not exists private;  -- segredos (não exposto pela API)

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.membership_role as enum ('admin', 'client');
create type public.client_objective as enum ('purchases', 'messages', 'leads');
create type public.client_status as enum ('active', 'archived');
create type public.ad_platform as enum ('meta', 'google_ads', 'tiktok_ads');
create type public.connection_status as enum ('active', 'needs_reauth', 'revoked', 'error');
create type public.token_type as enum ('user', 'system_user');
create type public.data_source as enum ('meta', 'simulated');
create type public.sync_trigger as enum ('cron', 'manual', 'retry');
create type public.sync_run_status as enum ('running', 'succeeded', 'partial', 'failed');
create type public.sync_job_status as enum
  ('queued', 'running', 'succeeded', 'failed', 'retry_scheduled', 'dead');
create type public.log_level as enum ('debug', 'info', 'warn', 'error');

-- -----------------------------------------------------------------------------
-- Identidade e acesso
-- -----------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  default_timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  -- Só a service role altera (sem grant de update para usuários).
  is_platform_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  status public.client_status not null default 'active',
  -- Decide o "resultado principal" da visão do cliente; null = tipo com mais investimento.
  objective public.client_objective,
  -- Meta de custo por resultado (moeda das contas); null = sem selo de saúde.
  cost_per_result_goal numeric(18, 4) check (cost_per_result_goal > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);
create index clients_organization_idx on public.clients (organization_id);

-- ADR-009: 'admin' = agência (organização inteira); 'client' = exatamente um cliente.
create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.membership_role not null,
  client_id uuid,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  foreign key (organization_id, client_id)
    references public.clients (organization_id, id) on delete cascade,
  constraint memberships_role_scope check (
    (role = 'admin' and client_id is null) or (role = 'client' and client_id is not null)
  )
);
create index memberships_user_idx on public.memberships (user_id);
create index memberships_client_idx on public.memberships (client_id);

-- -----------------------------------------------------------------------------
-- Integrações
-- -----------------------------------------------------------------------------
create table public.platform_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  platform public.ad_platform not null default 'meta',
  label text not null,
  external_business_id text,
  token_type public.token_type not null,
  scopes text[] not null default '{}',
  status public.connection_status not null default 'active',
  expires_at timestamptz,
  last_validated_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, id)
);

-- Token cifrado (AES-256-GCM na aplicação, ADR-004). Nunca exposto pela API.
create table private.platform_credentials (
  connection_id uuid primary key references public.platform_connections (id) on delete cascade,
  ciphertext bytea not null,
  iv bytea not null,
  auth_tag bytea not null,
  key_version integer not null check (key_version > 0),
  updated_at timestamptz not null default now()
);

create table public.ad_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- null = descoberta pela conexão mas ainda não associada (só a agência vê).
  client_id uuid,
  connection_id uuid not null,
  platform public.ad_platform not null default 'meta',
  external_id text not null,
  name text not null,
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  timezone_name text not null,
  account_status text,
  sync_enabled boolean not null default false,
  attribution_setting text not null default 'default',
  created_at timestamptz not null default now(),
  unique (platform, external_id, organization_id),
  unique (organization_id, id),
  foreign key (organization_id, client_id)
    references public.clients (organization_id, id) on delete set null (client_id),
  foreign key (organization_id, connection_id)
    references public.platform_connections (organization_id, id) on delete restrict
);
create index ad_accounts_client_idx on public.ad_accounts (client_id);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid,
  ad_account_id uuid not null,
  external_id text not null,
  name text not null,
  objective text,
  status text,
  effective_status text,
  buying_type text,
  start_time timestamptz,
  stop_time timestamptz,
  external_updated_time timestamptz,
  synced_at timestamptz not null default now(),
  unique (ad_account_id, external_id),
  unique (organization_id, id),
  foreign key (organization_id, ad_account_id)
    references public.ad_accounts (organization_id, id) on delete cascade,
  foreign key (organization_id, client_id)
    references public.clients (organization_id, id) on delete set null (client_id)
);
create index campaigns_client_idx on public.campaigns (client_id);

create table public.ads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid,
  ad_account_id uuid not null,
  campaign_id uuid not null,
  external_id text not null,
  name text not null,
  status text,
  thumbnail_url text,
  synced_at timestamptz not null default now(),
  unique (ad_account_id, external_id),
  foreign key (organization_id, ad_account_id)
    references public.ad_accounts (organization_id, id) on delete cascade,
  foreign key (organization_id, campaign_id)
    references public.campaigns (organization_id, id) on delete cascade,
  foreign key (organization_id, client_id)
    references public.clients (organization_id, id) on delete set null (client_id)
);
create index ads_campaign_idx on public.ads (campaign_id);
create index ads_client_idx on public.ads (client_id);

-- -----------------------------------------------------------------------------
-- Sincronização (uma execução por organização; ver docs/data-model.md)
-- -----------------------------------------------------------------------------
create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  trigger public.sync_trigger not null,
  requested_by uuid references public.profiles (id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status public.sync_run_status not null default 'running',
  stats jsonb not null default '{}'
);
create index sync_runs_org_started_idx on public.sync_runs (organization_id, started_at desc);

create table public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid not null references public.sync_runs (id) on delete cascade,
  organization_id uuid not null,
  ad_account_id uuid not null,
  window_start date not null,
  window_end date not null check (window_end >= window_start),
  status public.sync_job_status not null default 'queued',
  attempt integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  rows_upserted integer not null default 0,
  error_code text,
  -- Mensagem sanitizada: nunca token, URL com access_token ou payload bruto.
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (organization_id, ad_account_id)
    references public.ad_accounts (organization_id, id) on delete cascade
);
create index sync_jobs_pending_idx on public.sync_jobs (next_attempt_at)
  where status in ('queued', 'retry_scheduled');
create index sync_jobs_run_idx on public.sync_jobs (sync_run_id);

create table public.sync_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  sync_job_id uuid not null references public.sync_jobs (id) on delete cascade,
  level public.log_level not null default 'info',
  message text not null,
  context jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index sync_events_job_idx on public.sync_events (sync_job_id);

create table public.ad_account_sync_state (
  ad_account_id uuid primary key,
  organization_id uuid not null,
  client_id uuid,
  last_success_at timestamptz,
  data_through_date date,
  last_attempt_at timestamptz,
  last_error_code text,
  -- Texto amigável e sanitizado, exibido ao cliente.
  last_error_message text,
  consecutive_failures integer not null default 0,
  foreign key (organization_id, ad_account_id)
    references public.ad_accounts (organization_id, id) on delete cascade,
  foreign key (organization_id, client_id)
    references public.clients (organization_id, id) on delete set null (client_id)
);
create index ad_account_sync_state_client_idx on public.ad_account_sync_state (client_id);

-- -----------------------------------------------------------------------------
-- Métricas diárias. Guardamos componentes aditivos; taxas são derivadas na leitura.
-- NULL = a plataforma não informou o campo (nunca zero). reach_daily não é aditivo.
-- -----------------------------------------------------------------------------
create table public.campaign_metrics_daily (
  campaign_id uuid not null,
  date date not null,
  attribution_setting text not null default 'default',
  organization_id uuid not null,
  client_id uuid,
  ad_account_id uuid not null,
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  spend numeric(18, 4),
  impressions bigint,
  reach_daily bigint,
  clicks_all bigint,
  inline_link_clicks bigint,
  results numeric(18, 4),
  result_indicator text,
  purchase_value numeric(18, 4),
  add_to_cart bigint,
  initiate_checkout bigint,
  actions jsonb,
  action_values jsonb,
  source public.data_source not null,
  api_version text,
  synced_at timestamptz not null default now(),
  sync_job_id uuid references public.sync_jobs (id) on delete set null,
  primary key (campaign_id, date, attribution_setting),
  foreign key (organization_id, campaign_id)
    references public.campaigns (organization_id, id) on delete cascade,
  foreign key (organization_id, ad_account_id)
    references public.ad_accounts (organization_id, id) on delete cascade,
  foreign key (organization_id, client_id)
    references public.clients (organization_id, id) on delete set null (client_id)
);
create index campaign_metrics_daily_client_date_idx on public.campaign_metrics_daily (client_id, date);
create index campaign_metrics_daily_account_date_idx on public.campaign_metrics_daily (ad_account_id, date);

create table public.account_metrics_daily (
  ad_account_id uuid not null,
  date date not null,
  attribution_setting text not null default 'default',
  organization_id uuid not null,
  client_id uuid,
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  spend numeric(18, 4),
  impressions bigint,
  reach_daily bigint,
  clicks_all bigint,
  inline_link_clicks bigint,
  actions jsonb,
  action_values jsonb,
  source public.data_source not null,
  api_version text,
  synced_at timestamptz not null default now(),
  sync_job_id uuid references public.sync_jobs (id) on delete set null,
  primary key (ad_account_id, date, attribution_setting),
  foreign key (organization_id, ad_account_id)
    references public.ad_accounts (organization_id, id) on delete cascade,
  foreign key (organization_id, client_id)
    references public.clients (organization_id, id) on delete set null (client_id)
);
create index account_metrics_daily_client_date_idx on public.account_metrics_daily (client_id, date);

create table public.ad_metrics_daily (
  ad_id uuid not null references public.ads (id) on delete cascade,
  date date not null,
  attribution_setting text not null default 'default',
  organization_id uuid not null,
  client_id uuid,
  ad_account_id uuid not null,
  campaign_id uuid not null,
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  spend numeric(18, 4),
  impressions bigint,
  inline_link_clicks bigint,
  results numeric(18, 4),
  result_indicator text,
  purchase_value numeric(18, 4),
  source public.data_source not null,
  api_version text,
  synced_at timestamptz not null default now(),
  sync_job_id uuid references public.sync_jobs (id) on delete set null,
  primary key (ad_id, date, attribution_setting),
  foreign key (organization_id, ad_account_id)
    references public.ad_accounts (organization_id, id) on delete cascade,
  foreign key (organization_id, campaign_id)
    references public.campaigns (organization_id, id) on delete cascade,
  foreign key (organization_id, client_id)
    references public.clients (organization_id, id) on delete set null (client_id)
);
create index ad_metrics_daily_client_date_idx on public.ad_metrics_daily (client_id, date);

-- Alcance deduplicado por período fixo (docs/data-model.md §6).
create table public.reach_snapshots (
  id bigint generated always as identity primary key,
  organization_id uuid not null,
  client_id uuid,
  ad_account_id uuid not null,
  campaign_id uuid,
  date_start date not null,
  date_stop date not null check (date_stop >= date_start),
  attribution_setting text not null default 'default',
  reach bigint,
  impressions bigint,
  frequency numeric(10, 4),
  source public.data_source not null,
  fetched_at timestamptz not null default now(),
  unique nulls not distinct (ad_account_id, campaign_id, date_start, date_stop, attribution_setting),
  foreign key (organization_id, ad_account_id)
    references public.ad_accounts (organization_id, id) on delete cascade,
  foreign key (organization_id, campaign_id)
    references public.campaigns (organization_id, id) on delete cascade,
  foreign key (organization_id, client_id)
    references public.clients (organization_id, id) on delete set null (client_id)
);
create index reach_snapshots_client_idx on public.reach_snapshots (client_id, date_start, date_stop);

-- -----------------------------------------------------------------------------
-- Auditoria (append-only)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}',
  ip inet,
  created_at timestamptz not null default now()
);
create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Funções auxiliares de acesso (security definer: leem memberships sem RLS, evitando
-- recursão). Retornam conjuntos para serem avaliadas uma vez por consulta.
-- -----------------------------------------------------------------------------
create function app.admin_org_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select m.organization_id from public.memberships m
  where m.user_id = (select auth.uid()) and m.role = 'admin'
$$;

create function app.member_org_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select m.organization_id from public.memberships m
  where m.user_id = (select auth.uid())
$$;

create function app.client_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select m.client_id from public.memberships m
  where m.user_id = (select auth.uid()) and m.role = 'client'
$$;

create function app.can_view_client(target uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.clients c
    where c.id = target
      and (c.organization_id in (select app.admin_org_ids())
           or c.id in (select app.client_ids()))
  )
$$;

grant usage on schema app to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Gatilhos
-- -----------------------------------------------------------------------------

-- Perfil criado automaticamente para cada usuário do Auth.
create function app.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

create function app.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger clients_touch_updated_at
  before update on public.clients
  for each row execute function app.touch_updated_at();

-- client_id desnormalizado sempre igual ao da conta de anúncios (base do isolamento).
create function app.inherit_account_client()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  select a.client_id into new.client_id
  from public.ad_accounts a
  where a.id = new.ad_account_id and a.organization_id = new.organization_id;
  if not found then
    raise exception 'ad account % not found in organization %',
      new.ad_account_id, new.organization_id;
  end if;
  return new;
end;
$$;

create trigger campaigns_inherit_client before insert or update of ad_account_id, client_id
  on public.campaigns for each row execute function app.inherit_account_client();
create trigger ads_inherit_client before insert or update of ad_account_id, client_id
  on public.ads for each row execute function app.inherit_account_client();
create trigger campaign_metrics_inherit_client before insert or update of ad_account_id, client_id
  on public.campaign_metrics_daily for each row execute function app.inherit_account_client();
create trigger account_metrics_inherit_client before insert or update of ad_account_id, client_id
  on public.account_metrics_daily for each row execute function app.inherit_account_client();
create trigger ad_metrics_inherit_client before insert or update of ad_account_id, client_id
  on public.ad_metrics_daily for each row execute function app.inherit_account_client();
create trigger reach_snapshots_inherit_client before insert or update of ad_account_id, client_id
  on public.reach_snapshots for each row execute function app.inherit_account_client();
create trigger sync_state_inherit_client before insert or update of ad_account_id, client_id
  on public.ad_account_sync_state for each row execute function app.inherit_account_client();

-- Ao (re)associar uma conta a um cliente, todo o histórico dela acompanha.
create function app.propagate_account_client()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.campaigns set client_id = new.client_id where ad_account_id = new.id;
  update public.ads set client_id = new.client_id where ad_account_id = new.id;
  update public.campaign_metrics_daily set client_id = new.client_id where ad_account_id = new.id;
  update public.account_metrics_daily set client_id = new.client_id where ad_account_id = new.id;
  update public.ad_metrics_daily set client_id = new.client_id where ad_account_id = new.id;
  update public.reach_snapshots set client_id = new.client_id where ad_account_id = new.id;
  update public.ad_account_sync_state set client_id = new.client_id where ad_account_id = new.id;
  return new;
end;
$$;
create trigger ad_accounts_propagate_client
  after update of client_id on public.ad_accounts
  for each row when (old.client_id is distinct from new.client_id)
  execute function app.propagate_account_client();

revoke all on all functions in schema app from public, anon, authenticated;
grant execute on function app.admin_org_ids(), app.member_org_ids(), app.client_ids(),
  app.can_view_client(uuid) to authenticated;
grant execute on all functions in schema app to service_role;

-- -----------------------------------------------------------------------------
-- Acesso ao segredo da conexão: só a service role, via RPC (schema private não é exposto).
-- Valores em base64 para trafegar pela API.
-- -----------------------------------------------------------------------------
create function public.read_platform_credential(p_connection_id uuid)
returns table (ciphertext text, iv text, auth_tag text, key_version integer)
language sql stable security definer set search_path = ''
as $$
  select encode(c.ciphertext, 'base64'), encode(c.iv, 'base64'),
         encode(c.auth_tag, 'base64'), c.key_version
  from private.platform_credentials c
  where c.connection_id = p_connection_id
$$;

create function public.write_platform_credential(
  p_connection_id uuid, p_ciphertext text, p_iv text, p_auth_tag text, p_key_version integer
)
returns void
language sql security definer set search_path = ''
as $$
  insert into private.platform_credentials
    (connection_id, ciphertext, iv, auth_tag, key_version, updated_at)
  values (p_connection_id, decode(p_ciphertext, 'base64'), decode(p_iv, 'base64'),
          decode(p_auth_tag, 'base64'), p_key_version, now())
  on conflict (connection_id) do update set
    ciphertext = excluded.ciphertext, iv = excluded.iv, auth_tag = excluded.auth_tag,
    key_version = excluded.key_version, updated_at = excluded.updated_at
$$;

revoke all on function public.read_platform_credential(uuid) from public, anon, authenticated;
revoke all on function public.write_platform_credential(uuid, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.read_platform_credential(uuid) to service_role;
grant execute on function public.write_platform_credential(uuid, text, text, text, integer)
  to service_role;

-- -----------------------------------------------------------------------------
-- Privilégios: nada para anon; authenticated só o necessário (RLS filtra as linhas).
-- -----------------------------------------------------------------------------
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
grant all on all tables in schema private to service_role;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Tabelas criadas no futuro também nascem fechadas para anon/authenticated.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant select on
  public.organizations, public.profiles, public.memberships, public.clients,
  public.platform_connections, public.ad_accounts, public.campaigns, public.ads,
  public.campaign_metrics_daily, public.account_metrics_daily, public.ad_metrics_daily,
  public.reach_snapshots, public.ad_account_sync_state,
  public.sync_runs, public.sync_jobs, public.sync_events, public.audit_logs
to authenticated;

grant update (name, default_timezone) on public.organizations to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
grant insert (organization_id, name, objective, cost_per_result_goal) on public.clients to authenticated;
grant update (name, status, objective, cost_per_result_goal) on public.clients to authenticated;
grant update (client_id, sync_enabled) on public.ad_accounts to authenticated;
grant insert (organization_id, actor_user_id, action, target_type, target_id, metadata, ip)
  on public.audit_logs to authenticated;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.clients enable row level security;
alter table public.platform_connections enable row level security;
alter table public.ad_accounts enable row level security;
alter table public.campaigns enable row level security;
alter table public.ads enable row level security;
alter table public.campaign_metrics_daily enable row level security;
alter table public.account_metrics_daily enable row level security;
alter table public.ad_metrics_daily enable row level security;
alter table public.reach_snapshots enable row level security;
alter table public.ad_account_sync_state enable row level security;
alter table public.sync_runs enable row level security;
alter table public.sync_jobs enable row level security;
alter table public.sync_events enable row level security;
alter table public.audit_logs enable row level security;
alter table private.platform_credentials enable row level security;

-- Organização: membros leem; a agência edita nome e fuso.
create policy organizations_select on public.organizations for select to authenticated
  using (id in (select app.member_org_ids()));
create policy organizations_update on public.organizations for update to authenticated
  using (id in (select app.admin_org_ids()))
  with check (id in (select app.admin_org_ids()));

-- Perfis: o próprio; a agência lê os perfis dos membros da organização.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or id in (
      select m.user_id from public.memberships m
      where m.organization_id in (select app.admin_org_ids())
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Vínculos: o próprio; a agência lê todos da organização. Escrita só pela service role
-- (criar o login de um cliente exige a API admin do Auth).
create policy memberships_select on public.memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or organization_id in (select app.admin_org_ids())
  );

-- Clientes: a agência lê e edita; o cliente lê só o próprio cadastro.
create policy clients_select on public.clients for select to authenticated
  using (
    organization_id in (select app.admin_org_ids())
    or id in (select app.client_ids())
  );
create policy clients_insert on public.clients for insert to authenticated
  with check (organization_id in (select app.admin_org_ids()));
create policy clients_update on public.clients for update to authenticated
  using (organization_id in (select app.admin_org_ids()))
  with check (organization_id in (select app.admin_org_ids()));

-- Conexões e operação: só a agência.
create policy platform_connections_select on public.platform_connections for select to authenticated
  using (organization_id in (select app.admin_org_ids()));
create policy sync_runs_select on public.sync_runs for select to authenticated
  using (organization_id in (select app.admin_org_ids()));
create policy sync_jobs_select on public.sync_jobs for select to authenticated
  using (organization_id in (select app.admin_org_ids()));
create policy sync_events_select on public.sync_events for select to authenticated
  using (organization_id in (select app.admin_org_ids()));
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (organization_id in (select app.admin_org_ids()));
create policy audit_logs_insert on public.audit_logs for insert to authenticated
  with check (
    organization_id in (select app.admin_org_ids())
    and actor_user_id = (select auth.uid())
  );

-- Contas de anúncio: agência lê/associa; cliente lê as próprias (moeda, fuso).
create policy ad_accounts_select on public.ad_accounts for select to authenticated
  using (
    organization_id in (select app.admin_org_ids())
    or client_id in (select app.client_ids())
  );
create policy ad_accounts_update on public.ad_accounts for update to authenticated
  using (organization_id in (select app.admin_org_ids()))
  with check (organization_id in (select app.admin_org_ids()));

-- Dados de campanhas e métricas: agência (organização) ou o próprio cliente. Só leitura.
create policy campaigns_select on public.campaigns for select to authenticated
  using (organization_id in (select app.admin_org_ids()) or client_id in (select app.client_ids()));
create policy ads_select on public.ads for select to authenticated
  using (organization_id in (select app.admin_org_ids()) or client_id in (select app.client_ids()));
create policy campaign_metrics_daily_select on public.campaign_metrics_daily for select to authenticated
  using (organization_id in (select app.admin_org_ids()) or client_id in (select app.client_ids()));
create policy account_metrics_daily_select on public.account_metrics_daily for select to authenticated
  using (organization_id in (select app.admin_org_ids()) or client_id in (select app.client_ids()));
create policy ad_metrics_daily_select on public.ad_metrics_daily for select to authenticated
  using (organization_id in (select app.admin_org_ids()) or client_id in (select app.client_ids()));
create policy reach_snapshots_select on public.reach_snapshots for select to authenticated
  using (organization_id in (select app.admin_org_ids()) or client_id in (select app.client_ids()));
create policy ad_account_sync_state_select on public.ad_account_sync_state for select to authenticated
  using (organization_id in (select app.admin_org_ids()) or client_id in (select app.client_ids()));

-- private.platform_credentials: RLS ligada e nenhuma política → só a service role.
