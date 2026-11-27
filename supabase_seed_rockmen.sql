-- =====================================================================
-- KasirToko — SEED ROCKMEN (siap pakai)
-- Jalankan SETELAH:
--   1. supabase_schema.sql
--   2. supabase_migration_v2.sql
--
-- Isi: 2 outlet, akun owner & kasir, kategori, produk gitar,
--      dan stok per outlet. Aman dijalankan ulang (idempotent).
--
-- CATATAN: setelah setup, tambah/ubah/hapus owner & kasir bisa juga dari
-- panel web (butuh Edge Function `admin-users`, lihat DEPLOY.md).
--
-- Akun yang dibuat (password default):
--   owner@rockmen.com   → owner (Outlet 1)      / admin123
--   dave@rockmen.com    → owner (Outlet 2)      / admin123
--   dave@rockmen.com    → kasir (Outlet 1)      / kasir123
--   dave2@rockmen.com   → kasir (Outlet 2)      / kasir123
-- =====================================================================

-- ── 1. Outlet ─────────────────────────────────────────────────────────
INSERT INTO public.stores (name, code, address)
VALUES ('Rockmen Pemogan', 'rockmenpemogan', 'Pemogan, Denpasar')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.stores (name, code, address)
VALUES ('Rockmen Bali', 'rockmenbali', 'Bali')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Simpan id outlet
DO $$
DECLARE
  v_store1 BIGINT;
  v_store2 BIGINT;
BEGIN
  SELECT id INTO v_store1 FROM public.stores WHERE code = 'rockmenpemogan';
  SELECT id INTO v_store2 FROM public.stores WHERE code = 'rockmenbali';

  -- ── 2. Akun owner (hanya jika belum ada) ───────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'owner@rockmen.com') THEN
    PERFORM public.create_admin('owner@rockmen.com', v_store1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'dave@rockmen.com') THEN
    PERFORM public.create_admin('dave@rockmen.com', v_store2);
  END IF;

  -- ── 3. Akun kasir (hanya jika belum ada) ───────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.cashiers WHERE email = 'dave@rockmen.com') THEN
    PERFORM public.create_cashier('Dave 1', 'dave@rockmen.com', v_store1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.cashiers WHERE email = 'dave2@rockmen.com') THEN
    PERFORM public.create_cashier('Dave 2', 'dave2@rockmen.com', v_store2);
  END IF;

  -- ── 4. Kategori per outlet ─────────────────────────────────────────
  INSERT INTO public.categories (name, emoji, store_id) VALUES
    ('Gitar',           '🎸', v_store1),
    ('Gitar Custom',    '🎸', v_store1),
    ('Senar Gitar',     '🎼', v_store1),
    ('Aksesoris Gitar', '🎵', v_store1),
    ('Gitar',           '🎸', v_store2),
    ('Gitar Custom',    '🎸', v_store2),
    ('Senar Gitar',     '🎼', v_store2),
    ('Aksesoris Gitar', '🎵', v_store2);

  -- ── 5. Produk + stok per outlet ────────────────────────────────────
  -- Tabel sementara katalog
  CREATE TEMP TABLE _catalogue (
    sku TEXT, name TEXT, descr TEXT, price NUMERIC, cost NUMERIC,
    category TEXT, unit TEXT, min_stock INT, stock1 INT, stock2 INT
  ) ON COMMIT DROP;

  INSERT INTO _catalogue VALUES
    ('GT-APX500',    'Gitar Akustik APX 500 II',     'Gitar akustik elegan dengan suara jernih.',      600000,  420000,  'Gitar',           'pcs',  2,  12, 7),
    ('GT-STRAT',     'Gitar Elektrik Stratocaster',  'Gitar elektrik single coil, cocok segala genre.',2500000, 1850000, 'Gitar',           'pcs',  1,  5,  3),
    ('GT-C40',       'Gitar Klasik Yamaha C40',      'Gitar klasik senar nilon untuk pemula.',         950000,  700000,  'Gitar',           'pcs',  2,  8,  4),
    ('GT-CUSTOM-RM', 'Gitar Custom Rockmen Series',  'Gitar custom handcrafted, finish premium.',      4500000, 3200000, 'Gitar Custom',    'pcs',  1,  3,  1),
    ('GT-CUSTOM-BL', 'Gitar Custom Bali Carving',    'Gitar custom ukiran khas Bali.',                 5500000, 4000000, 'Gitar Custom',    'pcs',  1,  2,  1),
    ('SR-ACOU',      'Senar Gitar Akustik Set',      'Satu set senar akustik gauge 12-53.',             85000,   55000,  'Senar Gitar',     'set',  10, 40, 22),
    ('SR-ELEC',      'Senar Gitar Elektrik Set',     'Satu set senar elektrik gauge 09-42.',            95000,   62000,  'Senar Gitar',     'set',  10, 35, 18),
    ('SR-ECER',      'Senar Gitar Ecer (per buah)',  'Senar gitar satuan, berbagai ukuran.',            15000,   8000,   'Senar Gitar',     'pcs',  20, 120,75),
    ('AK-PICK10',    'Pick Gitar (isi 10)',          'Pick gitar tebal, paket isi 10.',                 25000,   12000,  'Aksesoris Gitar', 'pack', 15, 60, 30),
    ('AK-CAPO',      'Capo Gitar',                    'Capo logam anti karat.',                          65000,   35000,  'Aksesoris Gitar', 'pcs',  8,  25, 12),
    ('AK-TUNER',     'Tuner Elektronik',             'Tuner clip-on dengan layar LCD.',                 75000,   40000,  'Aksesoris Gitar', 'pcs',  8,  20, 9),
    ('AK-STRAP',     'Strap Gitar Kulit',            'Strap gitar kulit asli, nyaman.',                 120000,  70000,  'Aksesoris Gitar', 'pcs',  6,  15, 6),
    ('AK-BAG',       'Tas Gitar Padded',             'Gig bag berlapis busa pelindung.',                185000,  110000, 'Aksesoris Gitar', 'pcs',  5,  10, 4),
    ('AK-CABLE',     'Kabel Jack Gitar 3m',          'Kabel instrumen 3 meter kualitas pro.',           55000,   30000,  'Aksesoris Gitar', 'pcs',  10, 30, 14);

  -- Insert produk untuk outlet 1
  INSERT INTO public.products (name, description, price, category, stock_status, stock_quantity, store_id, sku, unit, cost, min_stock, active)
  SELECT c.name, c.descr, c.price, c.category,
         CASE WHEN c.stock1 <= 0 THEN 'Out of Stock' WHEN c.stock1 <= c.min_stock THEN 'Low Stock' ELSE 'In Stock' END,
         c.stock1, v_store1, c.sku, c.unit, c.cost, c.min_stock, TRUE
  FROM _catalogue c
  WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.sku = c.sku AND p.store_id = v_store1);

  -- Insert produk untuk outlet 2
  INSERT INTO public.products (name, description, price, category, stock_status, stock_quantity, store_id, sku, unit, cost, min_stock, active)
  SELECT c.name, c.descr, c.price, c.category,
         CASE WHEN c.stock2 <= 0 THEN 'Out of Stock' WHEN c.stock2 <= c.min_stock THEN 'Low Stock' ELSE 'In Stock' END,
         c.stock2, v_store2, c.sku, c.unit, c.cost, c.min_stock, TRUE
  FROM _catalogue c
  WHERE NOT EXISTS (SELECT 1 FROM public.products p WHERE p.sku = c.sku AND p.store_id = v_store2);

  -- Stok per-outlet (product_stock) untuk outlet 1
  INSERT INTO public.product_stock (product_id, store_id, stock_quantity, stock_status, min_stock)
  SELECT p.id, v_store1, c.stock1,
         CASE WHEN c.stock1 <= 0 THEN 'Out of Stock' WHEN c.stock1 <= c.min_stock THEN 'Low Stock' ELSE 'In Stock' END,
         c.min_stock
  FROM _catalogue c
  JOIN public.products p ON p.sku = c.sku AND p.store_id = v_store1
  ON CONFLICT (product_id, store_id) DO UPDATE SET stock_quantity = EXCLUDED.stock_quantity, stock_status = EXCLUDED.stock_status;

  -- Stok per-outlet (product_stock) untuk outlet 2
  INSERT INTO public.product_stock (product_id, store_id, stock_quantity, stock_status, min_stock)
  SELECT p.id, v_store2, c.stock2,
         CASE WHEN c.stock2 <= 0 THEN 'Out of Stock' WHEN c.stock2 <= c.min_stock THEN 'Low Stock' ELSE 'In Stock' END,
         c.min_stock
  FROM _catalogue c
  JOIN public.products p ON p.sku = c.sku AND p.store_id = v_store2
  ON CONFLICT (product_id, store_id) DO UPDATE SET stock_quantity = EXCLUDED.stock_quantity, stock_status = EXCLUDED.stock_status;

  -- ── 6. Pengaturan toko (pajak 11% termasuk) ────────────────────────
  INSERT INTO public.store_settings (store_id, tax_rate, tax_included, payment_methods)
  VALUES
    (v_store1, 11, TRUE, '["Cash","QRIS","Transfer"]'::jsonb),
    (v_store2, 11, TRUE, '["Cash","QRIS","Transfer"]'::jsonb)
  ON CONFLICT (store_id) DO NOTHING;
END $$;

-- Selesai. Cek hasil:
SELECT s.id, s.name, s.code, COUNT(p.id) AS jumlah_produk
FROM public.stores s
LEFT JOIN public.products p ON p.store_id = s.id
GROUP BY s.id, s.name, s.code
ORDER BY s.id;
