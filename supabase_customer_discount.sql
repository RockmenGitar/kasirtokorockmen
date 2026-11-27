-- =====================================================================
-- Diskon khusus per pelanggan (persen). Jalankan di Supabase SQL Editor.
-- Aman diulang.
-- =====================================================================

ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0;

-- Selesai.
