-- Run in polcarr SQL Editor. Read-only: no account data or credentials returned.
begin read only;

select jsonb_build_object(
  'private_schema_exists', to_regnamespace('security_private') is not null,
  'exemptions_table_exists', to_regclass('security_private.email_verification_exemptions') is not null,
  'evidence_table_exists', to_regclass('security_private.email_verifications') is not null,
  'migration_history_exists', to_regclass('supabase_migrations.schema_migrations') is not null,
  'functions', (
    select jsonb_agg(jsonb_build_object(
      'name', p.proname,
      'arguments', pg_get_function_identity_arguments(p.oid),
      'definition', pg_get_functiondef(p.oid),
      'acl', p.proacl::text
    ) order by p.proname)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'current_user_is_active', 'current_user_has_role', 'admin_update_user_access',
      'get_email_challenge_kind', 'get_email_verification_status',
      'record_email_verification', 'current_user_email_verified',
      'create_dealer_offer', 'respond_to_dealer_offer',
      'mark_dealer_application_sold', 'get_dealer_dashboard_snapshot',
      'get_dealer_application_page'
    )
  ),
  'policies', (
    select jsonb_agg(jsonb_build_object(
      'schema', schemaname, 'table', tablename, 'policy', policyname,
      'permissive', permissive, 'roles', roles, 'command', cmd,
      'using', qual, 'with_check', with_check
    ) order by schemaname, tablename, policyname)
    from pg_policies where policyname in (
      'applications_dealer_read', 'offers_dealer_read',
      'security_mfa_required', 'security_email_required'
    )
  )
) as production_preflight;

rollback;
