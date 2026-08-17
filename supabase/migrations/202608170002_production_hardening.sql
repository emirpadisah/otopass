create extension if not exists pgcrypto;

create table if not exists public.migration_issues (
  id bigserial primary key,
  migration_name text not null,
  table_name text not null,
  row_id text,
  issue text not null,
  original_value jsonb not null default '{}'::jsonb,
  resolution text not null,
  created_at timestamptz not null default now()
);

alter table public.dealers
  add column if not exists legal_name text,
  add column if not exists privacy_contact_email text,
  add column if not exists logo_url text,
  add column if not exists brand_color text,
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deactivated_at timestamptz;

alter table public.user_profiles
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deactivated_at timestamptz;

alter table public.applications
  add column if not exists owner_email text,
  add column if not exists reference_code text,
  add column if not exists submitted_at timestamptz,
  add column if not exists privacy_version text,
  add column if not exists privacy_acknowledged_at timestamptz,
  add column if not exists marketing_consent boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists archived_at timestamptz,
  add column if not exists purged_at timestamptz;

update public.applications
set reference_code = 'OTP-' || to_char(created_at, 'YYYYMMDD') || '-' || upper(substr(md5(id::text), 1, 8))
where reference_code is null;

update public.applications set submitted_at = created_at where submitted_at is null;

create unique index if not exists applications_reference_code_key
  on public.applications(reference_code)
  where reference_code is not null;

create unique index if not exists applications_id_dealer_id_key
  on public.applications(id, dealer_id);

alter table public.offers
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists responded_at timestamptz,
  add column if not exists responded_by uuid references auth.users(id) on delete set null;

-- The legacy NOT VALID constraint still applies to updated rows, so remove it before repairs.
alter table public.applications drop constraint if exists applications_status_check;

insert into public.migration_issues (migration_name, table_name, row_id, issue, original_value, resolution)
select '202608170002', 'applications', id::text, 'invalid_status', jsonb_build_object('status', status), 'mapped_to_archived'
from public.applications
where status not in ('pending', 'offered', 'accepted', 'rejected', 'sold', 'archived');

update public.applications
set status = 'archived', archived_at = coalesce(archived_at, now())
where status not in ('pending', 'offered', 'accepted', 'rejected', 'sold', 'archived');

insert into public.migration_issues (migration_name, table_name, row_id, issue, original_value, resolution)
select '202608170002', 'offers', id::text, 'invalid_status', jsonb_build_object('status', status), 'mapped_to_rejected'
from public.offers
where status not in ('pending', 'accepted', 'rejected');

update public.offers
set status = 'rejected', responded_at = coalesce(responded_at, now())
where status not in ('pending', 'accepted', 'rejected');

insert into public.migration_issues (migration_name, table_name, row_id, issue, original_value, resolution)
select '202608170002', 'dealer_users', id::text, 'invalid_role', jsonb_build_object('role', role), 'mapped_to_viewer'
from public.dealer_users
where role not in ('owner', 'manager', 'viewer');

update public.dealer_users set role = 'viewer' where role not in ('owner', 'manager', 'viewer');

insert into public.migration_issues (migration_name, table_name, row_id, issue, original_value, resolution)
select '202608170002', 'applications', id::text, 'invalid_model_year', jsonb_build_object('model_year', model_year), 'value_cleared'
from public.applications where model_year is not null and model_year not between 1886 and 2100;
update public.applications set model_year = null where model_year is not null and model_year not between 1886 and 2100;

insert into public.migration_issues (migration_name, table_name, row_id, issue, original_value, resolution)
select '202608170002', 'applications', id::text, 'invalid_km', jsonb_build_object('km', km), 'value_cleared'
from public.applications where km is not null and km not between 0 and 10000000;
update public.applications set km = null where km is not null and km not between 0 and 10000000;

insert into public.migration_issues (migration_name, table_name, row_id, issue, original_value, resolution)
select '202608170002', 'offers', id::text, 'invalid_amount', jsonb_build_object('amount', amount), 'value_clamped'
from public.offers where amount <= 0 or amount > 1000000000;
update public.offers set amount = greatest(1, least(amount, 1000000000)) where amount <= 0 or amount > 1000000000;

insert into public.migration_issues (migration_name, table_name, row_id, issue, original_value, resolution)
select '202608170002', 'offers', id::text, 'invalid_currency', jsonb_build_object('currency', currency), 'mapped_to_TRY'
from public.offers where currency is null or currency !~ '^[A-Za-z]{3}$';
update public.offers set currency = 'TRY' where currency is null or currency !~ '^[A-Za-z]{3}$';
update public.offers set currency = upper(currency);

insert into public.migration_issues (migration_name, table_name, row_id, issue, original_value, resolution)
select '202608170002', 'offers', o.id::text, 'cross_tenant_dealer', jsonb_build_object('dealer_id', o.dealer_id), 'dealer_id_aligned_to_application'
from public.offers o
join public.applications a on a.id = o.application_id
where o.dealer_id <> a.dealer_id;

update public.offers o
set dealer_id = a.dealer_id
from public.applications a
where a.id = o.application_id and o.dealer_id <> a.dealer_id;

with ranked as (
  select id, row_number() over (partition by application_id order by created_at desc, id desc) as position
  from public.offers
  where status in ('pending', 'accepted')
)
insert into public.migration_issues (migration_name, table_name, row_id, issue, original_value, resolution)
select '202608170002', 'offers', o.id::text, 'multiple_active_offers', jsonb_build_object('status', o.status), 'older_offer_rejected'
from public.offers o
join ranked r on r.id = o.id
where r.position > 1;

with ranked as (
  select id, row_number() over (partition by application_id order by created_at desc, id desc) as position
  from public.offers
  where status in ('pending', 'accepted')
)
update public.offers o
set status = 'rejected', responded_at = coalesce(o.responded_at, now()), updated_at = now()
from ranked r
where r.id = o.id and r.position > 1;

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications
  add constraint applications_status_check
  check (status in ('pending', 'offered', 'accepted', 'rejected', 'sold', 'archived'));

alter table public.dealer_users drop constraint if exists dealer_users_role_check;
alter table public.dealer_users
  add constraint dealer_users_role_check check (role in ('owner', 'manager', 'viewer'));

alter table public.offers drop constraint if exists offers_status_check;
alter table public.offers
  add constraint offers_status_check check (status in ('pending', 'accepted', 'rejected'));

alter table public.offers drop constraint if exists offers_currency_check;
alter table public.offers
  add constraint offers_currency_check check (currency ~ '^[A-Z]{3}$');

alter table public.applications validate constraint applications_model_year_check;
alter table public.applications validate constraint applications_km_check;
alter table public.offers validate constraint offers_amount_check;

alter table public.offers drop constraint if exists offers_application_id_fkey;
alter table public.offers
  add constraint offers_application_dealer_fkey
  foreign key (application_id, dealer_id)
  references public.applications(id, dealer_id)
  on delete cascade;

create unique index if not exists offers_one_active_per_application
  on public.offers(application_id)
  where status in ('pending', 'accepted');

alter table public.activity_log drop constraint if exists activity_log_actor_user_id_fkey;
alter table public.activity_log
  add constraint activity_log_actor_user_id_fkey
  foreign key (actor_user_id) references auth.users(id) on delete set null;

create table if not exists public.upload_sessions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  finalize_token_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'expired')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.upload_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.upload_sessions(id) on delete cascade,
  object_path text not null unique,
  original_name text not null,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  expected_size bigint not null check (expected_size > 0 and expected_size <= 10485760),
  sort_order integer not null check (sort_order between 0 and 9),
  created_at timestamptz not null default now(),
  unique (session_id, sort_order)
);

create index if not exists upload_sessions_expiry_idx on public.upload_sessions(status, expires_at);

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  event_type text not null,
  recipient_email text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_outbox_pending_idx
  on public.notification_outbox(status, next_attempt_at)
  where status in ('pending', 'failed');

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.app_settings (key, value)
values
  ('retention', '{"archive_after_days":365,"purge_after_days":30}'::jsonb),
  ('public_form', '{"max_photos":10,"max_source_bytes":10485760,"notifications_enabled":true}'::jsonb)
on conflict (key) do nothing;

create table if not exists public.rate_limit_buckets (
  scope text not null,
  key_hash text not null,
  bucket_start timestamptz not null,
  request_count integer not null default 1,
  expires_at timestamptz not null,
  primary key (scope, key_hash, bucket_start)
);

create index if not exists rate_limit_buckets_expiry_idx on public.rate_limit_buckets(expires_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists dealers_set_updated_at on public.dealers;
create trigger dealers_set_updated_at before update on public.dealers
for each row execute function public.set_updated_at();
drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at before update on public.user_profiles
for each row execute function public.set_updated_at();
drop trigger if exists applications_set_updated_at on public.applications;
create trigger applications_set_updated_at before update on public.applications
for each row execute function public.set_updated_at();
drop trigger if exists offers_set_updated_at on public.offers;
create trigger offers_set_updated_at before update on public.offers
for each row execute function public.set_updated_at();
drop trigger if exists notification_outbox_set_updated_at on public.notification_outbox;
create trigger notification_outbox_set_updated_at before update on public.notification_outbox
for each row execute function public.set_updated_at();

create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.user_profiles
    where user_id = auth.uid() and is_active = true
  );
$$;

create or replace function public.current_user_has_dealer_access(_dealer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.current_user_is_active() and exists (
    select 1
    from public.dealer_users du
    join public.dealers d on d.id = du.dealer_id
    where du.user_id = auth.uid() and du.dealer_id = _dealer_id and d.is_active = true
  );
$$;

create or replace function public.current_user_can_manage_dealer(_dealer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.current_user_is_active() and exists (
    select 1
    from public.dealer_users du
    join public.dealers d on d.id = du.dealer_id
    where du.user_id = auth.uid()
      and du.dealer_id = _dealer_id
      and du.role in ('owner', 'manager')
      and d.is_active = true
  );
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.current_user_is_active() and exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_bucket timestamptz;
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit configuration';
  end if;

  v_bucket := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limit_buckets(scope, key_hash, bucket_start, request_count, expires_at)
  values (p_scope, p_key_hash, v_bucket, 1, v_bucket + make_interval(secs => p_window_seconds * 2))
  on conflict (scope, key_hash, bucket_start)
  do update set request_count = public.rate_limit_buckets.request_count + 1
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

create or replace function public.create_dealer_offer(
  p_application_id uuid,
  p_amount numeric,
  p_currency text default 'TRY',
  p_notes text default null
)
returns public.offers
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_application public.applications;
  v_offer public.offers;
begin
  select * into v_application from public.applications where id = p_application_id for update;
  if not found or not public.current_user_can_manage_dealer(v_application.dealer_id) then
    raise exception 'FORBIDDEN';
  end if;
  if v_application.status not in ('pending', 'rejected') then
    raise exception 'INVALID_APPLICATION_STATE';
  end if;
  if p_amount <= 0 or p_amount > 1000000000 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if p_currency is null or p_currency !~ '^[A-Za-z]{3}$' then
    raise exception 'INVALID_CURRENCY';
  end if;

  insert into public.offers(application_id, dealer_id, amount, currency, notes, status)
  values (v_application.id, v_application.dealer_id, p_amount, upper(p_currency), nullif(trim(p_notes), ''), 'pending')
  returning * into v_offer;

  update public.applications set status = 'offered' where id = v_application.id;
  insert into public.activity_log(actor_user_id, dealer_id, application_id, offer_id, action, metadata)
  values (auth.uid(), v_application.dealer_id, v_application.id, v_offer.id, 'OFFER_CREATED', jsonb_build_object('amount', p_amount, 'currency', upper(p_currency)));
  if v_application.owner_email is not null then
    insert into public.notification_outbox(idempotency_key, event_type, recipient_email, payload)
    values (
      'offer-created:' || v_offer.id::text,
      'offer_created',
      v_application.owner_email,
      jsonb_build_object(
        'reference_code', v_application.reference_code,
        'amount', p_amount,
        'currency', upper(p_currency),
        'dealer_name', (select name from public.dealers where id = v_application.dealer_id)
      )
    ) on conflict (idempotency_key) do nothing;
  end if;
  return v_offer;
end;
$$;

create or replace function public.respond_to_dealer_offer(
  p_offer_id uuid,
  p_response text,
  p_note text default null
)
returns public.offers
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_offer public.offers;
  v_application public.applications;
begin
  if p_response not in ('accepted', 'rejected') then
    raise exception 'INVALID_RESPONSE';
  end if;
  select * into v_offer from public.offers where id = p_offer_id for update;
  if not found or not public.current_user_can_manage_dealer(v_offer.dealer_id) then
    raise exception 'FORBIDDEN';
  end if;
  if v_offer.status <> 'pending' then
    raise exception 'INVALID_OFFER_STATE';
  end if;

  update public.offers
  set status = p_response,
      notes = case when nullif(trim(p_note), '') is null then notes else concat_ws(E'\n', notes, trim(p_note)) end,
      responded_at = now(),
      responded_by = auth.uid()
  where id = p_offer_id
  returning * into v_offer;

  update public.applications set status = p_response where id = v_offer.application_id;
  select * into v_application from public.applications where id = v_offer.application_id;
  insert into public.activity_log(actor_user_id, dealer_id, application_id, offer_id, action, metadata)
  values (auth.uid(), v_offer.dealer_id, v_offer.application_id, v_offer.id, 'OFFER_' || upper(p_response), '{}'::jsonb);
  if v_application.owner_email is not null then
    insert into public.notification_outbox(idempotency_key, event_type, recipient_email, payload)
    values (
      'offer-response:' || v_offer.id::text || ':' || p_response,
      'offer_' || p_response,
      v_application.owner_email,
      jsonb_build_object(
        'reference_code', v_application.reference_code,
        'amount', v_offer.amount,
        'currency', v_offer.currency,
        'dealer_name', (select name from public.dealers where id = v_offer.dealer_id)
      )
    ) on conflict (idempotency_key) do nothing;
  end if;
  return v_offer;
end;
$$;

create or replace function public.mark_dealer_application_sold(p_application_id uuid)
returns public.applications
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_application public.applications;
begin
  select * into v_application from public.applications where id = p_application_id for update;
  if not found or not public.current_user_can_manage_dealer(v_application.dealer_id) then
    raise exception 'FORBIDDEN';
  end if;
  if v_application.status <> 'accepted' or not exists (
    select 1 from public.offers where application_id = p_application_id and status = 'accepted'
  ) then
    raise exception 'OFFER_MUST_BE_ACCEPTED';
  end if;
  update public.applications set status = 'sold' where id = p_application_id returning * into v_application;
  insert into public.activity_log(actor_user_id, dealer_id, application_id, action, metadata)
  values (auth.uid(), v_application.dealer_id, v_application.id, 'APPLICATION_SOLD', '{}'::jsonb);
  if v_application.owner_email is not null then
    insert into public.notification_outbox(idempotency_key, event_type, recipient_email, payload)
    values (
      'application-sold:' || v_application.id::text,
      'application_sold',
      v_application.owner_email,
      jsonb_build_object(
        'reference_code', v_application.reference_code,
        'dealer_name', (select name from public.dealers where id = v_application.dealer_id)
      )
    ) on conflict (idempotency_key) do nothing;
  end if;
  return v_application;
end;
$$;

create or replace function public.finalize_public_application(
  p_session_id uuid,
  p_photo_paths text[]
)
returns public.applications
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_session public.upload_sessions;
  v_application public.applications;
  v_dealer public.dealers;
begin
  select * into v_session from public.upload_sessions where id = p_session_id for update;
  if not found or v_session.status <> 'pending' or v_session.expires_at <= now() then
    raise exception 'INVALID_UPLOAD_SESSION';
  end if;
  if coalesce(cardinality(p_photo_paths), 0) > 10 or exists (
    select 1 from unnest(coalesce(p_photo_paths, '{}'::text[])) path
    where not exists (
      select 1 from public.upload_items item
      where item.session_id = p_session_id and item.object_path = path
    )
  ) then
    raise exception 'INVALID_UPLOAD_ITEMS';
  end if;

  update public.applications
  set photo_paths = coalesce(p_photo_paths, '{}'::text[]), submitted_at = now(), status = 'pending'
  where id = v_session.application_id and submitted_at is null
  returning * into v_application;
  if not found then
    raise exception 'APPLICATION_ALREADY_FINALIZED';
  end if;

  update public.upload_sessions set status = 'completed', completed_at = now() where id = p_session_id;
  select * into v_dealer from public.dealers where id = v_application.dealer_id;

  insert into public.activity_log(dealer_id, application_id, action, metadata)
  values (v_application.dealer_id, v_application.id, 'APPLICATION_CREATED', jsonb_build_object('reference_code', v_application.reference_code));

  if v_application.owner_email is not null then
    insert into public.notification_outbox(idempotency_key, event_type, recipient_email, payload)
    values (
      'application-created:customer:' || v_application.id::text,
      'application_created_customer',
      v_application.owner_email,
      jsonb_build_object('reference_code', v_application.reference_code, 'dealer_name', v_dealer.name)
    ) on conflict (idempotency_key) do nothing;
  end if;
  if coalesce(v_dealer.contact_email, v_dealer.privacy_contact_email) is not null then
    insert into public.notification_outbox(idempotency_key, event_type, recipient_email, payload)
    values (
      'application-created:dealer:' || v_application.id::text,
      'application_created_dealer',
      coalesce(v_dealer.contact_email, v_dealer.privacy_contact_email),
      jsonb_build_object(
        'reference_code', v_application.reference_code,
        'owner_name', v_application.owner_name,
        'vehicle', concat_ws(' ', v_application.brand, v_application.model)
      )
    ) on conflict (idempotency_key) do nothing;
  end if;
  return v_application;
end;
$$;

create or replace function public.claim_notification_outbox(p_limit integer default 20)
returns setof public.notification_outbox
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.notification_outbox outbox
  set status = 'processing', attempts = attempts + 1
  where outbox.id in (
    select id from public.notification_outbox
    where status in ('pending', 'failed') and attempts < 5 and next_attempt_at <= now()
    order by created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 100)
  )
  returning outbox.*;
$$;

create or replace function public.admin_update_user_access(
  p_user_id uuid,
  p_full_name text,
  p_role text,
  p_dealer_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.current_user_is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_role not in ('super_admin', 'admin', 'dealer_owner', 'dealer_manager', 'dealer_viewer') then raise exception 'INVALID_ROLE'; end if;
  if p_role = 'super_admin' and not public.current_user_has_role('super_admin') then raise exception 'SUPER_ADMIN_REQUIRED'; end if;
  if exists (select 1 from public.user_roles where user_id = p_user_id and role = 'super_admin')
    and not public.current_user_has_role('super_admin') then raise exception 'SUPER_ADMIN_REQUIRED'; end if;
  if p_role like 'dealer_%' and p_dealer_id is null then raise exception 'DEALER_REQUIRED'; end if;
  if p_role like 'dealer_%' and not exists (
    select 1 from public.dealers where id = p_dealer_id and is_active = true
  ) then raise exception 'ACTIVE_DEALER_REQUIRED'; end if;

  insert into public.user_profiles(user_id, full_name, must_change_password, is_active, deactivated_at)
  values (p_user_id, nullif(trim(p_full_name), ''), false, p_is_active, case when p_is_active then null else now() end)
  on conflict (user_id) do update set
    full_name = excluded.full_name,
    is_active = excluded.is_active,
    deactivated_at = excluded.deactivated_at;

  delete from public.user_roles where user_id = p_user_id;
  insert into public.user_roles(user_id, role) values (p_user_id, p_role);
  delete from public.dealer_users where user_id = p_user_id;
  if p_role like 'dealer_%' then
    insert into public.dealer_users(user_id, dealer_id, role)
    values (p_user_id, p_dealer_id, replace(p_role, 'dealer_', ''));
  end if;

  insert into public.activity_log(actor_user_id, dealer_id, action, metadata)
  values (auth.uid(), p_dealer_id, 'ADMIN_USER_UPDATED', jsonb_build_object('target_user_id', p_user_id, 'role', p_role, 'is_active', p_is_active));
end;
$$;

revoke all on function public.current_user_is_active() from public;
revoke all on function public.current_user_can_manage_dealer(uuid) from public;
revoke all on function public.consume_rate_limit(text, text, integer, integer) from public;
revoke all on function public.create_dealer_offer(uuid, numeric, text, text) from public;
revoke all on function public.respond_to_dealer_offer(uuid, text, text) from public;
revoke all on function public.mark_dealer_application_sold(uuid) from public;
revoke all on function public.finalize_public_application(uuid, text[]) from public;
revoke all on function public.claim_notification_outbox(integer) from public;
revoke all on function public.admin_update_user_access(uuid, text, text, uuid, boolean) from public;
grant execute on function public.current_user_is_active() to authenticated;
grant execute on function public.current_user_can_manage_dealer(uuid) to authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.create_dealer_offer(uuid, numeric, text, text) to authenticated;
grant execute on function public.respond_to_dealer_offer(uuid, text, text) to authenticated;
grant execute on function public.mark_dealer_application_sold(uuid) to authenticated;
grant execute on function public.finalize_public_application(uuid, text[]) to service_role;
grant execute on function public.claim_notification_outbox(integer) to service_role;
grant execute on function public.admin_update_user_access(uuid, text, text, uuid, boolean) to authenticated;

drop policy if exists applications_dealer_update on public.applications;

drop policy if exists offers_dealer_insert on public.offers;
drop policy if exists offers_dealer_update on public.offers;

drop policy if exists applications_admin_all on public.applications;
drop policy if exists applications_admin_read on public.applications;
create policy applications_admin_read on public.applications for select
using (public.current_user_is_admin());

drop policy if exists offers_admin_all on public.offers;
drop policy if exists offers_admin_read on public.offers;
create policy offers_admin_read on public.offers for select
using (public.current_user_is_admin());

drop policy if exists dealer_users_self_read on public.dealer_users;
create policy dealer_users_self_read on public.dealer_users for select
using (
  user_id = auth.uid()
  and public.current_user_is_active()
  and exists (select 1 from public.dealers where id = dealer_id and is_active = true)
);

drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read on public.user_roles for select
using (user_id = auth.uid() and public.current_user_is_active());

drop policy if exists user_profiles_self_read on public.user_profiles;
create policy user_profiles_self_read on public.user_profiles for select
using (user_id = auth.uid() and is_active = true);

drop policy if exists activity_log_admin_insert on public.activity_log;
drop policy if exists activity_log_update on public.activity_log;
drop policy if exists activity_log_delete on public.activity_log;

alter table public.upload_sessions enable row level security;
alter table public.upload_items enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.app_settings enable row level security;
alter table public.migration_issues enable row level security;
alter table public.rate_limit_buckets enable row level security;

create policy app_settings_admin_all on public.app_settings for all
using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy migration_issues_admin_read on public.migration_issues for select
using (public.current_user_is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('applications', 'applications', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
