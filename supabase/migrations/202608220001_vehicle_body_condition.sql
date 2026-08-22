-- Structured body-panel inspection data for public applications.
create or replace function public.is_valid_vehicle_body_condition(value jsonb)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select jsonb_typeof(value) = 'object'
    and not exists (
      select 1
      from jsonb_each_text(value) as item(part_id, condition)
      where item.part_id not in (
        'front_bumper', 'hood', 'left_front_fender', 'right_front_fender',
        'left_front_door', 'right_front_door', 'left_rear_door', 'right_rear_door',
        'left_rear_fender', 'right_rear_fender', 'roof', 'trunk', 'rear_bumper'
      )
      or item.condition not in ('local_paint', 'painted', 'replaced')
    );
$$;

revoke all on function public.is_valid_vehicle_body_condition(jsonb) from public;

alter table public.applications
  add column if not exists body_condition jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'applications_body_condition_valid'
      and conrelid = 'public.applications'::regclass
  ) then
    alter table public.applications
      add constraint applications_body_condition_valid
      check (public.is_valid_vehicle_body_condition(body_condition)) not valid;
  end if;
end;
$$;

alter table public.applications validate constraint applications_body_condition_valid;
