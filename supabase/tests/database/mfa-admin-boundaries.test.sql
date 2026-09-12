begin;
create extension if not exists pgtap with schema extensions;
select plan(11);
\ir ../fixtures/security-actors.sql

set local role authenticated;
select pg_temp.security_actor('manager_a', 'aal1');
select is_empty($$ select id from public.applications $$, 'AAL1 cannot read applications');
select is_empty($$ select user_id from public.user_profiles $$, 'AAL1 cannot bypass MFA through self-profile policy');
select isnt(public.current_user_can_manage_dealer('91000000-0000-4000-8000-000000000001'), true, 'AAL1 cannot manage dealer');
select throws_ok($$ select public.create_dealer_offer('92000000-0000-4000-8000-000000000002', 100000, 'TRY', null) $$,
  'FORBIDDEN', 'AAL1 cannot invoke the security-definer offer workflow');

select pg_temp.security_actor('admin', 'aal1');
select isnt(public.current_user_is_admin(), true, 'AAL1 does not gain admin access');

select pg_temp.security_actor('admin', 'aal2');
select throws_ok($$ select public.admin_update_user_access('90000000-0000-4000-8000-000000000003', 'Peer', 'dealer_manager', '91000000-0000-4000-8000-000000000001', true) $$,
  'SUPER_ADMIN_REQUIRED', 'admin cannot demote peer before replacing password');
select throws_ok($$ select public.admin_update_user_access('90000000-0000-4000-8000-000000000003', 'Peer', 'admin', null, false) $$,
  'SUPER_ADMIN_REQUIRED', 'admin cannot deactivate peer');
select throws_ok($$ select public.admin_update_user_access('90000000-0000-4000-8000-000000000005', 'Dealer', 'admin', null, true) $$,
  'SUPER_ADMIN_REQUIRED', 'admin cannot promote controlled dealer to admin');
select lives_ok($$ select public.admin_update_user_access('90000000-0000-4000-8000-000000000006', 'Viewer', 'dealer_manager', '91000000-0000-4000-8000-000000000001', true) $$,
  'admin can still manage dealer access');

select pg_temp.security_actor('super_admin', 'aal2');
select lives_ok($$ select public.admin_update_user_access('90000000-0000-4000-8000-000000000003', 'Peer', 'dealer_manager', '91000000-0000-4000-8000-000000000001', true) $$,
  'super admin can manage peer access');
select throws_ok($$ select public.admin_update_user_access('90000000-0000-4000-8000-000000000001', 'Super', 'admin', null, true) $$,
  'LAST_SUPER_ADMIN', 'last active super admin cannot be demoted');

reset role;
select * from finish();
rollback;
