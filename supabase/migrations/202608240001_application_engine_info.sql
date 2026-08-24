-- Optional engine specification displayed in application details and offer visuals.
alter table public.applications
  add column if not exists engine_info text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'applications_engine_info_length'
      and conrelid = 'public.applications'::regclass
  ) then
    alter table public.applications
      add constraint applications_engine_info_length
      check (engine_info is null or char_length(engine_info) <= 120) not valid;
  end if;
end;
$$;

alter table public.applications validate constraint applications_engine_info_length;
