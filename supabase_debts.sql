-- =====================================================================
-- Kasbon / utang pelanggan. Jalankan di Supabase SQL Editor. Aman diulang.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.debts (
    id             TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    created_at     TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    customer_id    TEXT,
    customer_name  TEXT NOT NULL,
    transaction_id TEXT,
    order_id       TEXT,
    amount         NUMERIC NOT NULL DEFAULT 0,
    paid_amount    NUMERIC NOT NULL DEFAULT 0,
    status         TEXT NOT NULL DEFAULT 'unpaid',  -- unpaid | partial | paid
    note           TEXT,
    due_date       DATE,
    store_id       BIGINT NOT NULL REFERENCES public.stores(id),
    user_name      TEXT
);
CREATE INDEX IF NOT EXISTS idx_debts_store ON public.debts(store_id);
CREATE INDEX IF NOT EXISTS idx_debts_customer ON public.debts(customer_id);

CREATE TABLE IF NOT EXISTS public.debt_payments (
    id         TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    debt_id    TEXT NOT NULL,
    amount     NUMERIC NOT NULL DEFAULT 0,
    note       TEXT,
    user_name  TEXT,
    store_id   BIGINT NOT NULL REFERENCES public.stores(id)
);
CREATE INDEX IF NOT EXISTS idx_debt_payments_store ON public.debt_payments(store_id);

-- RLS permissif (konsisten dengan skema lain)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['debts','debt_payments'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS allow_all ON public.%I', t);
    EXECUTE format('CREATE POLICY allow_all ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- Selesai.
