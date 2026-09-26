-- Apply before deploying the reference-only application flow. The old
-- finalization RPC stays available so the current release keeps working.
begin;

revoke all on function public.finalize_public_application(uuid, text[]) from public, anon, authenticated;
grant execute on function public.finalize_public_application(uuid, text[]) to service_role;

commit;
