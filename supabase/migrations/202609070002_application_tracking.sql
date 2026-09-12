-- Opaque customer credentials are stored as hashes; existing application RLS
-- remains in force. Public reads go through the server's explicit field allowlist.
alter table public.applications
  add column tracking_token_hash text,
  add column review_started_at timestamptz,
  add constraint applications_tracking_token_hash_format
    check (tracking_token_hash is null or tracking_token_hash ~ '^[a-f0-9]{64}$');

create unique index applications_tracking_token_hash_idx
  on public.applications (tracking_token_hash) where tracking_token_hash is not null;
