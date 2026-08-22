create or replace function public.delete_application_for_current_user(p_application_id uuid)
returns text[]
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_application public.applications;
  v_photo_paths text[];
begin
  select * into v_application
  from public.applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'APPLICATION_NOT_FOUND';
  end if;
  if not (
    public.current_user_is_admin()
    or public.current_user_can_manage_dealer(v_application.dealer_id)
  ) then
    raise exception 'FORBIDDEN';
  end if;

  v_photo_paths := coalesce(v_application.photo_paths, '{}'::text[]);
  insert into public.activity_log(actor_user_id, dealer_id, application_id, action, metadata)
  values (
    auth.uid(),
    v_application.dealer_id,
    v_application.id,
    'APPLICATION_DELETED',
    jsonb_build_object(
      'application_id', v_application.id,
      'reference_code', v_application.reference_code,
      'vehicle', concat_ws(' ', v_application.brand, v_application.model),
      'previous_status', v_application.status,
      'photo_count', cardinality(v_photo_paths)
    )
  );

  delete from public.applications where id = v_application.id;
  return v_photo_paths;
end;
$$;

revoke all on function public.delete_application_for_current_user(uuid) from public;
grant execute on function public.delete_application_for_current_user(uuid) to authenticated;
