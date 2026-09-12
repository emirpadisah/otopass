begin;

-- User-authorized cutover: preserve the existing administrator created while
-- email enforcement was deferred. Fixed identity only; never resnapshot users
-- or infer exemptions from mutable account dates, roles or metadata.
-- Safe on clean databases: an absent production identity is a no-op.
-- This is an exemption, not evidence of mailbox ownership. Auth is untouched.
do $$
begin
  if exists (select 1 from auth.users where id = '63dbe209-ef4c-46d3-a8f7-1ed6b8d9273d') then
    perform 1 from auth.users
      where id = '63dbe209-ef4c-46d3-a8f7-1ed6b8d9273d'
        and lower(email) = 'sahnaemir36@gmail.com'
      for update;
    if not found then raise exception 'EMAIL_CUTOVER_IDENTITY_MISMATCH'; end if;
    insert into security_private.email_verification_exemptions(user_id)
      values ('63dbe209-ef4c-46d3-a8f7-1ed6b8d9273d')
      on conflict (user_id) do nothing;
  end if;
end;
$$;

commit;
