# HANDOFF — Konteks Proyek KasirToko

> Dokumen ini untuk melanjutkan pekerjaan di **sesi opencode baru** agar konteks
> tidak hilang. Sesi lama punya ingatan penuh tapi skill tidak terdeteksi;
> sesi baru mendeteksi skill tapi tidak ingat percakapan. Baca file ini dulu.

## Ringkasan proyek

Aplikasi **POS / kasir** bernama **KasirToko** (brand pemilik: Rockmen Gitar).
- **Stack web**: React 19 + TypeScript + Vite + Tailwind v4 + Supabase.
- **Desktop**: dibungkus **Tauri 2** (folder `src-tauri/`, lihat `DESKTOP.md`).
- **Android/Flutter**: DITUNDA (laptop belum kuat Android Studio). Rencana ada di `BRIEF-UI-KASIRTOKO.md`.
- Bahasa: **Indonesia + English (dwibahasa)** via `src/lib/i18n.tsx` (tombol ID/EN di navbar).

## Repo & deploy
- GitHub: `https://github.com/RockmenGitar/kasirtokorockmen` (branch `main`, akun gh aktif: `RockmenGitar`).
- Vercel: auto-deploy dari GitHub (env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — **type Config, bukan Secret**).
- `vercel.json`: build `npm run build`, output `dist`, SPA rewrite.

## Supabase
- Project URL: `https://fmlylwxecfftovutshdt.supabase.co`
- Publishable key tersimpan di Vercel (jangan commit).
- SQL sudah dijalankan (schema, migration v2, seed Rockmen). File SQL tambahan:
  - `supabase_fix_pgcrypto.sql`, `supabase_fix_handle_new_user.sql`, `supabase_fix_id_defaults.sql`
  - `supabase_index_barcode.sql`, `supabase_receive_stock.sql` (perlu dijalankan bila belum)
- Akun demo/produksi:
  - Owner outlet 1: `owner@rockmen.com` / `admin123`
  - Owner outlet 2: `dave@rockmen.com` / `admin123`
  - Kasir: `dave@rockmen.com`/`kasir123` (bentrok dgn owner — disarankan ganti `dave1@rockmen.com`), `dave2@rockmen.com`/`kasir123`
- Outlet: id 5 = Rockmen Pemogan, id 6 = Rockmen Bali.

## Kontrak data (src/api/types.ts)
Tabel Supabase utama: `stores`, `products` (+`sku`,`barcode`,`unit`,`cost`,`active`,`min_stock`,`variants` JSONB), `product_stock` (stok per outlet), `transactions` (+`cogs`,`subtotal`,`discount`,`tax`,`order_type`,`items`), `categories`, `promos`, `customers`, `shifts`, `stock_movements` (+`variant_id`), `store_settings`, `profiles` (owner), `cashiers` (kasir).
- Login: owner via Supabase Auth → `profiles`; kasir via tabel `cashiers` (email+password).
- Multi-outlet: `store_ids` di profile/cashier. Kasir bisa pindah outlet (switcher di sidebar).
- Stok per outlet: `product_stock`. Stok varian: `products.variants[].stock_quantity`.

## Fitur yang SUDAH selesai
1. POS lengkap: keranjang, diskon item/transaksi, promo, pelanggan opsional, hold order, cash kembalian, struk, snapshot HPP.
2. Inventori: stok, penyesuaian (masuk/keluar/opname/rusak/retur), riwayat pergerakan.
3. **Stok Masuk (baru)**: `src/sections/inventory/StockReceive.tsx` + `src/api/receive.ts`. Scan barcode → isi jumlah → daftar penerimaan (gabung baris sama) → simpan sekaligus, idempotent (batch_id + cek reference di Supabase).
4. Barcode: 
   - `src/lib/barcode/useBarcodeScanner.ts` (scanner USB/Bluetooth keyboard-wedge + beep + anti-double + exact match)
   - `src/lib/barcode/beep.ts`, `src/lib/barcode/lookup.ts` (`findBarcodeMatches` → dukung pilih varian bila >1 cocok)
   - `src/components/modal/BarcodeScannerModal.tsx` (kamera via `html5-qrcode`, mode kontinu)
5. Produk: varian (nama/SKU/barcode/harga/stok), kolom barcode/SKU, pencarian ikut barcode/SKU. Stok **read-only** di Produk; ubah stok hanya via Inventori.
6. Kasir HP responsif: keranjang bottom-sheet, bar total mengambang, sidebar off-canvas, tombol Scan.
7. Dwibahasa penuh ID/EN.
8. **Bantuan kontekstual**: `src/components/ui/HelpBadge.tsx` (tooltip + popover, tutup klik luar/Escape) dipasang di box fitur utama.
9. ErrorBoundary: `src/components/ui/ErrorBoundary.tsx` (cegah blank putih).
10. Multi-outlet: CRUD outlet, assign staff ke beberapa outlet, sync produk antar-outlet (nama/varian/harga/kategori, TANPA stok).
11. Edge Function `supabase/functions/admin-users/index.ts` untuk CRUD owner/kasir dari web (perlu `supabase functions deploy admin-users`).

## Masalah yang PERNAH ditemukan (sudah diperbaiki)
- `generate_salt`/`gen_salt` → pgcrypto di schema `extensions` (`supabase_fix_pgcrypto.sql`).
- Trigger `handle_new_user` paksa store_id=1 → `supabase_fix_handle_new_user.sql`.
- id TEXT tanpa default → `supabase_fix_id_defaults.sql`.
- Edit produk blank putih → guard data + ErrorBoundary (ErrorBoundary belum dikonfirmasi menyelesaikan; perlu uji).

## PERLU DILAKUKAN (next steps)
- Jalankan SQL yang belum: `supabase_index_barcode.sql`, `supabase_receive_stock.sql`.
- Redeploy Vercel.
- Edge Function `admin-users` (opsional, untuk CRUD akun dari web).
- Verifikasi flow Stok Masuk: stok awal 5 → scan → isi 30 → simpan → stok 35 + gerakan +30 tercatat.
- Cek edit produk yang tadinya blank (konfirmasi fix).
- Flutter/Android ditunda sampai komputer baru.

## Aturan kerja
- Verifikasi tiap langkah: `npx tsc -b` lalu `npm run build`. Dev: `npm run dev` (port 5173).
- Push ke GitHub hanya bila diminta. Jangan commit `.env`.
- Jangan simpan kredensial/secret di repo.
