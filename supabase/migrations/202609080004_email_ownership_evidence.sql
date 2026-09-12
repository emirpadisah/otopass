begin;

-- Additive preparation. No legacy email_confirmed_at value is backfilled as
-- proof: earlier admin/bootstrap code set that flag without a mailbox challenge.
create schema security_private;
revoke all on schema security_private from public, anon, authenticated;
-- User-requested rollout: capture only accounts present at this migration's
-- cutover. Never infer exemption from a mutable/backdated created_at or metadata.
-- SHARE blocks concurrent Auth inserts until the snapshot commits.
lock table auth.users in share mode;
create table security_private.email_verification_exemptions (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table security_private.email_verification_exemptions enable row level security;
revoke all on security_private.email_verification_exemptions from public, anon, authenticated, service_role;
insert into security_private.email_verification_exemptions(user_id) select id from auth.users;

create table security_private.email_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  auth_confirmed_at timestamptz not null,
  verified_at timestamptz not null default now()
);
alter table security_private.email_verifications enable row level security;
revoke all on security_private.email_verifications from public, anon, authenticated;

-- Public signup stays disabled. Existing unconfirmed users need /resend signup,
-- whereas legacy confirmed users need a new email OTP challenge.
create function public.get_email_challenge_kind(p_email text)
returns text language sql stable security definer set search_path = pg_catalog as $$
  select case when u.email_confirmed_at is null then 'signup' else 'email' end
  from auth.users u join public.user_profiles p on p.user_id = u.id
  where lower(u.email) = lower(p_email) and p.is_active = true
    and not exists (select 1 from security_private.email_verification_exemptions e where e.user_id = u.id)
  limit 1;
$$;

create function public.get_email_verification_status(p_user_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  -- This boolean means "email gate satisfied": existing accounts are exempt,
  -- not retrospectively labelled as mailbox-verified.
  select exists (select 1 from security_private.email_verification_exemptions e where e.user_id = p_user_id)
  or exists (
    select 1 from security_private.email_verifications v
    join auth.users u on u.id = v.user_id
    where u.id = p_user_id and u.email_confirmed_at is not null
      and lower(u.email) = v.email and u.email_confirmed_at = v.auth_confirmed_at
  );
$$;

-- Only the server which just verified the OTP may attest ownership. Knowing a
-- user's id/email or possessing an ordinary Auth session is not sufficient.
create function public.record_email_verification(p_user_id uuid, p_email text, p_confirmed_at timestamptz)
returns void language plpgsql security definer set search_path = pg_catalog as $$
begin
  perform 1 from auth.users u
    join public.user_profiles p on p.user_id = u.id
    where u.id = p_user_id and lower(u.email) = lower(p_email)
      and u.email_confirmed_at = p_confirmed_at and p.is_active = true
      and not exists (select 1 from security_private.email_verification_exemptions e where e.user_id = u.id)
    for update of u, p;
  if not found then raise exception 'EMAIL_VERIFICATION_REJECTED'; end if;
  insert into security_private.email_verifications(user_id, email, auth_confirmed_at)
    values (p_user_id, lower(p_email), p_confirmed_at)
    on conflict (user_id) do update set email = excluded.email,
      auth_confirmed_at = excluded.auth_confirmed_at, verified_at = now();
  insert into public.activity_log(actor_user_id, action, metadata)
    values (p_user_id, 'EMAIL_OWNERSHIP_VERIFIED', '{}'::jsonb);
end;
$$;

create function public.current_user_email_verified()
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  select public.get_email_verification_status(auth.uid());
$$;

revoke all on function public.get_email_challenge_kind(text) from public, anon, authenticated;
grant execute on function public.get_email_challenge_kind(text) to service_role;
revoke all on function public.get_email_verification_status(uuid) from public, anon, authenticated;
revoke all on function public.record_email_verification(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.current_user_email_verified() from public, anon, authenticated;
grant execute on function public.get_email_verification_status(uuid) to service_role;
grant execute on function public.record_email_verification(uuid, text, timestamptz) to service_role;
grant execute on function public.current_user_email_verified() to authenticated;

commit;
