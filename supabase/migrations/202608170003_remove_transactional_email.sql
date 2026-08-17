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
  insert into public.activity_log(dealer_id, application_id, action, metadata)
  values (v_application.dealer_id, v_application.id, 'APPLICATION_CREATED', jsonb_build_object('reference_code', v_application.reference_code));
  return v_application;
end;
$$;

update public.app_settings
set value = value - 'notifications_enabled', updated_at = now()
where key = 'public_form';

drop function if exists public.claim_notification_outbox(integer);
drop table if exists public.notification_outbox;
alter table public.applications drop column if exists marketing_consent;
