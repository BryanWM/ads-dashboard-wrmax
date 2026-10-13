-- =============================================================================
-- Perfil com e-mail e último acesso (para a tela Administração → Acessos).
-- auth.users não é exposto pela API; um gatilho mantém a cópia em profiles.
-- Como aplicar: Supabase → SQL Editor → cole este arquivo → Run (uma vez).
-- =============================================================================

alter table public.profiles
  add column email text,
  add column last_sign_in_at timestamptz;

update public.profiles p
set email = u.email, last_sign_in_at = u.last_sign_in_at
from auth.users u
where u.id = p.id;

create or replace function app.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, last_sign_in_at)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email,
          new.last_sign_in_at);
  return new;
end;
$$;

create function app.sync_user_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles
  set email = new.email, last_sign_in_at = new.last_sign_in_at
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of email, last_sign_in_at on auth.users
  for each row execute function app.sync_user_profile();

revoke all on function app.sync_user_profile() from public, anon, authenticated;
grant execute on function app.sync_user_profile() to service_role;
