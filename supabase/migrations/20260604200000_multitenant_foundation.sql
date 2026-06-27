-- ============================================================================
-- Multi-tenant foundation (Phase 1)
-- Hierarchy: platform -> agency -> company. Day-to-day work happens at the
-- company level. Adds organizations + org_memberships, an org_id on every
-- domain table, SECURITY DEFINER access helpers, and org/role-based RLS that
-- replaces the old per-user (auth.uid() = user_id) policies.
--
-- NOTE: after this migration, writes require org_id (NOT NULL). Apply to the
-- remote/live DB only together with the Phase 2 app changes (org context).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) CORE TENANCY TABLES
-- ----------------------------------------------------------------------------
create table if not exists public.organizations (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('platform','agency','company')),
  name          text not null,
  parent_org_id uuid references public.organizations(id) on delete cascade,
  status        text not null default 'active' check (status in ('active','suspended','archived')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_organizations_parent on public.organizations(parent_org_id);
create index if not exists idx_organizations_type   on public.organizations(type);

create table if not exists public.org_memberships (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('super_admin','agency_admin','admin','sdr','closer')),
  status     text not null default 'active' check (status in ('active','invited','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists idx_org_memberships_user on public.org_memberships(user_id);
create index if not exists idx_org_memberships_org  on public.org_memberships(org_id);

drop trigger if exists update_organizations_updated_at on public.organizations;
create trigger update_organizations_updated_at
  before update on public.organizations
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_org_memberships_updated_at on public.org_memberships;
create trigger update_org_memberships_updated_at
  before update on public.org_memberships
  for each row execute function public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 2) ACCESS HELPERS (SECURITY DEFINER -> bypass RLS, avoid policy recursion)
-- ----------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
      from public.org_memberships m
      join public.organizations o on o.id = m.org_id
     where m.user_id = auth.uid()
       and m.status = 'active'
       and o.type = 'platform'
       and m.role = 'super_admin'
  );
$$;

create or replace function public.user_company_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  -- super admins can access every company
  select o.id from public.organizations o
   where o.type = 'company' and public.is_super_admin()
  union
  -- direct company memberships
  select m.org_id
    from public.org_memberships m
    join public.organizations o on o.id = m.org_id
   where m.user_id = auth.uid() and m.status = 'active' and o.type = 'company'
  union
  -- companies under an agency the caller belongs to
  select c.id
    from public.organizations c
    join public.org_memberships m on m.org_id = c.parent_org_id
                                  and m.user_id = auth.uid()
                                  and m.status = 'active'
    join public.organizations a on a.id = m.org_id and a.type = 'agency'
   where c.type = 'company';
$$;

create or replace function public.has_company_access(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select target is not null and target in (select public.user_company_ids());
$$;

create or replace function public.is_org_admin(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin()
      or exists (
        select 1 from public.org_memberships m
         where m.user_id = auth.uid()
           and m.status = 'active'
           and m.role in ('agency_admin','admin')
           and ( m.org_id = target
                 or target in (select id from public.organizations where parent_org_id = m.org_id) )
      );
$$;

-- ----------------------------------------------------------------------------
-- 3) ADD org_id TO DOMAIN TABLES (nullable; backfilled below)
-- ----------------------------------------------------------------------------
alter table public.strategies           add column if not exists org_id uuid;
alter table public.connections          add column if not exists org_id uuid;
alter table public.lead_sources         add column if not exists org_id uuid;
alter table public.manual_leads         add column if not exists org_id uuid;
alter table public.connected_products   add column if not exists org_id uuid;
alter table public.product_enrollments  add column if not exists org_id uuid;
alter table public.sales_users          add column if not exists org_id uuid;
alter table public.lead_assignments     add column if not exists org_id uuid;
alter table public.sales_activities     add column if not exists org_id uuid;
alter table public.deals                add column if not exists org_id uuid;
alter table public.commission_records   add column if not exists org_id uuid;
alter table public.campaigns            add column if not exists org_id uuid;
alter table public.payment_links        add column if not exists org_id uuid;
alter table public.lead_stage_overrides add column if not exists org_id uuid;

-- ----------------------------------------------------------------------------
-- 4) BACKFILL: 1 platform, 1 default agency, 1 company per existing owner
--    (existing data was siloed by user_id/producer_id => preserve isolation)
-- ----------------------------------------------------------------------------
do $$
declare
  v_platform uuid := '00000000-0000-0000-0000-0000000000a1';
  v_agency   uuid := '00000000-0000-0000-0000-0000000000a2';
  v_default  uuid := '00000000-0000-0000-0000-0000000000a3';
  v_owner    uuid;
  v_company  uuid;
begin
  insert into public.organizations(id, type, name, parent_org_id)
    values (v_platform,'platform','HighFlow Platform', null) on conflict (id) do nothing;
  insert into public.organizations(id, type, name, parent_org_id)
    values (v_agency,'agency','Agência Padrão', v_platform) on conflict (id) do nothing;
  insert into public.organizations(id, type, name, parent_org_id)
    values (v_default,'company','Empresa Padrão', v_agency) on conflict (id) do nothing;

  for v_owner in
    select distinct uid from (
      select user_id    as uid from public.strategies          where user_id is not null
      union select user_id from public.connections             where user_id is not null
      union select user_id from public.lead_sources            where user_id is not null
      union select user_id from public.manual_leads
      union select user_id from public.connected_products
      union select user_id from public.product_enrollments
      union select user_id from public.sales_users
      union select user_id from public.lead_assignments
      union select user_id from public.sales_activities
      union select user_id from public.deals
      union select user_id from public.commission_records
      union select producer_id from public.payment_links
      union select user_id from public.lead_stage_overrides    where user_id is not null
    ) s
  loop
    insert into public.organizations(type, name, parent_org_id)
      values ('company', 'Empresa ' || left(v_owner::text, 8), v_agency)
      returning id into v_company;

    -- create the owner's admin membership only if it is a real auth user
    if exists (select 1 from auth.users u where u.id = v_owner) then
      insert into public.org_memberships(org_id, user_id, role, status)
        values (v_company, v_owner, 'admin', 'active')
        on conflict (org_id, user_id) do nothing;
    end if;

    update public.strategies           set org_id = v_company where user_id    = v_owner and org_id is null;
    update public.connections          set org_id = v_company where user_id    = v_owner and org_id is null;
    update public.lead_sources         set org_id = v_company where user_id    = v_owner and org_id is null;
    update public.manual_leads         set org_id = v_company where user_id    = v_owner and org_id is null;
    update public.connected_products   set org_id = v_company where user_id    = v_owner and org_id is null;
    update public.product_enrollments  set org_id = v_company where user_id    = v_owner and org_id is null;
    update public.sales_users          set org_id = v_company where user_id    = v_owner and org_id is null;
    update public.lead_assignments     set org_id = v_company where user_id    = v_owner and org_id is null;
    update public.sales_activities     set org_id = v_company where user_id    = v_owner and org_id is null;
    update public.deals                set org_id = v_company where user_id    = v_owner and org_id is null;
    update public.commission_records   set org_id = v_company where user_id    = v_owner and org_id is null;
    update public.payment_links        set org_id = v_company where producer_id = v_owner and org_id is null;
    update public.lead_stage_overrides set org_id = v_company where user_id    = v_owner and org_id is null;
  end loop;

  -- campaigns inherit the org of their parent strategy
  update public.campaigns c
     set org_id = s.org_id
    from public.strategies s
   where s.id = c.strategy_id and c.org_id is null;

  -- sweep any leftover orphans (null owner) into the default company
  update public.strategies           set org_id = v_default where org_id is null;
  update public.connections          set org_id = v_default where org_id is null;
  update public.lead_sources         set org_id = v_default where org_id is null;
  update public.manual_leads         set org_id = v_default where org_id is null;
  update public.connected_products   set org_id = v_default where org_id is null;
  update public.product_enrollments  set org_id = v_default where org_id is null;
  update public.sales_users          set org_id = v_default where org_id is null;
  update public.lead_assignments     set org_id = v_default where org_id is null;
  update public.sales_activities     set org_id = v_default where org_id is null;
  update public.deals                set org_id = v_default where org_id is null;
  update public.commission_records   set org_id = v_default where org_id is null;
  update public.campaigns            set org_id = v_default where org_id is null;
  update public.payment_links        set org_id = v_default where org_id is null;
  update public.lead_stage_overrides set org_id = v_default where org_id is null;
end $$;

-- ----------------------------------------------------------------------------
-- 5) ENFORCE org_id (NOT NULL + FK + index) on every domain table
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'strategies','connections','lead_sources','manual_leads','connected_products',
    'product_enrollments','sales_users','lead_assignments','sales_activities','deals',
    'commission_records','campaigns','payment_links','lead_stage_overrides'
  ] loop
    -- idempotent: only flip to NOT NULL if still nullable
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name=t and column_name='org_id' and is_nullable='YES'
    ) then
      execute format('alter table public.%I alter column org_id set not null', t);
    end if;
    -- idempotent: only add the FK if it isn't there yet
    if not exists (select 1 from pg_constraint where conname = t||'_org_id_fkey') then
      execute format('alter table public.%I add constraint %I foreign key (org_id) references public.organizations(id) on delete cascade', t, t||'_org_id_fkey');
    end if;
    execute format('create index if not exists %I on public.%I(org_id)', 'idx_'||t||'_org_id', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 6) RLS ON TENANCY TABLES
-- ----------------------------------------------------------------------------
alter table public.organizations   enable row level security;
alter table public.org_memberships enable row level security;

create policy organizations_select on public.organizations for select to authenticated
using (
  public.is_super_admin()
  or id in (select org_id from public.org_memberships where user_id = auth.uid() and status = 'active')
  or parent_org_id in (select org_id from public.org_memberships where user_id = auth.uid() and status = 'active')
);
create policy organizations_insert on public.organizations for insert to authenticated
with check ( public.is_super_admin() or public.is_org_admin(parent_org_id) );
create policy organizations_update on public.organizations for update to authenticated
using ( public.is_super_admin() or public.is_org_admin(id) )
with check ( public.is_super_admin() or public.is_org_admin(id) );
create policy organizations_delete on public.organizations for delete to authenticated
using ( public.is_super_admin() );

create policy org_memberships_select on public.org_memberships for select to authenticated
using ( user_id = auth.uid() or public.is_org_admin(org_id) );
create policy org_memberships_insert on public.org_memberships for insert to authenticated
with check ( public.is_org_admin(org_id) );
create policy org_memberships_update on public.org_memberships for update to authenticated
using ( public.is_org_admin(org_id) ) with check ( public.is_org_admin(org_id) );
create policy org_memberships_delete on public.org_memberships for delete to authenticated
using ( public.is_org_admin(org_id) );

-- ----------------------------------------------------------------------------
-- 7) REPLACE PER-USER RLS WITH ORG-SCOPED RLS ON DOMAIN TABLES
-- ----------------------------------------------------------------------------
-- 7a) drop every existing policy on the domain tables
do $$
declare t text; r record;
begin
  foreach t in array array[
    'strategies','connections','lead_sources','manual_leads','connected_products',
    'product_enrollments','sales_users','lead_assignments','sales_activities','deals',
    'commission_records','campaigns','payment_links','lead_stage_overrides'
  ] loop
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', r.policyname, t);
    end loop;
  end loop;
end $$;

-- 7b) standard org-scoped CRUD (every company member of the row's org)
do $$
declare t text;
begin
  foreach t in array array[
    'strategies','connections','lead_sources','manual_leads','connected_products',
    'product_enrollments','sales_users','lead_assignments','sales_activities','deals',
    'commission_records','campaigns','lead_stage_overrides'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.has_company_access(org_id))', t||'_sel', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_company_access(org_id))', t||'_ins', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_company_access(org_id)) with check (public.has_company_access(org_id))', t||'_upd', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_company_access(org_id))', t||'_del', t);
  end loop;
end $$;

-- 7c) payment_links: org-scoped for authenticated + preserve the PUBLIC checkout.
create policy payment_links_sel on public.payment_links for select to authenticated
  using (public.has_company_access(org_id));
create policy payment_links_ins on public.payment_links for insert to authenticated
  with check (public.has_company_access(org_id));
create policy payment_links_upd on public.payment_links for update to authenticated
  using (public.has_company_access(org_id)) with check (public.has_company_access(org_id));
create policy payment_links_del on public.payment_links for delete to authenticated
  using (public.has_company_access(org_id));
-- anonymous payer marking a pending link as paid (simulated checkout). Public
-- single-link READ stays via the SECURITY DEFINER RPC public.get_public_payment_link.
-- The old blanket "Public read by id" (USING true) is intentionally NOT recreated.
create policy payment_links_public_mark_paid on public.payment_links for update to anon
  using (status = 'pending') with check (status in ('pending','paid'));

-- ----------------------------------------------------------------------------
-- 8) SIGNUP: stop auto-granting access. Onboarding is invite/provisioning-based.
-- ----------------------------------------------------------------------------
create or replace function public.sync_new_user_to_access()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Access is granted explicitly via org_memberships (invite / provisioning,
  -- Phase 3). New auth users get NO automatic role or company. Intentional no-op.
  return new;
end;
$$;
