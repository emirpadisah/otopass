-- Public dealer contact profile and flexible social links.
alter table public.dealers add column if not exists contact_name text;
alter table public.dealers add column if not exists contact_phone text;
alter table public.dealers add column if not exists social_links jsonb not null default '[]'::jsonb;

alter table public.dealers alter column social_links set default '[]'::jsonb;
update public.dealers set social_links = '[]'::jsonb where social_links is null;
alter table public.dealers alter column social_links set not null;

-- Preserve links if the legacy profile columns were applied before this migration.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'dealers' and column_name = 'instagram_url'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'dealers' and column_name = 'tiktok_url'
  ) then
    execute $migration$
      update public.dealers
      set social_links =
        case when instagram_url is not null and btrim(instagram_url) <> ''
          then jsonb_build_array(jsonb_build_object('platform', 'instagram', 'url', instagram_url))
          else '[]'::jsonb
        end ||
        case when tiktok_url is not null and btrim(tiktok_url) <> ''
          then jsonb_build_array(jsonb_build_object('platform', 'tiktok', 'url', tiktok_url))
          else '[]'::jsonb
        end
      where social_links = '[]'::jsonb
        and (nullif(btrim(instagram_url), '') is not null or nullif(btrim(tiktok_url), '') is not null)
    $migration$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dealers_social_links_valid'
      and conrelid = 'public.dealers'::regclass
  ) then
    alter table public.dealers
      add constraint dealers_social_links_valid
      check (jsonb_typeof(social_links) = 'array' and jsonb_array_length(social_links) <= 12);
  end if;
end $$;
