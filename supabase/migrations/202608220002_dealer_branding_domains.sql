-- Dealer-owned branding assets and verified custom-domain routing.
create table if not exists public.dealer_domains (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  hostname text not null,
  status text not null default 'pending',
  verification jsonb not null default '[]'::jsonb,
  dns_records jsonb not null default '[]'::jsonb,
  last_error text,
  verified_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dealer_domains_one_per_dealer unique (dealer_id),
  constraint dealer_domains_hostname_unique unique (hostname),
  constraint dealer_domains_hostname_lowercase check (hostname = lower(hostname)),
  constraint dealer_domains_hostname_format check (
    length(hostname) between 4 and 253
    and hostname ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$'
  ),
  constraint dealer_domains_status_check check (status in ('pending', 'misconfigured', 'verified', 'error')),
  constraint dealer_domains_verification_array check (jsonb_typeof(verification) = 'array'),
  constraint dealer_domains_dns_records_array check (jsonb_typeof(dns_records) = 'array')
);

create index if not exists idx_dealer_domains_status_hostname
  on public.dealer_domains(status, hostname);

drop trigger if exists dealer_domains_set_updated_at on public.dealer_domains;
create trigger dealer_domains_set_updated_at before update on public.dealer_domains
for each row execute function public.set_updated_at();

alter table public.dealer_domains enable row level security;

drop policy if exists dealer_domains_admin_all on public.dealer_domains;
create policy dealer_domains_admin_all on public.dealer_domains for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists dealer_domains_member_read on public.dealer_domains;
create policy dealer_domains_member_read on public.dealer_domains for select
using (
  public.current_user_has_dealer_access(dealer_id)
  and public.current_user_is_active()
  and exists (
    select 1 from public.dealers
    where dealers.id = dealer_domains.dealer_id and dealers.is_active = true
  )
);

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
  where dealer_domains.hostname = lower(trim(trailing '.' from p_hostname))
    and dealer_domains.status = 'verified'
    and dealers.is_active = true
  limit 1;
$$;

revoke all on function public.resolve_dealer_domain(text) from public;
grant execute on function public.resolve_dealer_domain(text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dealer-assets', 'dealer-assets', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
