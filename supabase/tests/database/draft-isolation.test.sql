-- Run only against the disposable local/staging test database.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);
\ir ../fixtures/security-actors.sql

-- These legacy-shaped rows model data created before the workflow guard. They
-- must not become visible or mutable merely because they share a dealer id.
insert into public.offers(id, application_id, dealer_id, amount, currency, status) values
  ('93000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 100000, 'TRY', 'pending'),
  ('93000000-0000-4000-8000-000000000002', '92000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000001', 110000, 'TRY', 'pending');

set local role authenticated;
select pg_temp.security_actor('manager_a', 'aal2');
select results_eq(
  $$ select id from public.applications order by id $$,
  $$ values ('92000000-0000-4000-8000-000000000002'::uuid) $$,
  'manager reads only submitted, unpurged own-dealer applications'
);
select is_empty($$ select id from public.applications where id = '92000000-0000-4000-8000-000000000001' $$, 'manager cannot read own-dealer draft');
select is_empty($$ select id from public.applications where id = '92000000-0000-4000-8000-000000000004' $$, 'manager cannot read own-dealer purged application');
select is_empty($$ select id from public.applications where id = '92000000-0000-4000-8000-000000000003' $$, 'manager cannot read another dealer application');
select is_empty($$ select id from public.offers $$, 'manager cannot read offers attached to hidden applications');
select throws_ok(
  $$ select public.create_dealer_offer('92000000-0000-4000-8000-000000000001', 120000, 'TRY', null) $$,
  'APPLICATION_NOT_SUBMITTED', 'draft cannot receive an offer'
);
select throws_ok(
  $$ select public.create_dealer_offer('92000000-0000-4000-8000-000000000004', 120000, 'TRY', null) $$,
  'APPLICATION_NOT_SUBMITTED', 'purged application cannot receive an offer'
);
select throws_ok(
  $$ select public.respond_to_dealer_offer('93000000-0000-4000-8000-000000000001', 'accepted', null) $$,
  'APPLICATION_NOT_SUBMITTED', 'legacy draft offer cannot be responded to'
);
select throws_ok(
  $$ select public.mark_dealer_application_sold('92000000-0000-4000-8000-000000000004') $$,
  'APPLICATION_NOT_SUBMITTED', 'purged application cannot be sold'
);
select lives_ok(
  $$ select public.create_dealer_offer('92000000-0000-4000-8000-000000000002', 120000, 'TRY', null) $$,
  'submitted application can still receive an offer'
);

set local role service_role;
select is(
  (public.get_dealer_dashboard_snapshot('91000000-0000-4000-8000-000000000001')->>'applicationCount')::integer,
  1, 'dashboard excludes drafts and purged applications'
);
select is(
  (public.get_dealer_dashboard_snapshot('91000000-0000-4000-8000-000000000001')->>'offerCount')::integer,
  1, 'dashboard excludes legacy offers on hidden applications'
);
select is(
  (public.get_dealer_application_page('91000000-0000-4000-8000-000000000001', '', null, 'newest', 0, 25)->>'total')::integer,
  1, 'server-side page excludes drafts and purged applications'
);
select is(
  public.get_dealer_application_page('91000000-0000-4000-8000-000000000001', '', null, 'newest', 0, 25)->'items'->0->>'id',
  '92000000-0000-4000-8000-000000000002', 'server-side page returns only the submitted application'
);

reset role;
select * from finish();
rollback;
