-- ============================================================================
-- Deploy bootstrap: grant platform super_admin to the configured owner account.
-- No migration/seed otherwise creates a super_admin, which would leave the
-- platform unadministerable (is_super_admin() never true, OrgConsole unreachable).
--
-- SECURITY: the helper is SECURITY DEFINER and GRANTS super_admin, so it must
-- NEVER be callable by anon/authenticated (that would be privilege escalation).
-- Execute is revoked from everyone; only the DB owner / service_role can call it
-- (the migration below, or a post-signup `select public.ensure_platform_super_admin('…')`).
-- ============================================================================
create or replace function public.ensure_platform_super_admin(p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_platform uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(p_email) limit 1;
  if v_uid is null then
    return false; -- account doesn't exist yet; grant later once it signs up
  end if;
  select id into v_platform from public.organizations where type = 'platform' limit 1;
  if v_platform is null then
    return false;
  end if;
  insert into public.org_memberships (org_id, user_id, role, status)
    values (v_platform, v_uid, 'super_admin', 'active')
    on conflict (org_id, user_id) do update set role = 'super_admin', status = 'active';
  return true;
end;
$$;

revoke all on function public.ensure_platform_super_admin(text) from public;
revoke all on function public.ensure_platform_super_admin(text) from anon;
revoke all on function public.ensure_platform_super_admin(text) from authenticated;

-- Bootstrap the configured owner as platform super_admin (no-op if not signed up yet).
select public.ensure_platform_super_admin('missagia@missagia.org');
