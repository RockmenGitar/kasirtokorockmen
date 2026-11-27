-- =====================================================================
-- KasirToko POS — Migration v2 (AMAN / additive)
-- Menambah kolom & tabel baru untuk: inventori, pengeluaran, pelanggan,
-- promo, shift, refund, pengaturan toko, dan perluasan produk/transaksi.
--
-- Prinsip keamanan:
--   * Semua CREATE TABLE pakai IF NOT EXISTS.
--   * Semua kolom baru pakai ADD COLUMN IF NOT EXISTS.
--   * Semua kolom wajib baru diberi DEFAULT / NULLABLE agar data lama aman.
--   * Tidak ada DROP / RENAME.
-- Jalankan di Supabase SQL Editor setelah schema v1.
-- =====================================================================

-- ── Perluasan tabel products ─────────────────────────────────────────
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku         TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode     TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit        TEXT DEFAULT 'pcs';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost        NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS active      BOOLEAN DEFAULT TRUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_stock   INTEGER DEFAULT 5;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants    JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- ── Perluasan tabel transactions ─────────────────────────────────────
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS customer_id      TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cashier_id       TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS subtotal         NUMERIC DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS discount         NUMERIC DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tax              NUMERIC DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS service_charge   NUMERIC DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS rounding         NUMERIC DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cogs             NUMERIC DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS order_type       TEXT DEFAULT 'Retail';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS paid_amount      NUMERIC DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS change_amount    NUMERIC DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS refunded_amount  NUMERIC DEFAULT 0;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS shift_id         TEXT;

-- ── Perluasan tabel cashiers (permissions + multi-outlet) ─────────────
ALTER TABLE public.cashiers ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '["pos","invoices"]'::jsonb;
ALTER TABLE public.cashiers ADD COLUMN IF NOT EXISTS store_ids   JSONB DEFAULT '[]'::jsonb;

-- ── Perluasan tabel profiles (multi-outlet untuk owner) ───────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS store_ids JSONB DEFAULT '[]'::jsonb;

-- ── Stok produk per outlet (satu katalog, stok terpisah tiap outlet) ──
CREATE TABLE IF NOT EXISTS public.product_stock (
    product_id     TEXT NOT NULL,
    store_id       BIGINT NOT NULL REFERENCES public.stores(id),
    stock_quantity NUMERIC DEFAULT 0,
    stock_status   TEXT DEFAULT 'In Stock',
    min_stock      INTEGER DEFAULT 5,
    PRIMARY KEY (product_id, store_id)
);
CREATE INDEX IF NOT EXISTS idx_product_stock_store ON public.product_stock(store_id);

-- ── Perluasan tabel stores (informasi outlet) ─────────────────────────
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS phone   TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS tax_id  TEXT;

-- ── 3. stock_movements (buku besar stok) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id           TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    created_at   TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    product_id   TEXT NOT NULL,
    product_name TEXT NOT NULL,
    variant_id   TEXT,
    type         TEXT NOT NULL,      -- in|out|adjustment|opname|damage|return|transfer_in|transfer_out|sale
    quantity     NUMERIC NOT NULL,   -- delta (negatif = keluar)
    stock_before NUMERIC DEFAULT 0,
    stock_after  NUMERIC DEFAULT 0,
    reason       TEXT,
    reference    TEXT,
    store_id     BIGINT NOT NULL REFERENCES public.stores(id),
    user_name    TEXT
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_store   ON public.stock_movements(store_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);

-- ── 4. expenses (pengeluaran) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
    id             TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    created_at     TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    date           DATE NOT NULL,
    category       TEXT NOT NULL,
    amount         NUMERIC NOT NULL,
    description    TEXT,
    attachment_url TEXT,
    store_id       BIGINT NOT NULL REFERENCES public.stores(id),
    user_name      TEXT
);
CREATE INDEX IF NOT EXISTS idx_expenses_store ON public.expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date  ON public.expenses(date);

-- ── 5. customers (pelanggan) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customers (
    id         TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    name       TEXT NOT NULL,
    phone      TEXT,
    email      TEXT,
    address    TEXT,
    note       TEXT,
    points     INTEGER DEFAULT 0,
    store_id   BIGINT NOT NULL REFERENCES public.stores(id)
);
CREATE INDEX IF NOT EXISTS idx_customers_store ON public.customers(store_id);

-- ── 6. promos ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promos (
    id           TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    created_at   TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    name         TEXT NOT NULL,
    code         TEXT,
    type         TEXT NOT NULL,     -- nominal | percentage
    value        NUMERIC NOT NULL,
    min_purchase NUMERIC DEFAULT 0,
    start_date   DATE,
    end_date     DATE,
    active       BOOLEAN DEFAULT TRUE,
    store_id     BIGINT NOT NULL REFERENCES public.stores(id)
);
CREATE INDEX IF NOT EXISTS idx_promos_store ON public.promos(store_id);

-- ── 7. shifts (shift kasir / kas drawer) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.shifts (
    id                  TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    created_at          TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    opened_at           TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    closed_at           TIMESTAMPTZ,
    cashier_id          TEXT,
    cashier_name        TEXT NOT NULL,
    opening_cash        NUMERIC DEFAULT 0,
    closing_cash_actual NUMERIC,
    cash_in             NUMERIC DEFAULT 0,
    cash_out            NUMERIC DEFAULT 0,
    expected_cash       NUMERIC DEFAULT 0,
    difference          NUMERIC DEFAULT 0,
    status              TEXT DEFAULT 'open',   -- open | closed
    note                TEXT,
    store_id            BIGINT NOT NULL REFERENCES public.stores(id)
);
CREATE INDEX IF NOT EXISTS idx_shifts_store ON public.shifts(store_id);

-- ── 8. refunds ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.refunds (
    id             TEXT PRIMARY KEY DEFAULT (gen_random_uuid())::text,
    created_at     TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    transaction_id TEXT NOT NULL,
    order_id       TEXT NOT NULL,
    type           TEXT NOT NULL,   -- full | partial
    amount         NUMERIC NOT NULL,
    items          JSONB DEFAULT '[]'::jsonb,
    reason         TEXT,
    restock        BOOLEAN DEFAULT TRUE,
    user_name      TEXT,
    store_id       BIGINT NOT NULL REFERENCES public.stores(id)
);
CREATE INDEX IF NOT EXISTS idx_refunds_store ON public.refunds(store_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.refunds(order_id);

-- ── 9. store_settings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_settings (
    store_id             BIGINT PRIMARY KEY REFERENCES public.stores(id),
    tax_rate             NUMERIC DEFAULT 11,
    tax_included         BOOLEAN DEFAULT TRUE,
    service_charge_rate  NUMERIC DEFAULT 0,
    rounding             NUMERIC DEFAULT 0,
    timezone             TEXT DEFAULT 'Asia/Jakarta',
    receipt_header       TEXT,
    receipt_footer       TEXT,
    order_prefix         TEXT DEFAULT 'ORD',
    low_stock_threshold  INTEGER DEFAULT 5,
    payment_methods      JSONB DEFAULT '["Cash","QRIS","Transfer"]'::jsonb,
    notification_stock   BOOLEAN DEFAULT TRUE
);

-- ── RLS permissif (konsisten dengan schema v1) ───────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'stock_movements','expenses','customers','promos','shifts','refunds','store_settings','product_stock'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS allow_all ON public.%I', t);
    EXECUTE format('CREATE POLICY allow_all ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ── 10. RPC: penyesuaian stok atomik ─────────────────────────────────
-- Mengurangi/menambah stok + mencatat pergerakan dalam satu transaksi.
-- Mencegah stok minus saat transaksi bersamaan.
CREATE OR REPLACE FUNCTION public.adjust_stock(
    p_product_id   TEXT,
    p_store_id     BIGINT,
    p_quantity     NUMERIC,     -- delta (negatif = keluar)
    p_type         TEXT,
    p_reason       TEXT DEFAULT NULL,
    p_reference    TEXT DEFAULT NULL,
    p_user_name    TEXT DEFAULT NULL
) RETURNS TABLE (stock_before NUMERIC, stock_after NUMERIC, movement_id TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_before NUMERIC;
    v_after  NUMERIC;
    v_status TEXT;
    v_name   TEXT;
    v_min    INTEGER;
    v_id     TEXT;
BEGIN
    -- Ambil nama & min_stock produk
    SELECT name, COALESCE(min_stock, 5)
      INTO v_name, v_min
      FROM public.products
      WHERE id = p_product_id
      LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Produk tidak ditemukan';
    END IF;

    -- Stok per outlet: kunci baris product_stock bila ada
    SELECT stock_quantity INTO v_before
      FROM public.product_stock
      WHERE product_id = p_product_id AND store_id = p_store_id
      FOR UPDATE;

    IF NOT FOUND THEN
        -- fallback ke stok global produk
        SELECT stock_quantity INTO v_before
          FROM public.products
          WHERE id = p_product_id AND store_id = p_store_id
          FOR UPDATE;
        IF NOT FOUND THEN
            SELECT stock_quantity INTO v_before FROM public.products WHERE id = p_product_id;
        END IF;
    END IF;
    v_before := COALESCE(v_before, 0);

    IF p_quantity < 0 AND (v_before + p_quantity) < 0 THEN
        RAISE EXCEPTION 'Stok tidak cukup untuk %', v_name;
    END IF;

    v_after  := GREATEST(0, v_before + p_quantity);
    v_status := CASE WHEN v_after <= 0 THEN 'Out of Stock'
                     WHEN v_after <= v_min THEN 'Low Stock'
                     ELSE 'In Stock' END;
    v_id     := 'mv-' || gen_random_uuid()::text;

    -- Simpan stok per outlet
    INSERT INTO public.product_stock (product_id, store_id, stock_quantity, stock_status, min_stock)
    VALUES (p_product_id, p_store_id, v_after, v_status, v_min)
    ON CONFLICT (product_id, store_id)
    DO UPDATE SET stock_quantity = v_after, stock_status = v_status;

    -- Sinkronkan juga stok global produk (untuk tampilan default)
    UPDATE public.products
       SET stock_quantity = v_after,
           stock_status   = v_status,
           updated_at     = timezone('utc'::text, now())
     WHERE id = p_product_id AND store_id = p_store_id;

    INSERT INTO public.stock_movements
        (id, product_id, product_name, type, quantity, stock_before, stock_after, reason, reference, store_id, user_name)
    VALUES
        (v_id, p_product_id, v_name, p_type, p_quantity, v_before, v_after, p_reason, p_reference, p_store_id, p_user_name);

    RETURN QUERY SELECT v_before, v_after, v_id;
END;
$$;

-- =====================================================================
-- Catatan deployment:
-- 1. Jalankan schema v1 dulu, lalu file ini.
-- 2. Isolasi data antar-outlet ditegakkan di app layer (filter store_id).
--    Untuk produksi multi-tenant ketat, ganti policy allow_all dengan
--    policy berbasis JWT/store_id.
-- 3. Cadangan: gunakan fitur backup harian Supabase (Database > Backups),
--    atau `pg_dump` terjadwal. Pemulihan: restore dari backup terpilih.
-- =====================================================================
