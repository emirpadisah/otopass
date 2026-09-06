begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000701', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'followup-manager@test.local', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000702', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'followup-viewer@test.local', '', now(), now(), now()),
  ('00000000-0000-4000-8000-000000000703', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'followup-other@test.local', '', now(), now(), now());
insert into public.user_profiles(user_id, is_active, must_change_password) values
  ('00000000-0000-4000-8000-000000000701', true, false),
  ('00000000-0000-4000-8000-000000000702', true, false),
  ('00000000-0000-4000-8000-000000000703', true, false);
insert into public.dealers(id, name, slug) values
  ('00000000-0000-4000-8000-000000000711', 'Followup A', 'followup-a'),
  ('00000000-0000-4000-8000-000000000712', 'Followup B', 'followup-b');
insert into public.dealer_users(user_id, dealer_id, role) values
  ('00000000-0000-4000-8000-000000000701', '00000000-0000-4000-8000-000000000711', 'manager'),
  ('00000000-0000-4000-8000-000000000702', '00000000-0000-4000-8000-000000000711', 'viewer'),
  ('00000000-0000-4000-8000-000000000703', '00000000-0000-4000-8000-000000000712', 'manager');
insert into public.applications(id, dealer_id, dealer_slug, brand, model, status, submitted_at, created_at) values
  ('00000000-0000-4000-8000-000000000721', '00000000-0000-4000-8000-000000000711', 'followup-a', 'Pending', 'Car', 'pending', now() - interval '2 days', now() - interval '2 days'),
  ('00000000-0000-4000-8000-000000000722', '00000000-0000-4000-8000-000000000711', 'followup-a', 'Offered', 'Car', 'offered', now() - interval '8 days', now() - interval '8 days'),
  ('00000000-0000-4000-8000-000000000723', '00000000-0000-4000-8000-000000000711', 'followup-a', 'Sold', 'Car', 'sold', now() - interval '20 days', now() - interval '20 days');
insert into public.offers(application_id, dealer_id, amount, created_at, status) values
  ('00000000-0000-4000-8000-000000000722', '00000000-0000-4000-8000-000000000711', 100000, now() - interval '7 days', 'rejected'),
  ('00000000-0000-4000-8000-000000000722', '00000000-0000-4000-8000-000000000711', 120000, now() - interval '1 day', 'pending');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000701', true);
select lives_ok($$ select public.add_application_followup('00000000-0000-4000-8000-000000000721', 'Internal note', null) $$, 'manager adds a note without an offer');
select lives_ok($$ select public.add_application_followup('00000000-0000-4000-8000-000000000721', 'Call tomorrow', now() + interval '1 day') $$, 'manager schedules a reminder');
select is((public.get_dealer_due_followups('00000000-0000-4000-8000-000000000711')->>'total')::integer, 0, 'future reminders are hidden');
select throws_ok($$ select public.add_application_followup('00000000-0000-4000-8000-000000000721', '  ', null) $$, 'INVALID_NOTE', 'empty note rejected');
select throws_ok($$ select public.add_application_followup('00000000-0000-4000-8000-000000000721', repeat('x', 2001), null) $$, 'INVALID_NOTE', 'oversized note rejected');
select throws_ok($$ select public.add_application_followup('00000000-0000-4000-8000-000000000721', 'Call', now() - interval '1 day') $$, 'INVALID_REMINDER', 'past reminders rejected');
select throws_ok($$ select public.add_application_followup('00000000-0000-4000-8000-000000000723', 'Call', now() + interval '1 day') $$, 'APPLICATION_CLOSED', 'closed application cannot have a new reminder');
select throws_ok($$ update public.application_followups set note = 'Bypass' $$, '42501', 'permission denied for table application_followups', 'direct writes cannot bypass workflow');

reset role;
update public.application_followups set reminder_at = now() - interval '1 hour' where reminder_at is not null;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000702', true);
select is((select count(*) from public.application_followups)::integer, 2, 'viewer can read own dealer notes');
select is((public.get_dealer_due_followups('00000000-0000-4000-8000-000000000711')->>'total')::integer, 1, 'due reminder is shown');
select throws_ok($$ select public.add_application_followup('00000000-0000-4000-8000-000000000721', 'Viewer note', null) $$, 'FORBIDDEN', 'viewer cannot add notes');
select throws_ok($$ select public.complete_application_followup((select id from public.application_followups where reminder_at is not null)) $$, 'FORBIDDEN', 'viewer cannot complete a reminder');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000703', true);
select is_empty($$ select id from public.application_followups $$, 'other dealer cannot read notes');
select throws_ok($$ select public.add_application_followup('00000000-0000-4000-8000-000000000721', 'Other dealer', null) $$, 'FORBIDDEN', 'other dealer cannot add notes');
select throws_ok($$ select public.get_dealer_due_followups('00000000-0000-4000-8000-000000000711') $$, 'FORBIDDEN', 'other dealer cannot query due reminders');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000701', true);
select lives_ok($$ select public.complete_application_followup((select id from public.application_followups where reminder_at is not null)) $$, 'manager completes reminder');
select lives_ok($$ select public.complete_application_followup((select id from public.application_followups where reminder_at is not null)) $$, 'completion is idempotent');
select is((public.get_dealer_due_followups('00000000-0000-4000-8000-000000000711')->>'total')::integer, 0, 'completed reminder disappears');
select is((select count(*) from public.application_followups)::integer, 2, 'completion preserves notes');

reset role;
update public.user_profiles set is_active = false where user_id = '00000000-0000-4000-8000-000000000701';
set local role authenticated;
select is_empty($$ select id from public.application_followups $$, 'inactive manager cannot read notes');
select throws_ok($$ select public.add_application_followup('00000000-0000-4000-8000-000000000721', 'Inactive', null) $$, 'FORBIDDEN', 'inactive manager cannot write notes');

set local role service_role;
select is(public.get_dealer_application_page('00000000-0000-4000-8000-000000000711', '', null, 'waiting', 0, 1)->'items'->0->>'id',
  '00000000-0000-4000-8000-000000000721', 'waiting sort uses latest offer date, sorts globally before pagination');
select is(public.get_dealer_application_page('00000000-0000-4000-8000-000000000711', '', null, 'waiting', 1, 1)->'items'->0->>'id',
  '00000000-0000-4000-8000-000000000722', 'renewed offer waits less than pending application');
select is(public.get_dealer_application_page('00000000-0000-4000-8000-000000000711', '', null, 'waiting', 2, 1)->'items'->0->>'id',
  '00000000-0000-4000-8000-000000000723', 'completed records sort after waiting records');
select is((public.get_dealer_application_page('00000000-0000-4000-8000-000000000711', 'Offered', 'offered', 'waiting', 0, 25)->>'total')::integer,
  1, 'search and status filters remain active with waiting sort');
select isnt(has_function_privilege('anon', 'public.add_application_followup(uuid,text,timestamptz)', 'EXECUTE'), true, 'anonymous user cannot add notes');
delete from public.applications where id = '00000000-0000-4000-8000-000000000721';
select is_empty($$ select id from public.application_followups $$, 'deleting an application cascades to followups');
select * from finish();
rollback;
