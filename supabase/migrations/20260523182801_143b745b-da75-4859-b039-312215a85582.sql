
-- Tighten payment_links RLS and expose only safe data via RPC

DROP POLICY IF EXISTS "Public read by id" ON public.payment_links;
DROP POLICY IF EXISTS "Public mark paid" ON public.payment_links;

CREATE POLICY "Producer read own"
  ON public.payment_links
  FOR SELECT
  TO authenticated
  USING (auth.uid() = producer_id);

-- Safe public read RPC: returns no PII (no email/phone/cpf)
CREATE OR REPLACE FUNCTION public.get_public_payment_link(p_id text)
RETURNS TABLE (
  id text,
  lead_name text,
  description text,
  value numeric,
  payment_lines jsonb,
  closer_name text,
  closer_initials text,
  closer_role text,
  status text,
  paid_method text,
  mode text,
  flexible_config jsonb,
  transactions jsonb,
  paid_amount numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pl.id, pl.lead_name, pl.description, pl.value, pl.payment_lines,
    pl.closer_name, pl.closer_initials, pl.closer_role,
    pl.status, pl.paid_method, pl.mode, pl.flexible_config,
    pl.transactions, pl.paid_amount
  FROM public.payment_links pl
  WHERE pl.id = p_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_payment_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_payment_link(text) TO anon, authenticated;

-- Mark arranged payment as paid (mock gateway). Only allowed if currently pending.
CREATE OR REPLACE FUNCTION public.mark_payment_link_paid(
  p_id text,
  p_method text,
  p_customer_name text,
  p_customer_cpf text,
  p_customer_email text,
  p_customer_phone text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.payment_links WHERE id = p_id;
  IF v_status IS NULL OR v_status <> 'pending' THEN
    RETURN false;
  END IF;
  UPDATE public.payment_links
     SET status = 'paid',
         paid_method = p_method,
         paid_at = now(),
         lead_name = COALESCE(NULLIF(p_customer_name, ''), lead_name),
         lead_cpf = COALESCE(NULLIF(p_customer_cpf, ''), lead_cpf),
         lead_email = COALESCE(NULLIF(p_customer_email, ''), lead_email),
         lead_phone = COALESCE(NULLIF(p_customer_phone, ''), lead_phone),
         paid_amount = value
   WHERE id = p_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_payment_link_paid(text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_payment_link_paid(text,text,text,text,text,text) TO anon, authenticated;

-- Add a flexible transaction (mock gateway).
CREATE OR REPLACE FUNCTION public.record_payment_link_transaction(
  p_id text,
  p_method text,
  p_value numeric,
  p_installments integer,
  p_customer_name text,
  p_customer_cpf text,
  p_customer_email text,
  p_customer_phone text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.payment_links%ROWTYPE;
  v_new_paid numeric;
  v_new_status text;
  v_tx jsonb;
BEGIN
  SELECT * INTO v_row FROM public.payment_links WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_row.mode <> 'flexible' OR v_row.status NOT IN ('pending','partial') THEN
    RETURN false;
  END IF;
  IF p_value <= 0 OR p_value > (v_row.value - v_row.paid_amount) + 0.001 THEN
    RETURN false;
  END IF;
  v_new_paid := v_row.paid_amount + p_value;
  v_new_status := CASE WHEN v_new_paid + 0.001 >= v_row.value THEN 'paid' ELSE 'partial' END;
  v_tx := jsonb_build_object(
    'id', 'tx_' || substr(replace(gen_random_uuid()::text,'-',''),1,5),
    'method', p_method,
    'value', p_value,
    'installments', p_installments,
    'status', 'paid',
    'paid_at', now()
  );
  UPDATE public.payment_links
     SET transactions = COALESCE(transactions, '[]'::jsonb) || v_tx,
         paid_amount = v_new_paid,
         status = v_new_status,
         paid_at = CASE WHEN v_new_status = 'paid' THEN now() ELSE paid_at END,
         paid_method = CASE WHEN v_new_status = 'paid' THEN p_method ELSE paid_method END,
         lead_name = COALESCE(NULLIF(p_customer_name, ''), lead_name),
         lead_cpf = COALESCE(NULLIF(p_customer_cpf, ''), lead_cpf),
         lead_email = COALESCE(NULLIF(p_customer_email, ''), lead_email),
         lead_phone = COALESCE(NULLIF(p_customer_phone, ''), lead_phone)
   WHERE id = p_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_payment_link_transaction(text,text,numeric,integer,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_payment_link_transaction(text,text,numeric,integer,text,text,text,text) TO anon, authenticated;
