# Brief Android KasirToko untuk OpenCode

Buat antarmuka Flutter orisinal untuk KasirToko. BillJingle menjadi referensi alur dan hierarki informasi. Seluruh arahan implementasi ada di dokumen ini dan dapat dibaca sebagai teks.

## Arah visual

Gunakan tema terang dengan latar abu muda, permukaan putih, teks gelap, dan satu aksen hijau kebiruan. Ambil warna utama dari branding KasirToko jika sudah tersedia. Pakai garis pemisah halus, angka total yang mudah dipindai, dan area sentuh minimal 48 dp. Gunakan Bahasa Indonesia dan format rupiah. Susun layout dari atas ke bawah sesuai tabel.

## Kasir Android

| Layar | Urutan isi | Interaksi utama |
|---|---|---|
| Jualan (referensi C08) | Nama outlet dan status shift → pencarian + ikon scan → kategori horizontal → grid produk (nama, harga, jumlah terpilih) → bar total keranjang → navigasi bawah | Ketuk produk untuk menambah jumlah atau pilih varian jika ada. Bar keranjang menampilkan jumlah item dan total serta membuka keranjang. |
| Keranjang (C14) | Judul → pelanggan opsional → daftar item dan jumlah → subtotal, diskon, pajak jika aktif → total → tombol Bayar | Ubah jumlah, hapus item, tambah diskon, atau simpan pesanan tertunda. Tombol Bayar aktif jika keranjang valid. |
| Pembayaran dan struk (usulan KasirToko) | Ringkasan tagihan → metode aktif di outlet → konfirmasi → hasil dan struk | Hitung kembalian untuk tunai. Tampilkan metode QRIS atau transfer bila tersedia. Cegah klik ganda saat transaksi diproses. |

Navigasi usulan: Jualan, Transaksi, Shift, Lainnya.

## Owner Android

| Layar | Urutan isi | Interaksi utama |
|---|---|---|
| Ringkasan (O06) | Pemilih outlet dan tanggal → kartu penjualan bersih hari ini, jumlah dan rata-rata transaksi → grafik per jam → ringkasan metode bayar → stok menipis | Ganti outlet untuk memperbarui data. Ketuk stok menipis untuk membuka daftar yang sudah difilter. |
| Stok per Outlet (O19) | Judul dan outlet aktif → tab Stok Menipis dan Semua → daftar nama produk/varian, stok saat ini, batas minimum → navigasi bawah | Buka detail item. Jika hak akses mengizinkan, sediakan Tambah Stok, Kurangi Stok, dan Hitung Ulang melalui mekanisme inventori yang sudah ada. |
| Laporan (usulan KasirToko) | Outlet → filter periode → total penjualan dan transaksi → rekap bulanan → detail | Gunakan definisi angka dan data yang sama dengan dashboard web. |

Navigasi usulan: Ringkasan, Laporan, Stok, Akun.

## Cara kerja di repo

1. Periksa struktur repo, login, peran, outlet, dan kontrak data sebelum mengubah kode. Gunakan ulang alur serta komponen yang sudah ada.
2. Mulai dari Jualan, Keranjang, Ringkasan, dan Stok. Hubungkan ke layanan yang tersedia dan laporkan bagian yang masih memerlukan API.
3. Tampilkan status memuat, kosong, gagal, dan tombol yang sesuai dengan hak akses. Data dan wewenang harus mengikuti bisnis dan outlet aktif.
4. Cek layout portrait 360 dp dan alur kasir sampai struk. Jika bisa memakai lingkungan uji, cocokkan transaksi, perubahan stok, dan rekap owner.

Referensi opsional: https://uikits.appzenic.com/billjingle/
