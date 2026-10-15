-- =============================================================================
-- Segurança (ADR-016): o papel admin só vale com sessão verificada por MFA (aal2).
--
-- Sem o segundo fator, a senha sozinha de um admin não lê nada da agência — nem pelo
-- app nem chamando a API do Supabase direto com o JWT. O próprio vínculo continua
-- legível (memberships_select: user_id = auth.uid()), para o app saber que a pessoa
-- é admin e mandá-la para /mfa. Usuários de cliente não são afetados.
-- =============================================================================

create or replace function app.admin_org_ids()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select m.organization_id from public.memberships m
  where m.user_id = (select auth.uid())
    and m.role = 'admin'
    and coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
$$;
