-- Apply after the reference-only release is live. No active code should call
-- the old key RPCs at this point.
begin;

drop function if exists public.rotate_application_tracking_key(uuid, uuid, uuid, text);
drop function if exists public.verify_application_tracking_key(text, text);
drop function if exists public.finalize_public_application_with_tracking_key(uuid, text[], text);
drop table if exists public.application_tracking_keys;

commit;
