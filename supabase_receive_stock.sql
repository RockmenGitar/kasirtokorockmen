-- =====================================================================
-- Dukungan Stok Masuk (penerimaan) & varian.
-- Jalankan sekali di Supabase SQL Editor. Aman diulang.
-- =====================================================================

-- stock_movements sudah punya kolom variant_id (migration v2).
-- Tambah index agar riwayat per varian cepat.
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant
    ON public.stock_movements (variant_id)
    WHERE variant_id IS NOT NULL;

-- Index referensi batch (untuk idempotency/lookup penerimaan bila dipakai).
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference
    ON public.stock_movements (reference);

-- Catatan: stok varian disimpan di kolom products.variants (JSONB),
-- dengan field stock_quantity per varian. RPC adjust_stock hanya untuk
-- produk tanpa varian; varian diperbarui langsung di tabel products.

-- Selesai.
