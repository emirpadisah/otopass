-- Disposable test database only. Claims here are simulated, not real OTPs/JWTs.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
\ir ../fixtures/security-actors.sql

-- Every fixture account was inserted AFTER 004, so even an auto-confirmed
-- account is new and must supply proof. Existing-account exemptions are tested
-- separately below by simulating the migration's trusted snapshot.

set local role authenticated;
select pg_temp.security_actor('legacy_confirmed', 'aal2');
select is(public.current_user_email_verified(), false, 'old auto-confirmed flag is not mailbox proof');
select is(public.current_user_is_active(), false, 'AAL2 cannot bypass missing mailbox proof');
select is_empty($$ select id from public.applications $$, 'new auto-confirmed account cannot bypass email proof');
select is_empty($$ select user_id from public.user_profiles $$, 'self-profile policy cannot bypass email restriction');
select is_empty($$ select id from storage.objects $$, 'storage remains closed without email evidence');
select throws_ok($$ select public.create_dealer_offer('92000000-0000-4000-8000-000000000002', 100000, 'TRY', null) $$,
  'FORBIDDEN', 'security definer offer RPC requires email proof');
select isnt(has_function_privilege('authenticated', 'public.record_email_verification(uuid,text,timestamptz)', 'EXECUTE'), true, 'client cannot attest ownership');
select isnt(has_function_privilege('anon', 'public.record_email_verification(uuid,text,timestamptz)', 'EXECUTE'), true, 'anonymous client cannot attest ownership');
select isnt(has_function_privilege('authenticated', 'public.get_email_challenge_kind(text)', 'EXECUTE'), true, 'client cannot enumerate challenge state');
select isnt(has_schema_privilege('authenticated', 'security_private', 'USAGE'), true, 'client cannot query or edit proof table');

select pg_temp.security_actor('unconfirmed', 'aal2');
select is(public.current_user_email_verified(), false, 'unconfirmed account has no evidence');
select is_empty($$ select id from public.applications $$, 'unconfirmed account is denied');

select pg_temp.security_actor('manager_a', 'aal2');
select is(public.current_user_email_verified(), true, 'matching mailbox evidence is accepted');
select results_eq($$ select id from public.applications $$,
  $$ values ('92000000-0000-4000-8000-000000000002'::uuid) $$, 'verified manager retains submitted own-tenant access');
select pg_temp.security_actor('manager_a', 'aal1');
select is_empty($$ select id from public.applications $$, 'mailbox proof does not replace MFA');
select pg_temp.security_actor('admin', 'aal2');
select ok(public.current_user_is_admin(), 'verified AAL2 admin still has access');

-- Combined 007 gate: a trusted MFA exception must not erase mailbox ownership,
-- account active status or tenant restrictions.
reset role;
insert into security_private.mfa_exemptions(user_id, reason)
values ('90000000-0000-4000-8000-000000000005', 'disposable test');
set local role authenticated;
select pg_temp.security_actor('manager_a', 'aal1');
select ok(public.current_user_is_active(), 'verified MFA-exempt account can use AAL1');
select results_eq($$ select id from public.applications $$,
  $$ values ('92000000-0000-4000-8000-000000000002'::uuid) $$, 'MFA exception preserves tenant boundary');
reset role;
update security_private.email_verifications set email = 'invalid@security.test'
where user_id = '90000000-0000-4000-8000-000000000005';
set local role authenticated;
select is(public.current_user_is_active(), false, 'MFA exception cannot bypass missing mailbox proof');
select is_empty($$ select id from public.applications $$, 'MFA-exempt account without mailbox proof cannot read data');
reset role;
update security_private.email_verifications set email = 'manager-a@security.test'
where user_id = '90000000-0000-4000-8000-000000000005';
update public.user_profiles set is_active = false
where user_id = '90000000-0000-4000-8000-000000000005';
set local role authenticated;
select is(public.current_user_is_active(), false, 'MFA exception cannot bypass inactive profile');
reset role;
update public.user_profiles set is_active = true
where user_id = '90000000-0000-4000-8000-000000000005';
delete from security_private.mfa_exemptions
where user_id = '90000000-0000-4000-8000-000000000005';

reset role;
update auth.users set raw_user_meta_data = '{"email_verified": true, "email_confirmed": true}'::jsonb
  where id = '90000000-0000-4000-8000-000000000013';
set local role authenticated;
select pg_temp.security_actor('legacy_confirmed', 'aal2');
select is(public.current_user_email_verified(), false, 'user-controlled metadata cannot attest ownership');

set local role service_role;
select is(public.get_email_challenge_kind('unconfirmed@security.test'), 'signup', 'unconfirmed account uses resend');
select is(public.get_email_challenge_kind('legacy-confirmed@security.test'), 'email', 'legacy account gets new challenge');
select is(public.get_email_challenge_kind('missing@security.test'), null::text, 'unknown address has no challenge');
select is(public.get_email_challenge_kind('inactive@security.test'), null::text, 'inactive address has no challenge');
select throws_ok($$ select public.record_email_verification('90000000-0000-4000-8000-000000000013', 'wrong@security.test', now()) $$,
  'EMAIL_VERIFICATION_REJECTED', 'mismatched verified email cannot be recorded');
select throws_ok($$ select public.record_email_verification('90000000-0000-4000-8000-000000000009', 'unconfirmed@security.test', now()) $$,
  'EMAIL_VERIFICATION_REJECTED', 'unconfirmed Auth record cannot be attested');
-- Fixture email_confirmed_at is now(), since the entire fixture is one transaction.
select lives_ok($$ select public.record_email_verification('90000000-0000-4000-8000-000000000013', 'legacy-confirmed@security.test', now()) $$,
  'trusted server can record a successfully completed challenge');
set local role authenticated;
select pg_temp.security_actor('legacy_confirmed', 'aal2');
select is(public.current_user_email_verified(), true, 'legacy account regains access after evidence');

reset role;
update auth.users set email = 'changed@security.test' where id = '90000000-0000-4000-8000-000000000013';
set local role authenticated;
select is(public.current_user_email_verified(), false, 'changed address invalidates the evidence even for an existing JWT');
reset role;
update auth.users set email = 'legacy-confirmed@security.test', email_confirmed_at = now() + interval '1 second'
  where id = '90000000-0000-4000-8000-000000000013';
set local role authenticated;
select is(public.current_user_email_verified(), false, 'new confirmation timestamp cannot reuse old evidence');

reset role;
-- Simulate accounts captured at cutover. No mailbox verification is required,
-- including for a pre-existing admin or an address lacking an Auth confirmation.
insert into security_private.email_verification_exemptions(user_id) values
  ('90000000-0000-4000-8000-000000000013'),
  ('90000000-0000-4000-8000-000000000002'),
  ('90000000-0000-4000-8000-000000000008');
delete from security_private.email_verifications where user_id in (
  '90000000-0000-4000-8000-000000000013', '90000000-0000-4000-8000-000000000002');
update auth.users set email_confirmed_at = null where id = '90000000-0000-4000-8000-000000000013';
set local role authenticated;
select pg_temp.security_actor('legacy_confirmed', 'aal2');
select is(public.current_user_email_verified(), true, 'pre-existing account is exempt without mailbox proof');
select results_eq($$ select id from public.applications $$,
  $$ values ('92000000-0000-4000-8000-000000000002'::uuid) $$, 'exempt dealer retains same tenant access');
select pg_temp.security_actor('legacy_confirmed', 'aal1');
select is_empty($$ select id from public.applications $$, 'exemption does not bypass MFA');
select pg_temp.security_actor('admin', 'aal2');
select ok(public.current_user_is_admin(), 'existing admin retains access without new email step');
select pg_temp.security_actor('inactive', 'aal2');
select is(public.current_user_is_active(), false, 'exemption does not activate inactive profiles');
reset role;
select isnt(has_table_privilege('authenticated', 'security_private.email_verification_exemptions', 'INSERT'), true, 'client cannot add exemptions');
select isnt(has_table_privilege('service_role', 'security_private.email_verification_exemptions', 'INSERT'), true, 'application service cannot extend cutover list');

set local role service_role;
select is(public.get_email_challenge_kind('legacy-confirmed@security.test'), null::text, 'no mail challenge for exempt existing user');
select throws_ok($$ select public.record_email_verification('90000000-0000-4000-8000-000000000002', 'admin@security.test', now()) $$,
  'EMAIL_VERIFICATION_REJECTED', 'exempt account is not mutated by ownership workflow');
reset role;
update auth.users set created_at = '2000-01-01', raw_user_meta_data = '{"email_verification_exempt":true}'::jsonb
  where id = '90000000-0000-4000-8000-000000000009';
set local role authenticated;
select pg_temp.security_actor('unconfirmed', 'aal2');
select is(public.current_user_email_verified(), false, 'new account cannot gain exemption by backdating or metadata');

reset role;
select * from finish();
rollback;
