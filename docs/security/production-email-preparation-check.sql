-- Run only after 202609080004_email_ownership_evidence.sql succeeds.
-- Read-only; returns counts and booleans, never account identities or secrets.
begin read only;

select jsonb_build_object(
  'exempt_accounts', (select count(*) from security_private.email_verification_exemptions),
  'accounts_outside_snapshot', (
    -- Accounts created AFTER migration 004 legitimately appear here.
    select count(*) from auth.users u
    where not exists (select 1 from security_private.email_verification_exemptions e where e.user_id = u.id)
  ),
  'all_exempt_accounts_pass_email_gate', (
    select coalesce(bool_and(public.get_email_verification_status(user_id)), true)
    from security_private.email_verification_exemptions
  ),
  'unknown_user_is_denied', not public.get_email_verification_status('00000000-0000-0000-0000-000000000000'::uuid),
  'exempt_accounts_cannot_request_challenge', not exists (
    select 1 from auth.users u
    join security_private.email_verification_exemptions e on e.user_id = u.id
    where public.get_email_challenge_kind(u.email) is not null
  ),
  'private_tables_have_rls', (
    select count(*) = 2 and bool_and(c.relrowsecurity)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'security_private'
      and c.relname in ('email_verifications', 'email_verification_exemptions')
  ),
  'untrusted_roles_cannot_extend_exemptions', not exists (
    select 1 from unnest(array['anon', 'authenticated', 'service_role']) role_name
    where has_table_privilege(role_name, 'security_private.email_verification_exemptions', 'INSERT')
      or has_table_privilege(role_name, 'security_private.email_verification_exemptions', 'UPDATE')
      or has_table_privilege(role_name, 'security_private.email_verification_exemptions', 'DELETE')
      or has_table_privilege(role_name, 'security_private.email_verification_exemptions', 'TRUNCATE')
  ),
  'service_role_can_read_gate', has_function_privilege('service_role', 'public.get_email_verification_status(uuid)', 'EXECUTE'),
  'clients_cannot_attest_email', not exists (
    select 1 from unnest(array['anon', 'authenticated']) role_name
    where has_function_privilege(role_name, 'public.record_email_verification(uuid,text,timestamptz)', 'EXECUTE')
  ),
  'email_policy_count', (select count(*) from pg_policies where policyname = 'security_email_required')
) as email_preparation_check;

rollback;
