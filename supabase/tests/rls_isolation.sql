-- =============================================================================
-- Teste de isolamento (RLS) — critério de pronto da Fase 5.
--
-- Como rodar: Supabase → SQL Editor → cole este arquivo → Run.
-- Tudo acontece dentro de uma transação desfeita no final (ROLLBACK): nada fica no banco.
-- Sucesso = termina sem erro. Falha = erro "FALHOU: …" dizendo o que vazou.
--
-- Cenário: agência A (clientes X e Y, uma conta sem cliente) e agência B (cliente Z).
-- Pessoas: admin da A, usuário do cliente X, admin da B, admin da A sem MFA, anônimo.
-- =============================================================================
begin;

-- ---------------------------------------------------------------- dados (service)
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-0000000000a1', 'admin-a@teste.invalid'),
  ('00000000-0000-4000-8000-0000000000c1', 'cliente-x@teste.invalid'),
  ('00000000-0000-4000-8000-0000000000b1', 'admin-b@teste.invalid');

insert into public.organizations (id, name, slug) values
  ('00000000-0000-4000-8000-00000000000a', 'Agência A', 'teste-agencia-a'),
  ('00000000-0000-4000-8000-00000000000b', 'Agência B', 'teste-agencia-b');

insert into public.clients (id, organization_id, name) values
  ('00000000-0000-4000-8000-0000000000aa', '00000000-0000-4000-8000-00000000000a', 'Cliente X'),
  ('00000000-0000-4000-8000-0000000000ab', '00000000-0000-4000-8000-00000000000a', 'Cliente Y'),
  ('00000000-0000-4000-8000-0000000000ba', '00000000-0000-4000-8000-00000000000b', 'Cliente Z');

insert into public.memberships (organization_id, user_id, role, client_id) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1', 'admin', null),
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000c1', 'client',
   '00000000-0000-4000-8000-0000000000aa'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000b1', 'admin', null);

insert into public.platform_connections (id, organization_id, label, token_type) values
  ('00000000-0000-4000-8000-0000000001aa', '00000000-0000-4000-8000-00000000000a', 'BM A', 'system_user'),
  ('00000000-0000-4000-8000-0000000001ba', '00000000-0000-4000-8000-00000000000b', 'BM B', 'system_user');

insert into public.ad_accounts
  (id, organization_id, client_id, connection_id, external_id, name, currency, timezone_name)
values
  ('00000000-0000-4000-8000-0000000002aa', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000000aa', '00000000-0000-4000-8000-0000000001aa',
   'act_teste_x', 'Conta X', 'BRL', 'America/Sao_Paulo'),
  ('00000000-0000-4000-8000-0000000002ab', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000000ab', '00000000-0000-4000-8000-0000000001aa',
   'act_teste_y', 'Conta Y', 'BRL', 'America/Sao_Paulo'),
  ('00000000-0000-4000-8000-0000000002ac', '00000000-0000-4000-8000-00000000000a',
   null, '00000000-0000-4000-8000-0000000001aa',
   'act_teste_sem_cliente', 'Conta sem cliente', 'BRL', 'America/Sao_Paulo'),
  ('00000000-0000-4000-8000-0000000002ba', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000000ba', '00000000-0000-4000-8000-0000000001ba',
   'act_teste_z', 'Conta Z', 'BRL', 'America/Sao_Paulo');

-- client_id é omitido de propósito: o gatilho herda da conta de anúncios.
insert into public.campaigns (id, organization_id, ad_account_id, external_id, name) values
  ('00000000-0000-4000-8000-0000000003aa', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000002aa', 'c_x', 'Campanha X'),
  ('00000000-0000-4000-8000-0000000003ab', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000002ab', 'c_y', 'Campanha Y'),
  ('00000000-0000-4000-8000-0000000003ba', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000002ba', 'c_z', 'Campanha Z');

insert into public.campaign_metrics_daily
  (campaign_id, date, organization_id, ad_account_id, currency, spend, source)
select c.id, d::date, c.organization_id, c.ad_account_id, 'BRL', 10, 'simulated'
from public.campaigns c
cross join generate_series(date '2026-10-01', date '2026-10-03', interval '1 day') d
where c.id::text like '00000000-0000-4000-8000-0000000003%';

insert into public.sync_runs (organization_id, trigger) values
  ('00000000-0000-4000-8000-00000000000a', 'cron'),
  ('00000000-0000-4000-8000-00000000000b', 'cron');

do $$
begin
  -- Tentativa de gravar client_id errado: o gatilho corrige para o da conta.
  insert into public.campaigns (organization_id, client_id, ad_account_id, external_id, name)
  values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000ab',
          '00000000-0000-4000-8000-0000000002aa', 'c_x_tamper', 'Campanha X adulterada');
  if (select client_id from public.campaigns where external_id = 'c_x_tamper')
     <> '00000000-0000-4000-8000-0000000000aa' then
    raise exception 'FALHOU: client_id de campanha não foi herdado da conta';
  end if;
  delete from public.campaigns where external_id = 'c_x_tamper';

  -- Conta de outra agência não pode ser usada.
  begin
    insert into public.campaigns (organization_id, ad_account_id, external_id, name)
    values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000002ba',
            'c_cross', 'Cruzada');
    raise exception 'FALHOU: campanha aceitou conta de outra agência';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
  end;

  -- Usuário de cliente sem cliente é proibido pelo check.
  begin
    insert into public.memberships (organization_id, user_id, role)
    values ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000c1', 'client');
    raise exception 'FALHOU: vínculo de cliente sem client_id foi aceito';
  exception when check_violation then null;
  end;
end $$;

-- ---------------------------------------------------------------- usuário do cliente X
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);

do $$
declare n bigint;
begin
  select count(*) into n from public.clients;
  if n <> 1 then raise exception 'FALHOU: cliente X vê % clientes (esperado 1)', n; end if;

  select count(*) into n from public.clients where id = '00000000-0000-4000-8000-0000000000ab';
  if n <> 0 then raise exception 'FALHOU: cliente X lê o cliente Y pelo id'; end if;

  select count(*) into n from public.ad_accounts;
  if n <> 1 then raise exception 'FALHOU: cliente X vê % contas (esperado 1)', n; end if;

  select count(*) into n from public.campaigns;
  if n <> 1 then raise exception 'FALHOU: cliente X vê % campanhas (esperado 1)', n; end if;

  select count(*) into n from public.campaign_metrics_daily;
  if n <> 3 then raise exception 'FALHOU: cliente X vê % linhas de métrica (esperado 3)', n; end if;

  select count(*) into n from public.organizations;
  if n <> 1 then raise exception 'FALHOU: cliente X vê % organizações (esperado 1)', n; end if;

  select count(*) into n from public.memberships;
  if n <> 1 then raise exception 'FALHOU: cliente X vê % vínculos (esperado 1)', n; end if;

  select count(*) into n from public.platform_connections;
  if n <> 0 then raise exception 'FALHOU: cliente X vê conexões da agência'; end if;

  select count(*) into n from public.sync_runs;
  if n <> 0 then raise exception 'FALHOU: cliente X vê sincronizações'; end if;

  select count(*) into n from public.audit_logs;
  if n <> 0 then raise exception 'FALHOU: cliente X vê auditoria'; end if;

  -- Escritas
  update public.clients set name = 'invadido' where id = '00000000-0000-4000-8000-0000000000aa';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: cliente X editou o próprio cadastro'; end if;

  update public.ad_accounts set client_id = null;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: cliente X alterou contas de anúncio'; end if;

  begin
    insert into public.clients (organization_id, name)
    values ('00000000-0000-4000-8000-00000000000a', 'Cliente intruso');
    raise exception 'FALHOU: cliente X criou um cliente';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.campaign_metrics_daily
      (campaign_id, date, organization_id, ad_account_id, currency, spend, source)
    values ('00000000-0000-4000-8000-0000000003aa', '2026-10-09',
            '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000002aa',
            'BRL', 1, 'meta');
    raise exception 'FALHOU: cliente X gravou métricas';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.read_platform_credential('00000000-0000-4000-8000-0000000001aa');
    raise exception 'FALHOU: cliente X chamou a leitura de credenciais';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- ---------------------------------------------------------------- admin da agência A
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal2"}', true);

do $$
declare n bigint;
begin
  select count(*) into n from public.clients;
  if n <> 2 then raise exception 'FALHOU: admin A vê % clientes (esperado 2)', n; end if;

  select count(*) into n from public.clients where id = '00000000-0000-4000-8000-0000000000ba';
  if n <> 0 then raise exception 'FALHOU: admin A lê o cliente Z da agência B pelo id'; end if;

  select count(*) into n from public.ad_accounts;
  if n <> 3 then raise exception 'FALHOU: admin A vê % contas (esperado 3, com a sem cliente)', n; end if;

  select count(*) into n from public.campaign_metrics_daily;
  if n <> 6 then raise exception 'FALHOU: admin A vê % linhas de métrica (esperado 6)', n; end if;

  select count(*) into n from public.sync_runs;
  if n <> 1 then raise exception 'FALHOU: admin A vê % sincronizações (esperado 1)', n; end if;

  select count(*) into n from public.memberships;
  if n <> 2 then raise exception 'FALHOU: admin A vê % vínculos (esperado 2)', n; end if;

  select count(*) into n from public.profiles;
  if n <> 2 then raise exception 'FALHOU: admin A vê % perfis (esperado 2)', n; end if;

  -- Escritas permitidas e bloqueadas
  update public.clients set objective = 'purchases', cost_per_result_goal = 24
  where id = '00000000-0000-4000-8000-0000000000aa';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: admin A não conseguiu editar o próprio cliente'; end if;

  update public.clients set name = 'invadido' where id = '00000000-0000-4000-8000-0000000000ba';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: admin A editou cliente da agência B'; end if;

  begin
    insert into public.clients (organization_id, name)
    values ('00000000-0000-4000-8000-00000000000b', 'Intruso');
    raise exception 'FALHOU: admin A criou cliente na agência B';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.memberships set role = 'admin', client_id = null;
    raise exception 'FALHOU: admin A alterou vínculos diretamente';
  exception when insufficient_privilege then null;
  end;

  insert into public.audit_logs (organization_id, actor_user_id, action, target_type)
  values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1',
          'teste', 'client');

  begin
    insert into public.audit_logs (organization_id, actor_user_id, action, target_type)
    values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000c1',
            'teste', 'client');
    raise exception 'FALHOU: admin A registrou auditoria em nome de outra pessoa';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.audit_logs set action = 'apagado';
    raise exception 'FALHOU: auditoria aceitou alteração';
  exception when insufficient_privilege then null;
  end;

  -- Reassociar a conta Y ao cliente X: o histórico acompanha.
  update public.ad_accounts set client_id = '00000000-0000-4000-8000-0000000000aa'
  where id = '00000000-0000-4000-8000-0000000002ab';
  select count(*) into n from public.campaign_metrics_daily
  where client_id = '00000000-0000-4000-8000-0000000000aa';
  if n <> 6 then raise exception 'FALHOU: histórico não acompanhou a reassociação (% linhas)', n; end if;

  begin
    update public.ad_accounts set client_id = '00000000-0000-4000-8000-0000000000ba'
    where id = '00000000-0000-4000-8000-0000000002aa';
    raise exception 'FALHOU: admin A associou conta a cliente da agência B';
  exception when foreign_key_violation then null;
  end;
end $$;

reset role;

-- ---------------------------------------------------------------- admin da agência B
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated","aal":"aal2"}', true);

do $$
declare n bigint;
begin
  select count(*) into n from public.clients;
  if n <> 1 then raise exception 'FALHOU: admin B vê % clientes (esperado 1)', n; end if;

  select count(*) into n from public.campaign_metrics_daily;
  if n <> 3 then raise exception 'FALHOU: admin B vê % linhas de métrica (esperado 3)', n; end if;

  select count(*) into n from public.organizations;
  if n <> 1 then raise exception 'FALHOU: admin B vê % organizações', n; end if;

  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'FALHOU: admin B vê % perfis (esperado 1)', n; end if;
end $$;

reset role;

-- ---------------------------------------------------------------- admin A só com senha (aal1)
-- ADR-016: sem o segundo fator o papel admin não vale; só o próprio vínculo é visível.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated","aal":"aal1"}', true);

do $$
declare n bigint;
begin
  select count(*) into n from public.clients;
  if n <> 0 then raise exception 'FALHOU: admin sem MFA vê % clientes (esperado 0)', n; end if;

  select count(*) into n from public.campaign_metrics_daily;
  if n <> 0 then raise exception 'FALHOU: admin sem MFA vê % linhas de métrica', n; end if;

  select count(*) into n from public.platform_connections;
  if n <> 0 then raise exception 'FALHOU: admin sem MFA vê % conexões', n; end if;

  select count(*) into n from public.memberships;
  if n <> 1 then raise exception 'FALHOU: admin sem MFA vê % vínculos (esperado só o próprio)', n; end if;

  begin
    insert into public.audit_logs (organization_id, actor_user_id, action, target_type)
    values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1', 'x', 'x');
    raise exception 'FALHOU: admin sem MFA gravou auditoria';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

-- ---------------------------------------------------------------- visitante anônimo
set local role anon;

do $$
begin
  begin
    perform count(*) from public.clients;
    raise exception 'FALHOU: anônimo leu clientes';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.campaign_metrics_daily;
    raise exception 'FALHOU: anônimo leu métricas';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

select 'OK — isolamento verificado (nada foi gravado)' as resultado;

rollback;
