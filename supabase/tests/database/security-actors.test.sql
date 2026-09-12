-- Run only against the disposable local/staging test database.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);
\ir ../fixtures/security-actors.sql

set local role authenticated;
select pg_temp.security_actor('manager_a', 'aal2');
select ok(public.current_user_can_manage_dealer('91000000-0000-4000-8000-000000000001'), 'manager can manage own active dealer');
select isnt(public.current_user_has_dealer_access('91000000-0000-4000-8000-000000000002'), true, 'manager cannot access other tenant');
select is_empty($$ select id from public.applications where id = '92000000-0000-4000-8000-000000000003' $$, 'RLS hides other tenant application');

select pg_temp.security_actor('viewer_a', 'aal2');
select ok(public.current_user_has_dealer_access('91000000-0000-4000-8000-000000000001'), 'viewer has own dealer read access');
select isnt(public.current_user_can_manage_dealer('91000000-0000-4000-8000-000000000001'), true, 'viewer cannot manage dealer');

select pg_temp.security_actor('inactive', 'aal2');
select isnt(public.current_user_is_active(), true, 'inactive profile remains inactive with aal2 claims');

select pg_temp.security_actor('no_membership', 'aal2');
select isnt(public.current_user_has_dealer_access('91000000-0000-4000-8000-000000000001'), true, 'role without membership does not grant tenant access');

select pg_temp.security_actor('inactive_dealer', 'aal2');
select isnt(public.current_user_can_manage_dealer('91000000-0000-4000-8000-000000000003'), true, 'inactive dealer blocks management');

select pg_temp.security_actor('admin', 'aal2');
select is_empty($$ update public.user_roles set role = 'super_admin' where user_id = '90000000-0000-4000-8000-000000000002' returning user_id $$, 'admin cannot directly elevate own role');

reset role;
select * from finish();
rollback;
