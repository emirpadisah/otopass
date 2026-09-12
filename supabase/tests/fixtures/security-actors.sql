-- Include with \ir inside a transaction on a disposable test database only.
-- These rows cannot sign in: there are no passwords, identities or MFA factors.
-- ON COMMIT DROP also makes accidental autocommit execution fail before writes.
create temporary table security_actors (
  label text primary key,
  user_id uuid unique not null,
  email text unique not null,
  app_role text not null,
  dealer_id uuid,
  member_role text,
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  email_confirmed boolean not null default true,
  check ((dealer_id is null) = (member_role is null))
) on commit drop;

insert into security_actors(label, user_id, email, app_role, dealer_id, member_role) values
  ('super_admin', '90000000-0000-4000-8000-000000000001', 'super-admin@security.test', 'super_admin', null, null),
  ('admin', '90000000-0000-4000-8000-000000000002', 'admin@security.test', 'admin', null, null),
  ('admin_peer', '90000000-0000-4000-8000-000000000003', 'admin-peer@security.test', 'admin', null, null),
  ('owner_a', '90000000-0000-4000-8000-000000000004', 'owner-a@security.test', 'dealer_owner', '91000000-0000-4000-8000-000000000001', 'owner'),
  ('manager_a', '90000000-0000-4000-8000-000000000005', 'manager-a@security.test', 'dealer_manager', '91000000-0000-4000-8000-000000000001', 'manager'),
  ('viewer_a', '90000000-0000-4000-8000-000000000006', 'viewer-a@security.test', 'dealer_viewer', '91000000-0000-4000-8000-000000000001', 'viewer'),
  ('manager_b', '90000000-0000-4000-8000-000000000007', 'manager-b@security.test', 'dealer_manager', '91000000-0000-4000-8000-000000000002', 'manager'),
  ('inactive', '90000000-0000-4000-8000-000000000008', 'inactive@security.test', 'dealer_manager', '91000000-0000-4000-8000-000000000001', 'manager'),
  ('unconfirmed', '90000000-0000-4000-8000-000000000009', 'unconfirmed@security.test', 'dealer_manager', '91000000-0000-4000-8000-000000000001', 'manager'),
  ('password_change', '90000000-0000-4000-8000-000000000010', 'password-change@security.test', 'dealer_manager', '91000000-0000-4000-8000-000000000001', 'manager'),
  ('no_membership', '90000000-0000-4000-8000-000000000011', 'no-membership@security.test', 'dealer_manager', null, null),
  ('inactive_dealer', '90000000-0000-4000-8000-000000000012', 'inactive-dealer@security.test', 'dealer_manager', '91000000-0000-4000-8000-000000000003', 'manager'),
  ('legacy_confirmed', '90000000-0000-4000-8000-000000000013', 'legacy-confirmed@security.test', 'dealer_manager', '91000000-0000-4000-8000-000000000001', 'manager');

update security_actors set is_active = false where label = 'inactive';
update security_actors set email_confirmed = false where label = 'unconfirmed';
update security_actors set must_change_password = true where label = 'password_change';

-- No upsert: collisions must fail instead of changing an existing account.
insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
select user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  email, '', case when email_confirmed then now() else null end, now(), now()
from security_actors;

-- Trusted test-only evidence. Legacy auto-confirmed and unconfirmed actors must
-- remain without evidence to exercise the upgrade boundary.
insert into security_private.email_verifications(user_id, email, auth_confirmed_at)
select a.user_id, a.email, u.email_confirmed_at
from security_actors a join auth.users u on u.id = a.user_id
where a.email_confirmed and a.label <> 'legacy_confirmed';

insert into public.user_profiles(user_id, full_name, is_active, must_change_password, deactivated_at)
select user_id, 'Security test: ' || label, is_active, must_change_password,
  case when is_active then null else now() end
from security_actors;

insert into public.user_roles(user_id, role)
select user_id, app_role from security_actors;

insert into public.dealers(id, name, slug, is_active, deactivated_at) values
  ('91000000-0000-4000-8000-000000000001', 'Security Dealer A', 'security-dealer-a', true, null),
  ('91000000-0000-4000-8000-000000000002', 'Security Dealer B', 'security-dealer-b', true, null),
  ('91000000-0000-4000-8000-000000000003', 'Security Inactive Dealer', 'security-dealer-inactive', false, now());

insert into public.dealer_users(user_id, dealer_id, role)
select user_id, dealer_id, member_role from security_actors where dealer_id is not null;

insert into public.applications(id, dealer_id, dealer_slug, brand, model, reference_code, submitted_at, purged_at) values
  ('92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'security-dealer-a', 'Test', 'Draft', 'SEC-DRAFT-A', null, null),
  ('92000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000001', 'security-dealer-a', 'Test', 'Submitted', 'SEC-SUBMITTED-A', now(), null),
  ('92000000-0000-4000-8000-000000000003', '91000000-0000-4000-8000-000000000002', 'security-dealer-b', 'Test', 'Submitted', 'SEC-SUBMITTED-B', now(), null),
  ('92000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000001', 'security-dealer-a', 'Test', 'Purged', 'SEC-PURGED-A', now(), now());

grant select on security_actors to authenticated;

-- Simulates DB request claims only. It does not perform GoTrue MFA or sign a JWT.
create function pg_temp.security_actor(p_label text, p_aal text default 'aal1')
returns void language plpgsql as $$
declare
  v_id uuid;
begin
  if p_aal not in ('aal1', 'aal2') or p_aal is null then
    raise exception 'INVALID_TEST_AAL';
  end if;
  select user_id into strict v_id from pg_temp.security_actors where label = p_label;
  perform set_config('request.jwt.claim.sub', v_id::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', v_id, 'role', 'authenticated', 'aal', p_aal
  )::text, true);
end;
$$;
