-- ============================================================================
-- Phase 5: a (simulated) checkout writes a REAL sale.
-- Link a payment_link to its lead/closer/deal, and when the link is paid,
-- flip the deal to 'won' and the lead to 'fechou'. The trigger is SECURITY
-- DEFINER so it runs for ANY path that marks a link paid — including the
-- anonymous public checkout RPC (mark_payment_link_paid / *_line_paid).
-- ============================================================================
alter table public.payment_links
  add column if not exists closer_user_id uuid references public.sales_users(id) on delete set null,
  add column if not exists lead_id uuid references public.manual_leads(id) on delete set null,
  add column if not exists deal_id uuid references public.deals(id) on delete set null;

create or replace function public.on_payment_link_paid()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and (old.status is distinct from 'paid') then
    if new.deal_id is not null then
      update public.deals
         set stage = 'won', won_at = coalesce(won_at, now()), updated_at = now()
       where id = new.deal_id;
    end if;
    if new.lead_id is not null then
      update public.manual_leads
         set stage = 'fechou', updated_at = now()
       where id = new.lead_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payment_link_paid on public.payment_links;
create trigger trg_payment_link_paid
  after update of status on public.payment_links
  for each row execute function public.on_payment_link_paid();
