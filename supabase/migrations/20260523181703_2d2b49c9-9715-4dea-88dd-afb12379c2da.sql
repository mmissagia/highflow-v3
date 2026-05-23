
ALTER TABLE public.payment_links
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'arranged',
  ADD COLUMN IF NOT EXISTS flexible_config JSONB,
  ADD COLUMN IF NOT EXISTS transactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_cpf TEXT,
  ADD COLUMN IF NOT EXISTS closer_role TEXT DEFAULT 'Consultor(a)';

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_links_mode_check') THEN
    ALTER TABLE public.payment_links DROP CONSTRAINT payment_links_mode_check;
  END IF;
END $$;
ALTER TABLE public.payment_links
  ADD CONSTRAINT payment_links_mode_check CHECK (mode IN ('arranged','flexible'));

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_links_status_check') THEN
    ALTER TABLE public.payment_links DROP CONSTRAINT payment_links_status_check;
  END IF;
END $$;
ALTER TABLE public.payment_links
  ADD CONSTRAINT payment_links_status_check CHECK (status IN ('pending','partial','paid','expired','cancelled'));
