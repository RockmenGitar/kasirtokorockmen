# Panduan Agen — KasirToko

## Selalu gunakan skill
Untuk SETIAP perintah pengguna, muat (load) skill via tool `skill` yang paling cocok sebelum bekerja. Ini **wajib** dan permanen.

Pemetaan skill:
- **frontend-design** — saat membuat/mengubah UI, desain, tema, tata letak, komponen visual.
- **writing-plans** — saat ada spesifikasi/permintaan multi-langkah sebelum menyentuh kode.
- **systematic-debugging** — saat ada bug, error, tes gagal, atau perilaku tak terduga.
- **verification-before-completion** — sebelum mengklaim selesai/berhasil, menjalankan lint/build, atau commit/PR.

Aturan:
- Muat minimal satu skill yang relevan di awal setiap tugas (boleh lebih dari satu).
- Jangan mengklaim "selesai/berhasil" tanpa menjalankan verifikasi (lint + build) dan menunjukkan hasilnya.
- Jika ragu skill mana, pakai `verification-before-completion` untuk penutup dan `frontend-design` untuk pekerjaan UI.

## Proyek
- Stack: React 19 + TypeScript + Vite + Tailwind v4 + Supabase; desktop via Tauri (`src-tauri/`).
- Dwibahasa ID/EN: `src/lib/i18n.tsx` (tombol di navbar). Teks baru: tambahkan kunci di `dict`.
- Bantuan kontekstual: `src/components/ui/HelpBadge.tsx` (tooltip + popover), teks `help.*` di i18n.
- Barcode: `src/lib/barcode/` (scanner USB + kamera).
- Verifikasi wajib: `npm run lint` dan `npm run build`.

## Catatan
- Jangan commit/push kecuali diminta eksplisit.
- Jangan simpan secret/kredensial di repo.
