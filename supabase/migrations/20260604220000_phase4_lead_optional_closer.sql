-- ============================================================================
-- Phase 4: leads can be created without a closer yet (cold leads). The closer
-- is assigned later in the pipeline / lead detail. Checkout still sets it.
-- ============================================================================
alter table public.manual_leads alter column closer_user_id drop not null;
