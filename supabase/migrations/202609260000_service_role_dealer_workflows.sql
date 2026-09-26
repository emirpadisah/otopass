-- The server verifies the caller's JWT, then passes that user ID to these
-- service-role-only RPCs. Each RPC independently checks active dealer ownership.
begin;

create function public.dealer_actor_can_manage(p_actor_user_id uuid, p_dealer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p_actor_user_id is not null and exists (
    select 1
    from public.user_profiles profile
    join public.dealer_users membership on membership.user_id = profile.user_id
    join public.dealers dealer on dealer.id = membership.dealer_id
    where profile.user_id = p_actor_user_id
      and profile.is_active = true
      and membership.dealer_id = p_dealer_id
      and membership.role in ('owner', 'manager')
      and dealer.is_active = true
  );
$$;

create function public.create_dealer_offer_for_actor(
  p_application_id uuid,
  p_amount numeric,
  p_currency text,
  p_notes text,
  p_actor_user_id uuid
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
  if not found or not public.dealer_actor_can_manage(p_actor_user_id, v_application.dealer_id) then
    raise exception 'FORBIDDEN';
  end if;
  if v_application.status not in ('pending', 'rejected') then
    raise exception 'INVALID_APPLICATION_STATE';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 1000000000 then
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
  values (p_actor_user_id, v_application.dealer_id, v_application.id, v_offer.id, 'OFFER_CREATED', jsonb_build_object('amount', p_amount, 'currency', upper(p_currency)));
  return v_offer;
end;
$$;

create function public.respond_to_dealer_offer_for_actor(
  p_offer_id uuid,
  p_response text,
  p_note text,
  p_actor_user_id uuid
)
returns public.offers
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_offer public.offers;
begin
  if p_response is null or p_response not in ('accepted', 'rejected') then
    raise exception 'INVALID_RESPONSE';
  end if;
  select * into v_offer from public.offers where id = p_offer_id for update;
  if not found or not public.dealer_actor_can_manage(p_actor_user_id, v_offer.dealer_id) then
    raise exception 'FORBIDDEN';
  end if;
  if v_offer.status <> 'pending' then
    raise exception 'INVALID_OFFER_STATE';
  end if;

  update public.offers
  set status = p_response,
      notes = case when nullif(trim(p_note), '') is null then notes else concat_ws(E'\n', notes, trim(p_note)) end,
      responded_at = now(),
      responded_by = p_actor_user_id
  where id = p_offer_id
  returning * into v_offer;

  update public.applications set status = p_response where id = v_offer.application_id;
  insert into public.activity_log(actor_user_id, dealer_id, application_id, offer_id, action, metadata)
  values (p_actor_user_id, v_offer.dealer_id, v_offer.application_id, v_offer.id, 'OFFER_' || upper(p_response), '{}'::jsonb);
  return v_offer;
end;
$$;

create function public.mark_dealer_application_sold_for_actor(
  p_application_id uuid,
  p_actor_user_id uuid
)
returns public.applications
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_application public.applications;
begin
  select * into v_application from public.applications where id = p_application_id for update;
  if not found or not public.dealer_actor_can_manage(p_actor_user_id, v_application.dealer_id) then
    raise exception 'FORBIDDEN';
  end if;
  if v_application.status <> 'accepted' or not exists (
    select 1 from public.offers where application_id = p_application_id and status = 'accepted'
  ) then
    raise exception 'OFFER_MUST_BE_ACCEPTED';
  end if;

  update public.applications set status = 'sold' where id = p_application_id returning * into v_application;
  insert into public.activity_log(actor_user_id, dealer_id, application_id, action, metadata)
  values (p_actor_user_id, v_application.dealer_id, v_application.id, 'APPLICATION_SOLD', '{}'::jsonb);
  return v_application;
end;
$$;

revoke all on function public.dealer_actor_can_manage(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_dealer_offer_for_actor(uuid, numeric, text, text, uuid) from public, anon, authenticated;
revoke all on function public.respond_to_dealer_offer_for_actor(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.mark_dealer_application_sold_for_actor(uuid, uuid) from public, anon, authenticated;
grant execute on function public.dealer_actor_can_manage(uuid, uuid) to service_role;
grant execute on function public.create_dealer_offer_for_actor(uuid, numeric, text, text, uuid) to service_role;
grant execute on function public.respond_to_dealer_offer_for_actor(uuid, text, text, uuid) to service_role;
grant execute on function public.mark_dealer_application_sold_for_actor(uuid, uuid) to service_role;

commit;
