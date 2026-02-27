-- Core schema for Otopass
create extension if not exists pgcrypto;

create table if not exists public.dealers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  contact_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  dealer_slug text not null,
  owner_name text,
  owner_phone text,
  brand text not null,
  model text not null,
  vehicle_package text,
  model_year integer,
  km integer,
  fuel_type text,
  transmission text,
  tramer_info text,
  damage_info text,
  photo_paths text[] not null default '{}',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.applications add column if not exists vehicle_package text;

create table if not exists public.dealer_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  role text not null default 'manager',
  created_at timestamptz not null default now(),
  unique (user_id, dealer_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin', 'admin', 'dealer_owner', 'dealer_manager', 'dealer_viewer')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  dealer_id uuid not null references public.dealers(id) on delete cascade,
  amount numeric(14,2) not null,
  currency text not null default 'TRY',
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id bigserial primary key,
  actor_user_id uuid references auth.users(id),
  dealer_id uuid references public.dealers(id) on delete set null,
  application_id uuid references public.applications(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.form_rate_limits (
  id bigserial primary key,
  ip_hash text not null,
  dealer_slug text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_form_rate_limits_ip_dealer_created
  on public.form_rate_limits(ip_hash, dealer_slug, created_at desc);

-- Helpers
create or replace function public.current_user_has_role(_role text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid() and role = _role
  );
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
as $$
  select public.current_user_has_role('admin') or public.current_user_has_role('super_admin');
$$;

create or replace function public.current_user_has_dealer_access(_dealer_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.dealer_users
    where user_id = auth.uid() and dealer_id = _dealer_id
  );
$$;

-- RLS
alter table public.dealers enable row level security;
alter table public.applications enable row level security;
alter table public.dealer_users enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_profiles enable row level security;
alter table public.offers enable row level security;
alter table public.activity_log enable row level security;
alter table public.form_rate_limits enable row level security;

-- Dealers
drop policy if exists dealers_admin_all on public.dealers;
create policy dealers_admin_all
on public.dealers
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists dealers_dealer_read on public.dealers;
create policy dealers_dealer_read
on public.dealers
for select
using (
  public.current_user_has_dealer_access(id)
);

-- Dealer users
drop policy if exists dealer_users_admin_all on public.dealer_users;
create policy dealer_users_admin_all
on public.dealer_users
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists dealer_users_self_read on public.dealer_users;
create policy dealer_users_self_read
on public.dealer_users
for select
using (user_id = auth.uid());

-- User roles
drop policy if exists user_roles_admin_all on public.user_roles;
create policy user_roles_admin_all
on public.user_roles
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read
on public.user_roles
for select
using (user_id = auth.uid());

-- User profiles
drop policy if exists user_profiles_admin_all on public.user_profiles;
create policy user_profiles_admin_all
on public.user_profiles
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists user_profiles_self_read on public.user_profiles;
create policy user_profiles_self_read
on public.user_profiles
for select
using (user_id = auth.uid());

drop policy if exists user_profiles_self_update on public.user_profiles;
create policy user_profiles_self_update
on public.user_profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Applications
drop policy if exists applications_admin_all on public.applications;
create policy applications_admin_all
on public.applications
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists applications_dealer_read on public.applications;
create policy applications_dealer_read
on public.applications
for select
using (public.current_user_has_dealer_access(dealer_id));

drop policy if exists applications_dealer_update on public.applications;
create policy applications_dealer_update
on public.applications
for update
using (public.current_user_has_dealer_access(dealer_id))
with check (public.current_user_has_dealer_access(dealer_id));

-- Offers
drop policy if exists offers_admin_all on public.offers;
create policy offers_admin_all
on public.offers
for all
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

drop policy if exists offers_dealer_read on public.offers;
create policy offers_dealer_read
on public.offers
for select
using (public.current_user_has_dealer_access(dealer_id));

drop policy if exists offers_dealer_insert on public.offers;
create policy offers_dealer_insert
on public.offers
for insert
with check (public.current_user_has_dealer_access(dealer_id));

-- Activity log
drop policy if exists activity_log_admin_read on public.activity_log;
create policy activity_log_admin_read
on public.activity_log
for select
using (public.current_user_is_admin());

drop policy if exists activity_log_admin_insert on public.activity_log;
create policy activity_log_admin_insert
on public.activity_log
for insert
with check (public.current_user_is_admin());

-- Rate limit table only for service role usage; deny direct anon/auth reads by default.
drop policy if exists form_rate_limits_admin_read on public.form_rate_limits;
create policy form_rate_limits_admin_read
on public.form_rate_limits
for select
using (public.current_user_is_admin());
