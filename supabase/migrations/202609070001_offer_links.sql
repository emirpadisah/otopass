begin;
create table public.offer_links (
 offer_id uuid primary key references public.offers(id) on delete cascade,
 token_hash text unique not null check (token_hash ~ '^[a-f0-9]{64}$'),
 message text not null default '' check (char_length(message) <= 2000),
 expires_at timestamptz not null,
 response text check (response in ('interested', 'contact')),
 responded_at timestamptz
);
alter table public.offer_links enable row level security;
revoke all on public.offer_links from public, anon, authenticated;
grant all on public.offer_links to service_role;
create function public.respond_public_offer(p_hash text, p_response text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare l public.offer_links; o public.offers; a public.applications;
begin
 if p_response not in ('interested', 'contact') or p_response is null then return false; end if;
 select * into l from public.offer_links where token_hash = p_hash;
 if not found then return false; end if;
 select * into o from public.offers where id = l.offer_id;
 select * into a from public.applications where id = o.application_id for update;
 select * into o from public.offers where id = l.offer_id;
 select * into l from public.offer_links where token_hash = p_hash for update;
 if not found or l.expires_at <= now() or a.purged_at is not null or a.submitted_at is null
   or a.status <> 'offered' or o.status <> 'pending'
   or not exists(select 1 from public.dealers where id = a.dealer_id and is_active)
   or exists(select 1 from public.offers where application_id = a.id and (created_at, id) > (o.created_at, o.id))
 then return false; end if;
 if l.response is not null then return true; end if;
 update public.offer_links set response = p_response, responded_at = now() where offer_id = o.id;
 insert into public.application_followups(application_id, note, created_by)
 values(a.id, case when p_response = 'interested' then 'Müşteri teklif bağlantısından: İlgileniyorum.' else 'Müşteri teklif bağlantısından: Görüşmek istiyorum.' end, null);
 update public.applications set updated_at = now() where id = a.id;
 return true;
end;
$$;
revoke all on function public.respond_public_offer(text,text) from public, anon, authenticated;
grant execute on function public.respond_public_offer(text,text) to service_role;
commit;
