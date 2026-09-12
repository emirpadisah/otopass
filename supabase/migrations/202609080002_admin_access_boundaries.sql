begin;
create or replace function public.admin_update_user_access(
  p_user_id uuid, p_full_name text, p_role text, p_dealer_id uuid, p_is_active boolean
)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  v_actor_is_super boolean;
  v_target_is_super boolean;
  v_target_is_privileged boolean;
  v_old_roles jsonb;
begin
  -- Serialize peer changes and the last-super-admin check within this RPC.
  perform pg_advisory_xact_lock(hashtext('admin_update_user_access'));
  if not public.current_user_is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_user_id is null or p_is_active is null then raise exception 'INVALID_USER'; end if;
  if p_full_name is not null and char_length(trim(p_full_name)) > 120 then raise exception 'INVALID_FULL_NAME'; end if;
  if p_role is null or p_role not in ('super_admin', 'admin', 'dealer_owner', 'dealer_manager', 'dealer_viewer') then raise exception 'INVALID_ROLE'; end if;
  perform 1 from public.user_profiles where user_id = p_user_id for update;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  perform 1 from public.user_roles where user_id = p_user_id for update;

  v_actor_is_super := public.current_user_has_role('super_admin');
  select coalesce(bool_or(role = 'super_admin'), false),
    coalesce(bool_or(role in ('admin', 'super_admin')), false),
    coalesce(jsonb_agg(role order by role), '[]'::jsonb)
  into v_target_is_super, v_target_is_privileged, v_old_roles
  from public.user_roles where user_id = p_user_id;

  if not v_actor_is_super and (p_role in ('admin', 'super_admin') or v_target_is_privileged) then
    raise exception 'SUPER_ADMIN_REQUIRED';
  end if;
  if p_user_id = auth.uid() and not p_is_active then raise exception 'CANNOT_DEACTIVATE_SELF'; end if;
  if v_target_is_super and (p_role <> 'super_admin' or not p_is_active)
    and (select count(*) from public.user_roles ur join public.user_profiles up on up.user_id = ur.user_id
         where ur.role = 'super_admin' and up.is_active = true) <= 1 then
    raise exception 'LAST_SUPER_ADMIN';
  end if;
  if p_role like 'dealer_%' and p_dealer_id is null then raise exception 'DEALER_REQUIRED'; end if;
  if p_role like 'dealer_%' and not exists (
    select 1 from public.dealers where id = p_dealer_id and is_active = true
  ) then raise exception 'ACTIVE_DEALER_REQUIRED'; end if;

  update public.user_profiles set full_name = nullif(trim(p_full_name), ''),
    is_active = p_is_active, deactivated_at = case when p_is_active then null else now() end
  where user_id = p_user_id;
  delete from public.user_roles where user_id = p_user_id;
  insert into public.user_roles(user_id, role) values (p_user_id, p_role);
  delete from public.dealer_users where user_id = p_user_id;
  if p_role like 'dealer_%' then
    insert into public.dealer_users(user_id, dealer_id, role)
    values (p_user_id, p_dealer_id, replace(p_role, 'dealer_', ''));
  end if;
  insert into public.activity_log(actor_user_id, dealer_id, action, metadata)
  values (auth.uid(), case when p_role like 'dealer_%' then p_dealer_id else null end,
    'ADMIN_USER_UPDATED', jsonb_build_object('target_user_id', p_user_id,
    'previous_roles', v_old_roles, 'role', p_role, 'is_active', p_is_active));
end;
$$;
revoke all on function public.admin_update_user_access(uuid, text, text, uuid, boolean) from public, anon;
grant execute on function public.admin_update_user_access(uuid, text, text, uuid, boolean) to authenticated;
commit;
