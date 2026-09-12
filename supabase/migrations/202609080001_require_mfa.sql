begin;

-- Service-role bootstrap reads remain available; user-bound helpers require AAL2.
create or replace function public.current_user_is_active()
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
  select coalesce(auth.jwt()->>'aal' = 'aal2', false) and exists (
    select 1 from public.user_profiles where user_id = auth.uid() and is_active = true
  );
$$;

create or replace function public.current_user_has_role(_role text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
  select public.current_user_is_active() and exists (
    select 1 from public.user_roles where user_id = auth.uid() and role = _role
  );
$$;

-- Restrictive policies also cover self-read policies that do not call a helper.
-- They cannot grant access by themselves; existing tenant/role policies still apply.
do $$
declare v_table record;
begin
  for v_table in
    select n.nspname, c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
  loop
    execute format(
      'create policy security_mfa_required on %I.%I as restrictive for all to authenticated using (coalesce(auth.jwt()->>''aal'' = ''aal2'', false)) with check (coalesce(auth.jwt()->>''aal'' = ''aal2'', false))',
      v_table.nspname, v_table.relname
    );
  end loop;
end;
$$;

create policy security_mfa_required on storage.objects as restrictive for all to authenticated
using (coalesce(auth.jwt()->>'aal' = 'aal2', false))
with check (coalesce(auth.jwt()->>'aal' = 'aal2', false));

revoke all on function public.current_user_is_active() from public, anon;
revoke all on function public.current_user_has_role(text) from public, anon;
grant execute on function public.current_user_is_active() to authenticated;
grant execute on function public.current_user_has_role(text) to authenticated;
commit;
