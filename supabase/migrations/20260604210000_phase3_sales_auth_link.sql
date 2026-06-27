-- ============================================================================
-- Phase 3: link a sales_user to a real login (auth user).
-- When a seller (SDR/Closer/Leader) is invited, the invite-member edge function
-- creates an auth user + org_membership + a sales_users row with auth_user_id set.
-- Nullable: legacy/seed sales_users have no login yet.
-- ============================================================================
alter table public.sales_users
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_sales_users_auth_user on public.sales_users(auth_user_id);
