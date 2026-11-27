# Panduan Deploy — KasirToko Rockmen

Panduan lengkap: GitHub, Supabase, Edge Function, dan Vercel.

## 1. GitHub

Repo: `https://github.com/RockmenGitar/kasirtokorockmen`

```bash
git add .
git commit -m "pesan"
git push origin main
```

## 2. Supabase — setup database

Di Supabase → **SQL Editor**, jalankan berurutan:

1. `supabase_schema.sql` — tabel dasar
2. `supabase_migration_v2.sql` — inventori, promo, shift, refund, multi-outlet, stok per outlet
3. `supabase_seed_rockmen.sql` — outlet, akun, kategori, produk, stok

Jika muncul error `gen_salt does not exist`:
- Jalankan `supabase_fix_pgcrypto.sql`

Jika muncul error `profiles_store_id_fkey`:
- Jalankan `supabase_fix_handle_new_user.sql`

## 3. Supabase — Edge Function `admin-users`

Fungsi ini membuat tambah/ubah/hapus **owner** & **kasir** dari panel web
tersimpan ke Supabase (pakai `service_role`).

### Deploy function

Install Supabase CLI, lalu dari folder project:

```bash
supabase login
supabase link --project-ref fmlylwxecfftovutshdt
supabase functions deploy admin-users
```

`SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` otomatis tersedia di Edge
Function (tidak perlu set manual).

> Jika ingin memanggil tanpa JWT (tidak disarankan), tambahkan `--no-verify-jwt`.

## 4. Vercel — deploy web

1. Import repo di https://vercel.com
2. Framework: **Vite** (otomatis)
3. **Environment Variables** (Environment: Production + Preview):
   - `VITE_SUPABASE_URL` = `https://fmlylwxecfftovutshdt.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (publishable key dari Supabase → Settings → API Keys)
     - **Type wajib: Config / Plain Text**, BUKAN Secret (karena prefix `VITE_`)
4. **Deploy**. Setiap kali env var diubah → **Redeploy**.

## 5. Akun login

| Peran | Email | Password | Outlet |
|-------|-------|----------|--------|
| Owner | owner@rockmen.com | admin123 | Rockmen Pemogan |
| Owner | dave@rockmen.com | admin123 | Rockmen Bali |
| Kasir | dave@rockmen.com | kasir123 | Rockmen Pemogan |
| Kasir | dave2@rockmen.com | kasir123 | Rockmen Bali |

> `dave@rockmen.com` dipakai owner & kasir sekaligus. Login akan masuk sebagai
> **owner** (dicek lebih dulu). Disarankan ganti email kasir outlet 1 jadi
> `dave1@rockmen.com`.

## 6. Keamanan — jangan pernah

- Menaruh `service_role` / `sb_secret_...` di frontend atau env `VITE_` (hanya
  `anon`/publishable key yang boleh).
- Menandai variabel `VITE_` sebagai Secret di Vercel.

## 7. Backup & pemulihan

- Backup: Supabase → Database → Backups (harian), atau `pg_dump` terjadwal.
- Pemulihan: restore dari backup terpilih.
