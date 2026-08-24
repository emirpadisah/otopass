begin;
create extension if not exists pgtap with schema extensions;
select plan(39);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer@test.local', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager@test.local', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@test.local', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'inactive@test.local', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'super@test.local', '', now(), now(), now());

insert into public.user_profiles(user_id, is_active, must_change_password) values
  ('00000000-0000-4000-8000-000000000101', true, false),
  ('00000000-0000-4000-8000-000000000102', true, false),
  ('00000000-0000-4000-8000-000000000103', true, false),
  ('00000000-0000-4000-8000-000000000104', false, false),
  ('00000000-0000-4000-8000-000000000105', true, false),
  ('00000000-0000-4000-8000-000000000106', true, false);
insert into public.user_roles(user_id, role) values
  ('00000000-0000-4000-8000-000000000101', 'dealer_viewer'),
  ('00000000-0000-4000-8000-000000000102', 'dealer_manager'),
  ('00000000-0000-4000-8000-000000000103', 'dealer_manager'),
  ('00000000-0000-4000-8000-000000000104', 'dealer_manager'),
  ('00000000-0000-4000-8000-000000000105', 'admin'),
  ('00000000-0000-4000-8000-000000000106', 'super_admin');
insert into public.dealers(id, name, slug) values
  ('00000000-0000-4000-8000-000000000201', 'Dealer A', 'dealer-a'),
  ('00000000-0000-4000-8000-000000000202', 'Dealer B', 'dealer-b');
insert into public.dealer_users(user_id, dealer_id, role) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'viewer'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000201', 'manager'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000202', 'manager'),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000201', 'manager');
insert into public.dealer_domains(dealer_id, hostname, status)
values ('00000000-0000-4000-8000-000000000201', 'apply.dealer-a.test', 'verified');
insert into public.applications(id, dealer_id, dealer_slug, brand, model, reference_code, submitted_at)
values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000201', 'dealer-a', 'Test', 'Car', 'OTP-TEST-1', now()),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000201', 'dealer-a', 'Test', 'Car 2', 'OTP-TEST-2', now()),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000201', 'dealer-a', 'Delete', 'Own', 'OTP-DELETE-1', now()),
  ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000202', 'dealer-b', 'Delete', 'Other', 'OTP-DELETE-2', now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000101', true);
select ok(public.current_user_has_dealer_access('00000000-0000-4000-8000-000000000201'), 'viewer can read own dealer');
select isnt(public.current_user_can_manage_dealer('00000000-0000-4000-8000-000000000201'), true, 'viewer cannot manage dealer');
select results_eq(
  $$ select hostname from public.dealer_domains $$,
  $$ values ('apply.dealer-a.test'::text) $$,
  'viewer reads own dealer domain'
);
select is_empty(
  $$ delete from public.dealer_domains where hostname = 'apply.dealer-a.test' returning id $$,
  'viewer cannot remove a domain directly'
);
select results_eq(
  $$ select id from public.applications order by id $$,
  $$ values ('00000000-0000-4000-8000-000000000301'::uuid), ('00000000-0000-4000-8000-000000000302'::uuid), ('00000000-0000-4000-8000-000000000303'::uuid) $$,
  'viewer reads own dealer applications'
);
select is_empty($$ update public.applications set status = 'sold' where id = '00000000-0000-4000-8000-000000000301' returning id $$, 'viewer cannot update application directly');
select throws_ok($$ select public.create_dealer_offer('00000000-0000-4000-8000-000000000301', 100000, 'TRY', null) $$, 'FORBIDDEN', 'viewer cannot create an offer through RPC');
select throws_ok($$ select public.delete_application_for_current_user('00000000-0000-4000-8000-000000000303') $$, 'FORBIDDEN', 'viewer cannot delete an application');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000102', true);
select ok(public.current_user_can_manage_dealer('00000000-0000-4000-8000-000000000201'), 'manager can manage own dealer');
select is_empty($$ update public.applications set status = 'sold' where id = '00000000-0000-4000-8000-000000000301' returning id $$, 'manager cannot bypass workflow with a direct update');
select lives_ok($$ select public.create_dealer_offer('00000000-0000-4000-8000-000000000301', 100000, 'TRY', null) $$, 'manager creates offer through RPC');
select is((select status from public.applications where id = '00000000-0000-4000-8000-000000000301'), 'offered', 'RPC advances application status');
select throws_ok($$ select public.mark_dealer_application_sold('00000000-0000-4000-8000-000000000301') $$, 'OFFER_MUST_BE_ACCEPTED', 'application cannot be sold before acceptance');
select lives_ok($$ select public.respond_to_dealer_offer((select id from public.offers where application_id = '00000000-0000-4000-8000-000000000301' and status = 'pending'), 'accepted', null) $$, 'manager records acceptance');
select is((select status from public.applications where id = '00000000-0000-4000-8000-000000000301'), 'accepted', 'acceptance advances application status');
select lives_ok($$ select public.mark_dealer_application_sold('00000000-0000-4000-8000-000000000301') $$, 'accepted application can be sold');
select is((select status from public.applications where id = '00000000-0000-4000-8000-000000000301'), 'sold', 'sale advances application status');

select lives_ok($$ select public.create_dealer_offer('00000000-0000-4000-8000-000000000302', 120000, 'TRY', null) $$, 'manager creates a second offer');
select lives_ok($$ select public.respond_to_dealer_offer((select id from public.offers where application_id = '00000000-0000-4000-8000-000000000302' and status = 'pending'), 'rejected', null) $$, 'manager records rejection');
select is((select status from public.applications where id = '00000000-0000-4000-8000-000000000302'), 'rejected', 'rejection advances application status');
select lives_ok($$ select public.create_dealer_offer('00000000-0000-4000-8000-000000000302', 125000, 'TRY', null) $$, 'rejected application can receive a new offer');
select lives_ok($$ select public.create_dealer_offer('00000000-0000-4000-8000-000000000303', 130000, 'TRY', null) $$, 'manager creates an offer before deletion');
select lives_ok($$ select public.delete_application_for_current_user('00000000-0000-4000-8000-000000000303') $$, 'manager deletes own dealer application');
select is_empty($$ select id from public.applications where id = '00000000-0000-4000-8000-000000000303' $$, 'deleted application is removed');
select is_empty($$ select id from public.offers where application_id = '00000000-0000-4000-8000-000000000303' $$, 'application offers are deleted by cascade');
select ok(exists(select 1 from public.activity_log where action = 'APPLICATION_DELETED' and application_id is null and metadata->>'application_id' = '00000000-0000-4000-8000-000000000303'), 'deletion audit survives application removal');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000103', true);
select throws_ok($$ select public.create_dealer_offer('00000000-0000-4000-8000-000000000302', 200000, 'TRY', null) $$, 'FORBIDDEN', 'cross-tenant manager cannot create offer');
select throws_ok($$ select public.delete_application_for_current_user('00000000-0000-4000-8000-000000000302') $$, 'FORBIDDEN', 'cross-tenant manager cannot delete another dealer application');
select is_empty($$ select hostname from public.dealer_domains $$, 'cross-tenant manager cannot read another dealer domain');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000104', true);
select isnt(public.current_user_is_active(), true, 'inactive user is rejected by the active-user helper');
select isnt(public.current_user_can_manage_dealer('00000000-0000-4000-8000-000000000201'), true, 'inactive manager cannot manage a dealer');
select is_empty($$ select id from public.applications $$, 'inactive user cannot read dealer applications');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000105', true);
select ok(public.current_user_is_admin(), 'active admin retains read access');
select is_empty($$ update public.user_roles set role = 'super_admin' where user_id = '00000000-0000-4000-8000-000000000105' returning user_id $$, 'admin cannot elevate a role directly');
select throws_ok($$ select public.admin_update_user_access('00000000-0000-4000-8000-000000000105', 'Admin', 'super_admin', null, true) $$, 'SUPER_ADMIN_REQUIRED', 'admin cannot elevate through the RPC');
select is_empty($$ update public.dealers set name = 'Compromised' where id = '00000000-0000-4000-8000-000000000201' returning id $$, 'admin cannot mutate a dealer directly');
select is_empty($$ update public.activity_log set action = 'TAMPERED' returning id $$, 'admin cannot mutate audit records');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000106', true);
select throws_ok($$ select public.admin_update_user_access('00000000-0000-4000-8000-000000000106', 'Super', 'super_admin', null, false) $$, 'CANNOT_DEACTIVATE_SELF', 'super admin cannot deactivate the current account');

set local role anon;
select results_eq(
  $$ select dealer_slug from public.resolve_dealer_domain('apply.dealer-a.test') $$,
  $$ values ('dealer-a'::text) $$,
  'anonymous custom-host resolver only returns a verified active dealer'
);

select * from finish();
rollback;
