# KasirToko Desktop (EXE) — Tauri

Aplikasi web KasirToko dibungkus menjadi aplikasi desktop Windows (.exe) memakai **Tauri 2** (WebView2), sehingga ukuran kecil dan ringan.

## Prasyarat (sudah terpasang)
- Rust (cargo/rustc)
- Microsoft Visual Studio Build Tools (MSVC)
- WebView2 Runtime (bawaan Windows 10/11)

## Menjalankan mode desktop (dev)
```bash
npm run desktop:dev
```
Akan menjalankan Vite + membuka jendela aplikasi desktop.

## Membangun installer / EXE
```bash
npm run desktop:build
```
Hasil build ada di:
```
src-tauri/target/release/bundle/
```
- `msi/` → installer `.msi`
- `nsis/` → installer `.exe`
- Binary mentah: `src-tauri/target/release/KasirToko.exe`

## Catatan
- Konfigurasi aplikasi: `src-tauri/tauri.conf.json`
- Ikon: `src-tauri/icons/` (hasil `npx tauri icon public/favicon.svg`)
- Scanner barcode USB/Bluetooth **langsung berfungsi** di EXE (input keyboard-wedge).
- Kamera (scan via kamera) berjalan selama izin kamera webview diberikan.
- Build pertama akan mengunduh & mengompilasi dependensi Rust (butuh waktu & ruang disk).
