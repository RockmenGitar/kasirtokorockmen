-- =====================================================================
-- Index untuk pencarian barcode/SKU yang cepat (exact-match).
-- Jalankan sekali di Supabase SQL Editor.
-- Aman diulang (IF NOT EXISTS).
-- =====================================================================

-- Produk: barcode & SKU unik per outlet (partial index, abaikan NULL/kosong)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode
    ON public.products (store_id, barcode)
    WHERE barcode IS NOT NULL AND barcode <> '';

CREATE INDEX IF NOT EXISTS idx_products_sku
    ON public.products (store_id, sku)
    WHERE sku IS NOT NULL AND sku <> '';

-- Pencarian teks nama (opsional, mempercepat LIKE/ilike sederhana di datasets besar)
CREATE INDEX IF NOT EXISTS idx_products_name
    ON public.products (store_id, lower(name));

-- Selesai.
