-- Public applications are only actionable once at least one verified vehicle photo exists.
create or replace function public.finalize_public_application(
  p_session_id uuid,
  p_photo_paths text[]
)
returns public.applications
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_session public.upload_sessions;
  v_application public.applications;
begin
  select * into v_session from public.upload_sessions where id = p_session_id for update;
  if not found or v_session.status <> 'pending' or v_session.expires_at <= now() then
    raise exception 'INVALID_UPLOAD_SESSION';
  end if;

  if coalesce(cardinality(p_photo_paths), 0) < 1
    or coalesce(cardinality(p_photo_paths), 0) > 10
    or exists (
      select 1 from unnest(coalesce(p_photo_paths, '{}'::text[])) path
      where not exists (
        select 1 from public.upload_items item
        where item.session_id = p_session_id and item.object_path = path
      )
    ) then
    raise exception 'INVALID_UPLOAD_ITEMS';
  end if;

  update public.applications
  set photo_paths = p_photo_paths, submitted_at = now(), status = 'pending'
  where id = v_session.application_id and submitted_at is null
  returning * into v_application;
  if not found then
    raise exception 'APPLICATION_ALREADY_FINALIZED';
  end if;

  update public.upload_sessions set status = 'completed', completed_at = now() where id = p_session_id;
  insert into public.activity_log(dealer_id, application_id, action, metadata)
  values (v_application.dealer_id, v_application.id, 'APPLICATION_CREATED', jsonb_build_object('reference_code', v_application.reference_code));
  return v_application;
end;
$$;
