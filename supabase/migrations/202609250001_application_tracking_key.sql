-- A separate high-entropy tracking key is required alongside the public
-- reference code. Only its hash is persisted; a rotation replaces the hash.
begin;

create table public.application_tracking_keys (
  application_id uuid primary key references public.applications(id) on delete cascade,
  key_hash text not null check (key_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

alter table public.application_tracking_keys enable row level security;
revoke all on public.application_tracking_keys from public, anon, authenticated;
grant select, insert, update on public.application_tracking_keys to service_role;

create function public.finalize_public_application_with_tracking_key(
  p_session_id uuid,
  p_photo_paths text[],
  p_tracking_key_hash text
)
returns public.applications
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_application public.applications;
begin
  if p_tracking_key_hash is null or p_tracking_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_TRACKING_KEY_HASH';
  end if;

  -- Both operations commit together. A failed key insert rolls back submission.
  v_application := public.finalize_public_application(p_session_id, p_photo_paths);
  insert into public.application_tracking_keys(application_id, key_hash)
  values (v_application.id, p_tracking_key_hash);
  return v_application;
end;
$$;

revoke all on function public.finalize_public_application_with_tracking_key(uuid, text[], text) from public, anon, authenticated;
grant execute on function public.finalize_public_application_with_tracking_key(uuid, text[], text) to service_role;
revoke execute on function public.finalize_public_application(uuid, text[]) from service_role;

create function public.verify_application_tracking_key(p_reference_code text, p_key_hash text)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select application.id
  from public.applications application
  join public.application_tracking_keys tracking on tracking.application_id = application.id
  where application.reference_code = p_reference_code
    and tracking.key_hash = p_key_hash
    and application.submitted_at is not null
    and application.purged_at is null
  limit 1;
$$;

revoke all on function public.verify_application_tracking_key(text, text) from public, anon, authenticated;
grant execute on function public.verify_application_tracking_key(text, text) to service_role;

create function public.rotate_application_tracking_key(
  p_application_id uuid,
  p_dealer_id uuid,
  p_actor_user_id uuid,
  p_key_hash text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_key_hash is null or p_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_TRACKING_KEY_HASH';
  end if;
  if not exists (
    select 1 from public.applications
    where id = p_application_id and dealer_id = p_dealer_id
      and submitted_at is not null and purged_at is null
  ) then
    raise exception 'INVALID_APPLICATION';
  end if;

  insert into public.application_tracking_keys(application_id, key_hash)
  values (p_application_id, p_key_hash)
  on conflict (application_id) do update
    set key_hash = excluded.key_hash, rotated_at = now();

  insert into public.activity_log(actor_user_id, dealer_id, application_id, action, metadata)
  values (p_actor_user_id, p_dealer_id, p_application_id, 'TRACKING_KEY_ROTATED', '{}'::jsonb);
end;
$$;

revoke all on function public.rotate_application_tracking_key(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.rotate_application_tracking_key(uuid, uuid, uuid, text) to service_role;

commit;
