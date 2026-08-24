-- Restrict privileged mutations to audited server paths and hardened RPCs.

begin;

drop policy if exists dealers_admin_all on public.dealers;
drop policy if exists dealers_admin_read on public.dealers;
create policy dealers_admin_read on public.dealers for select
using (public.current_user_is_admin());

drop policy if exists dealer_users_admin_all on public.dealer_users;
drop policy if exists dealer_users_admin_read on public.dealer_users;
create policy dealer_users_admin_read on public.dealer_users for select
using (public.current_user_is_admin());

drop policy if exists user_roles_admin_all on public.user_roles;
drop policy if exists user_roles_admin_read on public.user_roles;
create policy user_roles_admin_read on public.user_roles for select
using (public.current_user_is_admin());

drop policy if exists user_profiles_admin_all on public.user_profiles;
drop policy if exists user_profiles_admin_read on public.user_profiles;
create policy user_profiles_admin_read on public.user_profiles for select
using (public.current_user_is_admin());

drop policy if exists app_settings_admin_all on public.app_settings;
drop policy if exists app_settings_admin_read on public.app_settings;
create policy app_settings_admin_read on public.app_settings for select
using (public.current_user_is_admin());

drop policy if exists dealer_domains_admin_all on public.dealer_domains;
drop policy if exists dealer_domains_admin_read on public.dealer_domains;
create policy dealer_domains_admin_read on public.dealer_domains for select
using (public.current_user_is_admin());

alter table public.user_profiles drop constraint if exists user_profiles_full_name_length;
alter table public.user_profiles add constraint user_profiles_full_name_length
  check (full_name is null or char_length(full_name) <= 120) not valid;
alter table public.offers drop constraint if exists offers_notes_length;
alter table public.offers add constraint offers_notes_length
  check (notes is null or char_length(notes) <= 4000) not valid;
alter table public.offers drop constraint if exists offers_currency_format;
alter table public.offers add constraint offers_currency_format
  check (currency ~ '^[A-Z]{3}$') not valid;

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
  if p_scope is null or char_length(p_scope) not between 1 and 128
    or p_scope !~ '^[A-Za-z0-9][A-Za-z0-9:_-]*$'
    or p_key_hash !~ '^[a-f0-9]{64}$'
    or p_limit not between 1 and 10000
    or p_window_seconds not between 1 and 86400 then
    raise exception 'INVALID_RATE_LIMIT_CONFIGURATION';
  end if;

  v_bucket := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limit_buckets(scope, key_hash, bucket_start, request_count, expires_at)
  values (p_scope, p_key_hash, v_bucket, 1, v_bucket + make_interval(secs => p_window_seconds * 2))
  on conflict (scope, key_hash, bucket_start)
  do update set request_count = public.rate_limit_buckets.request_count + 1
  returning request_count into v_count;

  return v_count <= p_limit;
end;
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
declare
  v_actor_is_super boolean;
  v_target_is_super boolean;
begin
  perform pg_advisory_xact_lock(hashtext('admin_update_user_access'));
  if not public.current_user_is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_user_id is null or p_is_active is null then raise exception 'INVALID_USER'; end if;
  if p_full_name is not null and char_length(trim(p_full_name)) > 120 then raise exception 'INVALID_FULL_NAME'; end if;
  if p_role not in ('super_admin', 'admin', 'dealer_owner', 'dealer_manager', 'dealer_viewer') then raise exception 'INVALID_ROLE'; end if;

  v_actor_is_super := public.current_user_has_role('super_admin');
  select exists (
    select 1 from public.user_roles where user_id = p_user_id and role = 'super_admin'
  ) into v_target_is_super;
  if (p_role = 'super_admin' or v_target_is_super) and not v_actor_is_super then
    raise exception 'SUPER_ADMIN_REQUIRED';
  end if;
  if p_user_id = auth.uid() and not p_is_active then raise exception 'CANNOT_DEACTIVATE_SELF'; end if;
  if v_target_is_super and (p_role <> 'super_admin' or not p_is_active)
    and (select count(*) from public.user_roles ur join public.user_profiles up on up.user_id = ur.user_id
         where ur.role = 'super_admin' and up.is_active = true) <= 1 then
    raise exception 'LAST_SUPER_ADMIN';
  end if;
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

create or replace function public.prevent_activity_log_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then raise exception 'ACTIVITY_LOG_IMMUTABLE'; end if;
  if new.id is distinct from old.id
    or new.action is distinct from old.action
    or new.metadata is distinct from old.metadata
    or new.created_at is distinct from old.created_at
    or not (new.actor_user_id is not distinct from old.actor_user_id or (old.actor_user_id is not null and new.actor_user_id is null))
    or not (new.dealer_id is not distinct from old.dealer_id or (old.dealer_id is not null and new.dealer_id is null))
    or not (new.application_id is not distinct from old.application_id or (old.application_id is not null and new.application_id is null))
    or not (new.offer_id is not distinct from old.offer_id or (old.offer_id is not null and new.offer_id is null)) then
    raise exception 'ACTIVITY_LOG_IMMUTABLE';
  end if;
  return new;
end;
$$;

drop trigger if exists activity_log_immutable on public.activity_log;
create trigger activity_log_immutable before update or delete on public.activity_log
for each row execute function public.prevent_activity_log_mutation();

create or replace function public.resolve_dealer_domain(p_hostname text)
returns table(dealer_slug text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select dealers.slug
  from public.dealer_domains
  join public.dealers on dealers.id = dealer_domains.dealer_id
  where char_length(p_hostname) between 4 and 253
    and dealer_domains.hostname = lower(trim(trailing '.' from p_hostname))
    and dealer_domains.status = 'verified'
    and dealers.is_active = true
  limit 1;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
revoke all on function public.admin_update_user_access(uuid, text, text, uuid, boolean) from public, anon;
grant execute on function public.admin_update_user_access(uuid, text, text, uuid, boolean) to authenticated;
revoke all on function public.prevent_activity_log_mutation() from public, anon, authenticated;
revoke all on function public.resolve_dealer_domain(text) from public;
grant execute on function public.resolve_dealer_domain(text) to anon, authenticated;

alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

commit;
