begin;

-- ACTIVATION: run only after SMTP, OTP delivery, recovery and account-cutover
-- checks pass and the email verification application is ready.
-- Requires 004 and 006. On the deferred production database this replaces the
-- pending 005 activation. On a fresh database it reconciles 005 followed by 006.
-- No Auth user, evidence or exemption rows are changed.
create or replace function public.current_user_is_active()
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select (
    coalesce(auth.jwt()->>'aal' = 'aal2', false)
    or public.current_user_mfa_exempt()
  ) and public.current_user_email_verified()
    and exists (select 1 from public.user_profiles where user_id = auth.uid() and is_active = true);
$$;

do $$
declare v_table record;
begin
  for v_table in
    select n.nspname, c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
  loop
    execute format('drop policy if exists security_email_required on %I.%I', v_table.nspname, v_table.relname);
    execute format(
      'create policy security_email_required on %I.%I as restrictive for all to authenticated using (public.current_user_email_verified()) with check (public.current_user_email_verified())',
      v_table.nspname, v_table.relname
    );
  end loop;
end;
$$;

drop policy if exists security_email_required on storage.objects;
create policy security_email_required on storage.objects as restrictive for all to authenticated
using (public.current_user_email_verified()) with check (public.current_user_email_verified());
revoke all on function public.current_user_is_active() from public, anon;
grant execute on function public.current_user_is_active() to authenticated;

commit;
