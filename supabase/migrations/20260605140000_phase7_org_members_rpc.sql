-- ============================================================================
-- Consoles: list members of an org with their email/name (auth.users is not
-- exposed via PostgREST, so a SECURITY DEFINER RPC bridges it). Authorization:
-- only someone who can access/administer the org gets rows.
-- ============================================================================
create or replace function public.list_org_members(p_org uuid)
returns table (user_id uuid, email text, name text, role text, status text)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id,
         u.email::text,
         coalesce(u.raw_user_meta_data->>'full_name', u.email)::text as name,
         m.role,
         m.status
    from public.org_memberships m
    join auth.users u on u.id = m.user_id
   where m.org_id = p_org
     and (public.is_org_admin(p_org) or public.has_company_access(p_org))
   order by m.created_at;
$$;

grant execute on function public.list_org_members(uuid) to authenticated;
