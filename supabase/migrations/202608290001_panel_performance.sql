-- Collapse high-frequency panel reads into a small number of server-only calls.

begin;

create or replace function public.consume_login_rate_limits(
  p_ip_hash text,
  p_account_hash text
)
returns table(ip_allowed boolean, account_allowed boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_ip_hash is null or p_account_hash is null
    or p_ip_hash !~ '^[0-9a-f]{64}$' or p_account_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_RATE_LIMIT_HASH';
  end if;

  return query select
    public.consume_rate_limit('login-ip', p_ip_hash, 30, 900),
    public.consume_rate_limit('login-account', p_account_hash, 8, 900);
end;
$$;

create or replace function public.get_user_access_context(p_user_id uuid)
returns table(
  user_id uuid,
  is_active boolean,
  must_change_password boolean,
  roles text[],
  dealer_id uuid,
  membership_role text,
  dealer jsonb
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    profile.user_id,
    profile.is_active,
    profile.must_change_password,
    coalesce(
      (select array_agg(role_row.role order by role_row.role)
       from public.user_roles role_row
       where role_row.user_id = profile.user_id),
      '{}'::text[]
    ),
    membership.dealer_id,
    membership.role,
    membership.dealer
  from public.user_profiles profile
  left join lateral (
    select dealer_user.dealer_id, dealer_user.role, to_jsonb(dealer_row) as dealer
    from public.dealer_users dealer_user
    join public.dealers dealer_row
      on dealer_row.id = dealer_user.dealer_id
     and dealer_row.is_active = true
    where dealer_user.user_id = profile.user_id
    order by dealer_user.created_at desc
    limit 1
  ) membership on true
  where p_user_id is not null and profile.user_id = p_user_id
  limit 1;
$$;

create or replace function public.get_dealer_dashboard_snapshot(p_dealer_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with application_counts as (
    select
      count(*)::integer as application_count,
      count(*) filter (where status = 'pending')::integer as pending_count,
      count(*) filter (where status = 'offered')::integer as offered_count,
      count(*) filter (where status = 'sold')::integer as sold_count
    from public.applications
    where p_dealer_id is not null and dealer_id = p_dealer_id and submitted_at is not null
  ),
  offer_count as (
    select count(*)::integer as value
    from public.offers
    where p_dealer_id is not null and dealer_id = p_dealer_id
  ),
  recent_offers as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', recent.id,
      'application_id', recent.application_id,
      'amount', recent.amount,
      'created_at', recent.created_at,
      'brand', recent.brand,
      'model', recent.model
    ) order by recent.created_at desc), '[]'::jsonb) as items
    from (
      select offer_row.id, offer_row.application_id, offer_row.amount, offer_row.created_at,
             application.brand, application.model
      from public.offers offer_row
      left join public.applications application on application.id = offer_row.application_id
      where p_dealer_id is not null and offer_row.dealer_id = p_dealer_id
      order by offer_row.created_at desc
      limit 8
    ) recent
  )
  select jsonb_build_object(
    'applicationCount', application_counts.application_count,
    'pendingCount', application_counts.pending_count,
    'offeredCount', application_counts.offered_count,
    'soldCount', application_counts.sold_count,
    'offerCount', offer_count.value,
    'recentOffers', recent_offers.items
  )
  from application_counts, offer_count, recent_offers;
$$;

create or replace function public.get_admin_dashboard_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'applications', (select count(*) from public.applications where submitted_at is not null),
    'dealers', (select count(*) from public.dealers),
    'offers', (select count(*) from public.offers)
  );
$$;

create or replace function public.get_dealer_application_page(
  p_dealer_id uuid,
  p_query text,
  p_status text,
  p_sort text,
  p_offset integer,
  p_limit integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb;
begin
  if p_dealer_id is null
    or p_offset is null or p_offset < 0
    or p_limit is null or p_limit not between 1 and 100
    or p_sort is null or p_sort not in ('newest', 'oldest')
    or (p_status is not null and p_status not in ('pending', 'offered', 'accepted', 'rejected', 'sold', 'archived'))
    or char_length(coalesce(p_query, '')) > 120 then
    raise exception 'INVALID_PAGINATION_INPUT';
  end if;

  with base as (
    select application.*
    from public.applications application
    where application.dealer_id = p_dealer_id
      and application.submitted_at is not null
  ),
  filtered as (
    select application.*
    from base application
    where (p_status is null or application.status = p_status)
      and (coalesce(p_query, '') = '' or
        application.reference_code ilike '%' || p_query || '%' or
        application.owner_name ilike '%' || p_query || '%' or
        application.owner_phone ilike '%' || p_query || '%' or
        application.owner_email ilike '%' || p_query || '%' or
        application.brand ilike '%' || p_query || '%' or
        application.model ilike '%' || p_query || '%')
  ),
  page_rows as (
    select application.id, application.reference_code, application.owner_name,
           application.owner_phone, application.brand, application.model,
           application.model_year, application.km, application.status,
           application.created_at,
           (select offer_row.amount
            from public.offers offer_row
            where offer_row.application_id = application.id
              and offer_row.dealer_id = p_dealer_id
            order by offer_row.created_at desc
            limit 1) as latest_offer
    from filtered application
    order by
      case when p_sort = 'oldest' then application.created_at end asc,
      case when p_sort = 'newest' then application.created_at end desc,
      application.id
    offset p_offset limit p_limit
  ),
  counts as (
    select jsonb_build_object(
      'pending', count(*) filter (where status = 'pending'),
      'offered', count(*) filter (where status = 'offered'),
      'accepted', count(*) filter (where status = 'accepted'),
      'rejected', count(*) filter (where status = 'rejected'),
      'sold', count(*) filter (where status = 'sold'),
      'archived', count(*) filter (where status = 'archived')
    ) as value
    from base
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(page_rows)) from page_rows), '[]'::jsonb),
    'total', (select count(*) from filtered),
    'statusCounts', counts.value
  ) into v_result
  from counts;

  return v_result;
end;
$$;

create or replace function public.admin_list_users_page(
  p_query text,
  p_status text,
  p_sort text,
  p_offset integer,
  p_limit integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_result jsonb;
begin
  if p_offset is null or p_offset < 0
    or p_limit is null or p_limit not between 1 and 100
    or p_sort is null or p_sort not in ('newest', 'oldest')
    or (p_status is not null and p_status not in ('active', 'inactive'))
    or char_length(coalesce(p_query, '')) > 120 then
    raise exception 'INVALID_PAGINATION_INPUT';
  end if;

  with users_with_access as (
    select profile.user_id, auth_user.email, profile.full_name,
           profile.must_change_password, profile.is_active, profile.created_at,
           coalesce((select array_agg(role_row.role order by role_row.role)
             from public.user_roles role_row where role_row.user_id = profile.user_id), '{}'::text[]) as roles,
           coalesce((select array_agg(member.dealer_id order by member.created_at desc)
             from public.dealer_users member where member.user_id = profile.user_id), '{}'::uuid[]) as dealer_ids
    from public.user_profiles profile
    left join auth.users auth_user on auth_user.id = profile.user_id
  ),
  filtered as (
    select user_row.*
    from users_with_access user_row
    where (p_status is null or (p_status = 'active' and user_row.is_active) or (p_status = 'inactive' and not user_row.is_active))
      and (coalesce(p_query, '') = '' or
        user_row.email ilike '%' || p_query || '%' or
        user_row.full_name ilike '%' || p_query || '%' or
        exists (select 1 from unnest(user_row.roles) role_name where role_name ilike '%' || p_query || '%'))
  ),
  page_rows as (
    select * from filtered
    order by
      case when p_sort = 'oldest' then created_at end asc,
      case when p_sort = 'newest' then created_at end desc,
      user_id
    offset p_offset limit p_limit
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(page_rows)) from page_rows), '[]'::jsonb),
    'total', (select count(*) from filtered),
    'passwordResetCount', (select count(*) from filtered where must_change_password)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.admin_get_user(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select to_jsonb(user_row)
  from (
    select profile.user_id, auth_user.email, profile.full_name,
           profile.must_change_password, profile.is_active, profile.created_at,
           coalesce((select array_agg(role_row.role order by role_row.role)
             from public.user_roles role_row where role_row.user_id = profile.user_id), '{}'::text[]) as roles,
           coalesce((select array_agg(member.dealer_id order by member.created_at desc)
             from public.dealer_users member where member.user_id = profile.user_id), '{}'::uuid[]) as dealer_ids
    from public.user_profiles profile
    left join auth.users auth_user on auth_user.id = profile.user_id
    where p_user_id is not null and profile.user_id = p_user_id
  ) user_row;
$$;

create or replace function public.admin_list_dealers_page(
  p_query text,
  p_status text,
  p_sort text,
  p_offset integer,
  p_limit integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb;
begin
  if p_offset is null or p_offset < 0
    or p_limit is null or p_limit not between 1 and 100
    or p_sort is null or p_sort not in ('newest', 'oldest')
    or (p_status is not null and p_status not in ('active', 'inactive'))
    or char_length(coalesce(p_query, '')) > 120 then
    raise exception 'INVALID_PAGINATION_INPUT';
  end if;

  with filtered as (
    select dealer.*
    from public.dealers dealer
    where (p_status is null or (p_status = 'active' and dealer.is_active) or (p_status = 'inactive' and not dealer.is_active))
      and (coalesce(p_query, '') = '' or
        dealer.name ilike '%' || p_query || '%' or
        dealer.slug ilike '%' || p_query || '%' or
        dealer.contact_email ilike '%' || p_query || '%' or
        dealer.legal_name ilike '%' || p_query || '%')
  ),
  page_rows as (
    select * from filtered
    order by
      case when p_sort = 'oldest' then created_at end asc,
      case when p_sort = 'newest' then created_at end desc,
      id
    offset p_offset limit p_limit
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(page_rows)) from page_rows), '[]'::jsonb),
    'total', (select count(*) from filtered)
  ) into v_result;

  return v_result;
end;
$$;

create index if not exists idx_applications_submitted_created
  on public.applications(created_at desc) where submitted_at is not null;
create index if not exists idx_applications_submitted_status_created
  on public.applications(status, created_at desc) where submitted_at is not null;
create index if not exists idx_applications_dealer_submitted_status_created
  on public.applications(dealer_id, status, created_at desc) where submitted_at is not null;
create index if not exists idx_offers_dealer_application_created
  on public.offers(dealer_id, application_id, created_at desc) include (amount);
create index if not exists idx_offers_status_created on public.offers(status, created_at desc);
create index if not exists idx_activity_log_created on public.activity_log(created_at desc);
create index if not exists idx_dealers_created on public.dealers(created_at desc);
create index if not exists idx_user_profiles_created on public.user_profiles(created_at desc);

revoke all on function public.consume_login_rate_limits(text, text) from public, anon, authenticated;
revoke all on function public.get_user_access_context(uuid) from public, anon, authenticated;
revoke all on function public.get_dealer_dashboard_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.get_admin_dashboard_snapshot() from public, anon, authenticated;
revoke all on function public.get_dealer_application_page(uuid, text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_list_users_page(text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_get_user(uuid) from public, anon, authenticated;
revoke all on function public.admin_list_dealers_page(text, text, text, integer, integer) from public, anon, authenticated;

grant execute on function public.consume_login_rate_limits(text, text) to service_role;
grant execute on function public.get_user_access_context(uuid) to service_role;
grant execute on function public.get_dealer_dashboard_snapshot(uuid) to service_role;
grant execute on function public.get_admin_dashboard_snapshot() to service_role;
grant execute on function public.get_dealer_application_page(uuid, text, text, text, integer, integer) to service_role;
grant execute on function public.admin_list_users_page(text, text, text, integer, integer) to service_role;
grant execute on function public.admin_get_user(uuid) to service_role;
grant execute on function public.admin_list_dealers_page(text, text, text, integer, integer) to service_role;

commit;
