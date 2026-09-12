begin;

-- Dealer access begins only after a public application is finalized. The admin
-- policy remains separate so retention and support operations can inspect rows.
drop policy if exists applications_dealer_read on public.applications;
create policy applications_dealer_read
on public.applications
for select to authenticated
using (
  public.current_user_has_dealer_access(dealer_id)
  and submitted_at is not null
  and purged_at is null
);

-- Hide legacy offers attached to drafts or data-purged applications as well.
drop policy if exists offers_dealer_read on public.offers;
create policy offers_dealer_read
on public.offers
for select to authenticated
using (
  public.current_user_has_dealer_access(dealer_id)
  and exists (
    select 1
    from public.applications application
    where application.id = offers.application_id
      and application.dealer_id = offers.dealer_id
      and application.submitted_at is not null
      and application.purged_at is null
  )
);

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
  if v_application.submitted_at is null or v_application.purged_at is not null then
    raise exception 'APPLICATION_NOT_SUBMITTED';
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
  select * into v_application from public.applications where id = v_offer.application_id for update;
  if not found or v_application.dealer_id <> v_offer.dealer_id then
    raise exception 'FORBIDDEN';
  end if;
  if v_application.submitted_at is null or v_application.purged_at is not null then
    raise exception 'APPLICATION_NOT_SUBMITTED';
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
  insert into public.activity_log(actor_user_id, dealer_id, application_id, offer_id, action, metadata)
  values (auth.uid(), v_offer.dealer_id, v_offer.application_id, v_offer.id, 'OFFER_' || upper(p_response), '{}'::jsonb);
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
  if v_application.submitted_at is null or v_application.purged_at is not null then
    raise exception 'APPLICATION_NOT_SUBMITTED';
  end if;
  if v_application.status <> 'accepted' or not exists (
    select 1 from public.offers where application_id = p_application_id and status = 'accepted'
  ) then
    raise exception 'OFFER_MUST_BE_ACCEPTED';
  end if;
  update public.applications set status = 'sold' where id = p_application_id returning * into v_application;
  insert into public.activity_log(actor_user_id, dealer_id, application_id, action, metadata)
  values (auth.uid(), v_application.dealer_id, v_application.id, 'APPLICATION_SOLD', '{}'::jsonb);
  return v_application;
end;
$$;

create or replace function public.get_dealer_dashboard_snapshot(p_dealer_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with visible_applications as (
    select id, brand, model, status
    from public.applications
    where p_dealer_id is not null
      and dealer_id = p_dealer_id
      and submitted_at is not null
      and purged_at is null
  ),
  application_counts as (
    select
      count(*)::integer as application_count,
      count(*) filter (where status = 'pending')::integer as pending_count,
      count(*) filter (where status = 'offered')::integer as offered_count,
      count(*) filter (where status = 'sold')::integer as sold_count
    from visible_applications
  ),
  visible_offers as (
    select offer_row.id, offer_row.application_id, offer_row.amount, offer_row.created_at,
           application.brand, application.model
    from public.offers offer_row
    join visible_applications application on application.id = offer_row.application_id
    where offer_row.dealer_id = p_dealer_id
  ),
  offer_count as (
    select count(*)::integer as value from visible_offers
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
      select * from visible_offers order by created_at desc limit 8
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

create or replace function public.get_dealer_application_page(
  p_dealer_id uuid, p_query text, p_status text, p_sort text, p_offset integer, p_limit integer
)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare v_result jsonb;
begin
  if p_dealer_id is null or p_offset is null or p_offset < 0
    or p_limit is null or p_limit not between 1 and 100
    or p_sort is null or p_sort not in ('newest', 'oldest', 'waiting')
    or (p_status is not null and p_status not in ('pending', 'offered', 'accepted', 'rejected', 'sold', 'archived'))
    or char_length(coalesce(p_query, '')) > 120 then raise exception 'INVALID_PAGINATION_INPUT'; end if;

  with base as (
    select * from public.applications
    where dealer_id = p_dealer_id and submitted_at is not null and purged_at is null
  ), filtered as (
    select a.id, a.reference_code, a.owner_name, a.owner_phone, a.brand, a.model,
      a.model_year, a.km, a.status, a.created_at, latest.amount as latest_offer,
      case when a.status = 'pending' then a.submitted_at
        when a.status = 'offered' then latest.created_at end as waiting_since
    from base a
    left join lateral (
      select o.amount, o.created_at from public.offers o
      where o.application_id = a.id and o.dealer_id = p_dealer_id
      order by o.created_at desc, o.id desc limit 1
    ) latest on true
    where (p_status is null or a.status = p_status)
      and (coalesce(p_query, '') = '' or
        a.reference_code ilike '%' || p_query || '%' or a.owner_name ilike '%' || p_query || '%' or
        a.owner_phone ilike '%' || p_query || '%' or a.owner_email ilike '%' || p_query || '%' or
        a.brand ilike '%' || p_query || '%' or a.model ilike '%' || p_query || '%')
  ), ordered as (
    select *, row_number() over (order by
      case when p_sort = 'waiting' then waiting_since end asc nulls last,
      case when p_sort = 'oldest' then created_at end asc,
      case when p_sort in ('newest', 'waiting') then created_at end desc, id) as position
    from filtered
  ), page_rows as (select * from ordered order by position offset p_offset limit p_limit),
  counts as (
    select jsonb_build_object(
      'pending', count(*) filter (where status = 'pending'), 'offered', count(*) filter (where status = 'offered'),
      'accepted', count(*) filter (where status = 'accepted'), 'rejected', count(*) filter (where status = 'rejected'),
      'sold', count(*) filter (where status = 'sold'), 'archived', count(*) filter (where status = 'archived')) as value from base
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(page_rows) - 'position' order by position) from page_rows), '[]'::jsonb),
    'total', (select count(*) from filtered), 'statusCounts', counts.value) into v_result from counts;
  return v_result;
end;
$$;

revoke all on function public.create_dealer_offer(uuid, numeric, text, text) from public, anon, authenticated;
revoke all on function public.respond_to_dealer_offer(uuid, text, text) from public, anon, authenticated;
revoke all on function public.mark_dealer_application_sold(uuid) from public, anon, authenticated;
grant execute on function public.create_dealer_offer(uuid, numeric, text, text) to authenticated;
grant execute on function public.respond_to_dealer_offer(uuid, text, text) to authenticated;
grant execute on function public.mark_dealer_application_sold(uuid) to authenticated;
revoke all on function public.get_dealer_dashboard_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.get_dealer_application_page(uuid, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_dealer_dashboard_snapshot(uuid) to service_role;
grant execute on function public.get_dealer_application_page(uuid, text, text, text, integer, integer) to service_role;

commit;
