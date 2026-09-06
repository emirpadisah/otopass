begin;

create table public.application_followups (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  note text not null check (char_length(btrim(note)) between 1 and 2000),
  reminder_at timestamptz check (reminder_at is null or isfinite(reminder_at)),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (completed_at is null or reminder_at is not null)
);
create index idx_application_followups_application on public.application_followups(application_id, created_at desc);
create index idx_application_followups_due on public.application_followups(reminder_at, application_id)
  where reminder_at is not null and completed_at is null;

alter table public.application_followups enable row level security;
revoke all on public.application_followups from public, anon, authenticated;
grant select on public.application_followups to authenticated;
grant all on public.application_followups to service_role;
create policy application_followups_dealer_read on public.application_followups for select to authenticated
using (exists (
  select 1 from public.applications a
  where a.id = application_id and a.submitted_at is not null and a.purged_at is null
    and public.current_user_has_dealer_access(a.dealer_id)
));

create function public.add_application_followup(p_application_id uuid, p_note text, p_reminder_at timestamptz)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_application public.applications;
  v_id uuid;
begin
  select * into v_application from public.applications where id = p_application_id for update;
  if not found or v_application.submitted_at is null or v_application.purged_at is not null or not public.current_user_can_manage_dealer(v_application.dealer_id) then
    raise exception 'FORBIDDEN';
  end if;
  if p_note is null or char_length(btrim(p_note)) not between 1 and 2000 then
    raise exception 'INVALID_NOTE';
  end if;
  if p_reminder_at is not null and (not isfinite(p_reminder_at) or p_reminder_at <= now()) then
    raise exception 'INVALID_REMINDER';
  end if;
  if p_reminder_at is not null and v_application.status in ('sold', 'archived') then
    raise exception 'APPLICATION_CLOSED';
  end if;
  insert into public.application_followups(application_id, note, reminder_at, created_by)
    values (p_application_id, btrim(p_note), p_reminder_at, auth.uid()) returning id into v_id;
  update public.applications set updated_at = now() where id = p_application_id;
  insert into public.activity_log(actor_user_id, dealer_id, application_id, action, metadata)
    values (auth.uid(), v_application.dealer_id, p_application_id, 'APPLICATION_FOLLOWUP_ADDED',
      jsonb_build_object('followup_id', v_id, 'reminder_at', p_reminder_at));
  return v_id;
end;
$$;

create function public.complete_application_followup(p_followup_id uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_application public.applications;
  v_followup public.application_followups;
begin
  select a.* into v_application from public.applications a
    join public.application_followups f on f.application_id = a.id where f.id = p_followup_id for update of a;
  if not found or v_application.submitted_at is null or v_application.purged_at is not null or not public.current_user_can_manage_dealer(v_application.dealer_id) then
    raise exception 'FORBIDDEN';
  end if;
  select * into v_followup from public.application_followups where id = p_followup_id for update;
  if v_followup.reminder_at is null then raise exception 'INVALID_REMINDER'; end if;
  if v_followup.completed_at is null then
    update public.application_followups set completed_at = now() where id = p_followup_id;
    update public.applications set updated_at = now() where id = v_application.id;
    insert into public.activity_log(actor_user_id, dealer_id, application_id, action, metadata)
      values (auth.uid(), v_application.dealer_id, v_application.id, 'APPLICATION_FOLLOWUP_COMPLETED',
        jsonb_build_object('followup_id', p_followup_id));
  end if;
  return v_application.id;
end;
$$;

create function public.get_dealer_due_followups(p_dealer_id uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  if p_dealer_id is null or not public.current_user_has_dealer_access(p_dealer_id) then raise exception 'FORBIDDEN'; end if;
  return (
    with due as (
      select f.*, a.brand, a.model, a.owner_name
      from public.application_followups f join public.applications a on a.id = f.application_id
      where a.dealer_id = p_dealer_id and a.submitted_at is not null and a.purged_at is null and a.status not in ('sold', 'archived')
        and f.reminder_at <= now() and f.completed_at is null
    ), page_rows as (select * from due order by reminder_at, id limit 20)
    select jsonb_build_object('total', (select count(*) from due),
      'items', coalesce((select jsonb_agg(to_jsonb(page_rows) order by reminder_at, id) from page_rows), '[]'::jsonb))
  );
end;
$$;

revoke all on function public.add_application_followup(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.complete_application_followup(uuid) from public, anon, authenticated;
revoke all on function public.get_dealer_due_followups(uuid) from public, anon, authenticated;
grant execute on function public.add_application_followup(uuid, text, timestamptz) to authenticated;
grant execute on function public.complete_application_followup(uuid) to authenticated;
grant execute on function public.get_dealer_due_followups(uuid) to authenticated;

-- Free-text notes follow the application's existing personal-data retention lifecycle.
create function public.purge_application_followups()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if new.purged_at is not null then
    delete from public.application_followups where application_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.purge_application_followups() from public, anon, authenticated;
create trigger applications_purge_followups after update of purged_at on public.applications
  for each row execute function public.purge_application_followups();

-- Sort the full filtered set by the current waiting stage before pagination.
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
    select * from public.applications where dealer_id = p_dealer_id and submitted_at is not null
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

revoke all on function public.get_dealer_application_page(uuid, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_dealer_application_page(uuid, text, text, text, integer, integer) to service_role;
commit;
