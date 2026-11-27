-- =====================================================================
-- FIX: kolom id TEXT PRIMARY KEY tanpa DEFAULT → error NOT NULL saat insert
-- dari app. Tambahkan default auto-generate ke tabel yang memakai id TEXT.
-- Jalankan sekali di Supabase SQL Editor.
-- =====================================================================

ALTER TABLE public.promos          ALTER COLUMN id SET DEFAULT (gen_random_uuid())::text;
ALTER TABLE public.expenses        ALTER COLUMN id SET DEFAULT (gen_random_uuid())::text;
ALTER TABLE public.customers       ALTER COLUMN id SET DEFAULT (gen_random_uuid())::text;
ALTER TABLE public.shifts          ALTER COLUMN id SET DEFAULT (gen_random_uuid())::text;
ALTER TABLE public.refunds         ALTER COLUMN id SET DEFAULT (gen_random_uuid())::text;
ALTER TABLE public.stock_movements ALTER COLUMN id SET DEFAULT (gen_random_uuid())::text;

-- Selesai.
