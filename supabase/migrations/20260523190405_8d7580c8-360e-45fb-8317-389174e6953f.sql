
CREATE OR REPLACE FUNCTION public.mark_payment_line_paid(
  p_id text,
  p_line_id text,
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
  v_row public.payment_links%ROWTYPE;
  v_new_lines jsonb := '[]'::jsonb;
  v_elem jsonb;
  v_paid_sum numeric := 0;
  v_all_paid boolean := true;
BEGIN
  SELECT * INTO v_row FROM public.payment_links WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_row.mode <> 'arranged' OR v_row.status NOT IN ('pending','partial') THEN
    RETURN false;
  END IF;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(COALESCE(v_row.payment_lines, '[]'::jsonb))
  LOOP
    IF v_elem->>'id' = p_line_id AND COALESCE((v_elem->>'paid')::boolean, false) = false THEN
      v_elem := v_elem || jsonb_build_object('paid', true, 'paid_at', to_jsonb(now()));
    END IF;
    v_new_lines := v_new_lines || v_elem;
    IF COALESCE((v_elem->>'paid')::boolean, false) THEN
      v_paid_sum := v_paid_sum + COALESCE((v_elem->>'value')::numeric, 0);
    ELSE
      v_all_paid := false;
    END IF;
  END LOOP;

  UPDATE public.payment_links
     SET payment_lines = v_new_lines,
         paid_amount = v_paid_sum,
         status = CASE WHEN v_all_paid THEN 'paid' ELSE 'partial' END,
         paid_at = CASE WHEN v_all_paid THEN now() ELSE paid_at END,
         paid_method = CASE WHEN v_all_paid THEN p_method ELSE paid_method END,
         lead_name = COALESCE(NULLIF(p_customer_name, ''), lead_name),
         lead_cpf = COALESCE(NULLIF(p_customer_cpf, ''), lead_cpf),
         lead_email = COALESCE(NULLIF(p_customer_email, ''), lead_email),
         lead_phone = COALESCE(NULLIF(p_customer_phone, ''), lead_phone)
   WHERE id = p_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_payment_line_paid(text,text,text,text,text,text,text) TO anon, authenticated;
