begin;

-- Narrow, auditable exception for the non-production/demo gallery account.
create schema if not exists security_private;

create table if not exists security_private.mfa_exemptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null default 'demo account',
  created_at timestamptz not null default now()
);

alter table security_private.mfa_exemptions enable row level security;
revoke all on security_private.mfa_exemptions from public, anon, authenticated, service_role;

create or replace function public.current_user_mfa_exempt()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, security_private
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from security_private.mfa_exemptions
      where user_id = auth.uid()
    );
$$;

create or replace function public.get_mfa_exemption_status(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, security_private
as $$
  select p_user_id is not null
    and exists (
      select 1
      from security_private.mfa_exemptions
      where user_id = p_user_id
    );
$$;

revoke all on function public.current_user_mfa_exempt() from public, anon;
grant execute on function public.current_user_mfa_exempt() to authenticated;
revoke all on function public.get_mfa_exemption_status(uuid) from public, anon, authenticated;
grant execute on function public.get_mfa_exemption_status(uuid) to service_role;

-- Keep the existing active-account check; only the assurance requirement is bypassed.
create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select (
    coalesce(auth.jwt()->>'aal' = 'aal2', false)
    or public.current_user_mfa_exempt()
  ) and exists (
    select 1 from public.user_profiles
    where user_id = auth.uid() and is_active = true
  );
$$;

-- Seed exactly the named demo identity. No other account is affected.
insert into security_private.mfa_exemptions (user_id, reason)
select id, 'demo gallery account'
from auth.users
where lower(email) = lower('demo@otokopru.com')
on conflict (user_id) do update set reason = excluded.reason;

-- Existing restrictive policies must explicitly recognize the same narrow exception.
do $$
declare
  v_table record;
begin
  for v_table in
    select n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
  loop
    execute format('drop policy if exists security_mfa_required on %I.%I', v_table.nspname, v_table.relname);
    execute format(
      'create policy security_mfa_required on %I.%I as restrictive for all to authenticated using (coalesce(auth.jwt()->>''aal'' = ''aal2'', false) or public.current_user_mfa_exempt()) with check (coalesce(auth.jwt()->>''aal'' = ''aal2'', false) or public.current_user_mfa_exempt())',
      v_table.nspname, v_table.relname
    );
  end loop;
end;
$$;

drop policy if exists security_mfa_required on storage.objects;
create policy security_mfa_required on storage.objects as restrictive for all to authenticated
using (coalesce(auth.jwt()->>'aal' = 'aal2', false) or public.current_user_mfa_exempt())
with check (coalesce(auth.jwt()->>'aal' = 'aal2', false) or public.current_user_mfa_exempt());

commit;
