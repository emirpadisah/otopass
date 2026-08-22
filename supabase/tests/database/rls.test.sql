begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer@test.local', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manager@test.local', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@test.local', '', now(), now(), now());

insert into public.user_profiles(user_id, is_active, must_change_password) values
  ('00000000-0000-4000-8000-000000000101', true, false),
  ('00000000-0000-4000-8000-000000000102', true, false),
  ('00000000-0000-4000-8000-000000000103', true, false);
insert into public.user_roles(user_id, role) values
  ('00000000-0000-4000-8000-000000000101', 'dealer_viewer'),
  ('00000000-0000-4000-8000-000000000102', 'dealer_manager'),
  ('00000000-0000-4000-8000-000000000103', 'dealer_manager');
insert into public.dealers(id, name, slug) values
  ('00000000-0000-4000-8000-000000000201', 'Dealer A', 'dealer-a'),
  ('00000000-0000-4000-8000-000000000202', 'Dealer B', 'dealer-b');
insert into public.dealer_users(user_id, dealer_id, role) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201', 'viewer'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000201', 'manager'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000202', 'manager');
insert into public.dealer_domains(dealer_id, hostname, status)
values ('00000000-0000-4000-8000-000000000201', 'apply.dealer-a.test', 'verified');
insert into public.applications(id, dealer_id, dealer_slug, brand, model, reference_code, submitted_at)
values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000201', 'dealer-a', 'Test', 'Car', 'OTP-TEST-1', now()),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000201', 'dealer-a', 'Test', 'Car 2', 'OTP-TEST-2', now());

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
  $$ values ('00000000-0000-4000-8000-000000000301'::uuid), ('00000000-0000-4000-8000-000000000302'::uuid) $$,
  'viewer reads own dealer applications'
);
select is_empty($$ update public.applications set status = 'sold' where id = '00000000-0000-4000-8000-000000000301' returning id $$, 'viewer cannot update application directly');
select throws_ok($$ select public.create_dealer_offer('00000000-0000-4000-8000-000000000301', 100000, 'TRY', null) $$, 'FORBIDDEN', 'viewer cannot create an offer through RPC');

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

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000103', true);
select throws_ok($$ select public.create_dealer_offer('00000000-0000-4000-8000-000000000302', 200000, 'TRY', null) $$, 'FORBIDDEN', 'cross-tenant manager cannot create offer');
select is_empty($$ select hostname from public.dealer_domains $$, 'cross-tenant manager cannot read another dealer domain');

set local role anon;
select results_eq(
  $$ select dealer_slug from public.resolve_dealer_domain('apply.dealer-a.test') $$,
  $$ values ('dealer-a'::text) $$,
  'anonymous custom-host resolver only returns a verified active dealer'
);

select * from finish();
rollback;
