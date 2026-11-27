import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'id' | 'en';

const STORAGE_KEY = 'kasirtoko_lang';

// ── Dictionary ─────────────────────────────────────────────────────────
// Kunci memakai namespace agar rapi: "menu.pos", "common.save", dsb.
const dict: Record<string, { id: string; en: string }> = {
  // ── Umum ──
  'common.save': { id: 'Simpan', en: 'Save' },
  'common.cancel': { id: 'Batal', en: 'Cancel' },
  'common.edit': { id: 'Ubah', en: 'Edit' },
  'common.delete': { id: 'Hapus', en: 'Delete' },
  'common.add': { id: 'Tambah', en: 'Add' },
  'common.search': { id: 'Cari', en: 'Search' },
  'common.close': { id: 'Tutup', en: 'Close' },
  'common.date': { id: 'Tanggal', en: 'Date' },
  'common.time': { id: 'Waktu', en: 'Time' },
  'common.status': { id: 'Status', en: 'Status' },
  'common.action': { id: 'Aksi', en: 'Action' },
  'common.product': { id: 'Produk', en: 'Product' },
  'common.category': { id: 'Kategori', en: 'Category' },
  'common.total': { id: 'Total', en: 'Total' },
  'common.quantity': { id: 'Jumlah', en: 'Quantity' },
  'common.price': { id: 'Harga', en: 'Price' },
  'common.stock': { id: 'Stok', en: 'Stock' },
  'common.customer': { id: 'Pelanggan', en: 'Customer' },
  'common.payment': { id: 'Cara Bayar', en: 'Payment' },
  'common.note': { id: 'Catatan', en: 'Note' },
  'common.all': { id: 'Semua', en: 'All' },
  'common.saving': { id: 'Menyimpan...', en: 'Saving...' },
  'common.saved': { id: 'Tersimpan', en: 'Saved' },
  'common.loading': { id: 'Memuat...', en: 'Loading...' },
  'common.optional': { id: 'opsional', en: 'optional' },
  'common.noData': { id: 'Belum ada data.', en: 'No data yet.' },

  // ── Menu / Navigasi ──
  'menu.dashboard': { id: 'Ringkasan', en: 'Dashboard' },
  'menu.pos': { id: 'Kasir', en: 'Cashier' },
  'menu.invoices': { id: 'Penjualan', en: 'Sales' },
  'menu.catalog': { id: 'Produk', en: 'Products' },
  'menu.inventory': { id: 'Inventori', en: 'Inventory' },
  'menu.promos': { id: 'Promo', en: 'Promos' },
  'menu.customers': { id: 'Pelanggan', en: 'Customers' },
  'menu.shifts': { id: 'Shift Kasir', en: 'Cashier Shifts' },
  'menu.sales': { id: 'Laporan', en: 'Reports' },
  'menu.expenses': { id: 'Pengeluaran', en: 'Expenses' },
  'menu.settings': { id: 'Pengaturan', en: 'Settings' },
  'menu.staff': { id: 'Outlet & Tim', en: 'Outlets & Team' },
  'menu.profile': { id: 'Profil', en: 'Profile' },
  'menu.help': { id: 'Bantuan', en: 'Help' },
  'menu.mainMenu': { id: 'Menu Utama', en: 'Main Menu' },
  'menu.subtitle': { id: 'Pusat Kendali POS', en: 'POS Command Center' },
  'nav.outlet': { id: 'Outlet', en: 'Outlet' },

  // ── Auth ──
  'auth.login': { id: 'Masuk', en: 'Sign in' },
  'auth.email': { id: 'Alamat Email', en: 'Email Address' },
  'auth.password': { id: 'Kata Sandi', en: 'Password' },
  'auth.forgot': { id: 'Lupa kata sandi?', en: 'Forgot password?' },
  'auth.noAccount': { id: 'Belum punya akun?', en: 'No account yet?' },
  'auth.contact': { id: 'Hubungi kami', en: 'Contact us' },
  'auth.error': { id: 'Email atau kata sandi salah.', en: 'Incorrect email or password.' },

  // ── Status ──
  'status.instock': { id: 'Tersedia', en: 'In Stock' },
  'status.lowstock': { id: 'Stok Menipis', en: 'Low Stock' },
  'status.outstock': { id: 'Stok Habis', en: 'Out of Stock' },
  'status.success': { id: 'Berhasil', en: 'Success' },
  'status.pending': { id: 'Menunggu', en: 'Pending' },
  'status.refunded': { id: 'Dikembalikan', en: 'Refunded' },
  'status.cancelled': { id: 'Dibatalkan', en: 'Cancelled' },
  'status.active': { id: 'Aktif', en: 'Active' },
  'status.inactive': { id: 'Nonaktif', en: 'Inactive' },

  // ── Dipakai luas ──
  'role.owner': { id: 'Pemilik', en: 'Owner' },
  'role.cashier': { id: 'Kasir', en: 'Cashier' },

  'footer.rights': { id: 'Hak cipta dilindungi.', en: 'All rights reserved.' },

  // ── Metode bayar ──
  'pay.cash': { id: 'Tunai', en: 'Cash' },
  'pay.qris': { id: 'QRIS', en: 'QRIS' },
  'pay.transfer': { id: 'Transfer Bank', en: 'Bank Transfer' },
  'pay.debit': { id: 'Kartu Debit', en: 'Debit Card' },
  'pay.ewallet': { id: 'Dompet Digital', en: 'E-Wallet' },

  // ── Pergerakan stok ──
  'mv.in': { id: 'Barang Masuk', en: 'Stock In' },
  'mv.out': { id: 'Barang Keluar', en: 'Stock Out' },
  'mv.adjustment': { id: 'Penyesuaian', en: 'Adjustment' },
  'mv.opname': { id: 'Hitung Ulang Stok', en: 'Stock Opname' },
  'mv.damage': { id: 'Barang Rusak', en: 'Damaged Goods' },
  'mv.return': { id: 'Barang Kembali', en: 'Return' },
  'mv.transfer_in': { id: 'Pindahan Masuk', en: 'Transfer In' },
  'mv.transfer_out': { id: 'Pindahan Keluar', en: 'Transfer Out' },
  'mv.sale': { id: 'Terjual', en: 'Sold' },

  // ── Ringkasan (Dashboard) ──
  'dash.title': { id: 'Ringkasan Bisnis', en: 'Business Overview' },
  'dash.subtitle': { id: 'Selamat datang! Berikut ringkasan aktivitas outlet Anda hari ini.', en: 'Welcome back! Here is what is happening across your outlet today.' },
  'dash.totalRevenue': { id: 'Total Pendapatan', en: 'Total Revenue' },
  'dash.totalRevenueDesc': { id: 'Total dari semua penjualan tercatat', en: 'Total from all recorded sales' },
  'dash.totalTx': { id: 'Total Transaksi', en: 'Total Transactions' },
  'dash.totalTxDesc': { id: 'Jumlah pesanan masuk', en: 'Number of orders received' },
  'dash.avgOrder': { id: 'Rata-rata per Pesanan', en: 'Average per Order' },
  'dash.avgOrderDesc': { id: 'Nilai rata-rata tiap transaksi', en: 'Average value per transaction' },
  'dash.activeCashiers': { id: 'Kasir Aktif', en: 'Active Cashiers' },
  'dash.activeCashiersDesc': { id: 'Kasir terdaftar di outlet ini', en: 'Cashiers registered in this outlet' },
  'dash.recentActivity': { id: 'Aktivitas Terbaru', en: 'Recent Activity' },
  'dash.noSales': { id: 'Belum ada penjualan. Mulai transaksi di menu Kasir.', en: 'No sales yet. Start a transaction in Cashier.' },

  // ── Kasir (POS) ──
  'pos.title': { id: 'Kasir', en: 'Cashier' },
  'pos.subtitle': { id: 'Cari nama atau kode barang, lalu buat pesanan.', en: 'Search by name or product code, then create an order.' },
  'pos.searchPlaceholder': { id: 'Cari produk...', en: 'Search products...' },
  'pos.cart': { id: 'Keranjang', en: 'Cart' },
  'pos.items': { id: 'Barang', en: 'Items' },
  'pos.emptyCart': { id: 'Keranjang kosong', en: 'Cart is empty' },
  'pos.emptyCartHint': { id: 'Pilih produk untuk mulai transaksi.', en: 'Pick a product to start.' },
  'pos.customerOptional': { id: 'Pelanggan (opsional)', en: 'Customer (optional)' },
  'pos.customerPlaceholder': { id: 'Ketik nama pelanggan...', en: 'Type customer name...' },
  'pos.paymentMethod': { id: 'Metode Bayar', en: 'Payment Method' },
  'pos.promo': { id: 'Promo', en: 'Promo' },
  'pos.noPromo': { id: 'Tidak ada promo', en: 'No promo' },
  'pos.itemDiscount': { id: 'Diskon item (Rp)...', en: 'Item discount (IDR)...' },
  'pos.addTxDiscount': { id: 'Tambah diskon transaksi', en: 'Add transaction discount' },
  'pos.txDiscount': { id: 'Diskon transaksi (Rp)', en: 'Transaction discount (IDR)' },
  'pos.cashReceived': { id: 'Uang Diterima', en: 'Cash Received' },
  'pos.subtotal': { id: 'Subtotal', en: 'Subtotal' },
  'pos.itemDisc': { id: 'Diskon item', en: 'Item discount' },
  'pos.txDisc': { id: 'Diskon transaksi', en: 'Transaction discount' },
  'pos.tax': { id: 'Pajak', en: 'Tax' },
  'pos.service': { id: 'Biaya layanan', en: 'Service charge' },
  'pos.rounding': { id: 'Pembulatan', en: 'Rounding' },
  'pos.change': { id: 'Kembalian', en: 'Change' },
  'pos.pay': { id: 'Bayar & Selesaikan', en: 'Pay & Complete' },
  'pos.hold': { id: 'Simpan pesanan tertunda', en: 'Hold order' },
  'pos.stockLeft': { id: 'Sisa', en: 'Left' },
  'pos.soldOut': { id: 'Stok Habis', en: 'Sold Out' },
  'pos.noProducts': { id: 'Produk tidak ditemukan', en: 'No products found' },

  // ── Penjualan (Invoices) ──
  'inv.title': { id: 'Penjualan', en: 'Sales' },
  'inv.subtitle': { id: 'Riwayat penjualan, status, dan cetak ulang struk.', en: 'Sales history, statuses, and reprint receipts.' },
  'inv.searchPlaceholder': { id: 'Cari nomor struk atau nama pelanggan...', en: 'Search receipt no. or customer name...' },
  'inv.receiptNo': { id: 'No. Struk', en: 'Receipt No.' },
  'inv.customer': { id: 'Pelanggan', en: 'Customer' },
  'inv.time': { id: 'Waktu', en: 'Time' },
  'inv.paid': { id: 'Jumlah Dibayar', en: 'Amount Paid' },
  'inv.payment': { id: 'Cara Bayar', en: 'Payment' },
  'inv.status': { id: 'Status', en: 'Status' },
  'inv.empty': { id: 'Belum ada penjualan', en: 'No sales yet' },
  'inv.openPos': { id: 'Buka Kasir', en: 'Open Cashier' },
  'inv.receipt': { id: 'Struk Pembayaran', en: 'Payment Receipt' },
  'inv.officialReceipt': { id: 'Struk Resmi Pembayaran', en: 'Official Payment Receipt' },
  'inv.invoiceNo': { id: 'No. Invoice', en: 'Invoice No.' },
  'inv.orderDetail': { id: 'Detail Pesanan', en: 'Order Details' },
  'inv.printReceipt': { id: 'Cetak Struk', en: 'Print Receipt' },
  'inv.refund': { id: 'Refund / Batalkan', en: 'Refund / Cancel' },
  'inv.pickReceipt': { id: 'Belum ada struk dipilih', en: 'No receipt selected' },
  'inv.pickReceiptHint': { id: 'Klik salah satu transaksi di tabel untuk menampilkan detail struk.', en: 'Click a transaction in the table to view its receipt.' },
  'inv.thanks': { id: 'Terima kasih atas kunjungan Anda!', en: 'Thank you for your visit!' },

  // ── Produk (Catalog) ──
  'cat.title': { id: 'Produk', en: 'Products' },
  'cat.subtitle': { id: 'Kelola produk dan kategori — tambah, ubah, atau hapus item.', en: 'Manage products and categories — add, edit, or remove items.' },
  'cat.addProduct': { id: 'Tambah Produk', en: 'Add Product' },
  'cat.manageCategory': { id: 'Kelola Kategori', en: 'Manage Categories' },
  'cat.activeCategories': { id: 'kategori aktif', en: 'active categories' },
  'cat.searchPlaceholder': { id: 'Cari produk...', en: 'Search products...' },
  'cat.totalProducts': { id: 'Total Produk', en: 'Total Products' },
  'cat.grid': { id: 'Tampilan Kotak', en: 'Grid' },
  'cat.table': { id: 'Tampilan Tabel', en: 'Table' },
  'cat.code': { id: 'Kode Barang', en: 'Product Code' },
  'cat.barcode': { id: 'Barcode', en: 'Barcode' },
  'cat.unit': { id: 'Satuan', en: 'Unit' },
  'cat.cost': { id: 'Harga Modal', en: 'Cost Price' },
  'cat.minStock': { id: 'Stok Minimum', en: 'Min. Stock' },
  'cat.sellingPrice': { id: 'Harga Jual', en: 'Selling Price' },
  'cat.variant': { id: 'Varian (ukuran, warna, kemasan)', en: 'Variants (size, color, packaging)' },
  'cat.variantName': { id: 'Nama', en: 'Name' },
  'cat.productName': { id: 'Nama Produk', en: 'Product Name' },
  'cat.categoryLabel': { id: 'Kategori', en: 'Category' },
  'cat.description': { id: 'Deskripsi', en: 'Description' },
  'cat.image': { id: 'Gambar Produk', en: 'Product Image' },
  'cat.activeProduct': { id: 'Produk aktif (tampil di kasir)', en: 'Active product (shown in cashier)' },
  'cat.initialStock': { id: 'Stok Awal', en: 'Initial Stock' },

  // ── Inventori ──
  'invt.title': { id: 'Inventori', en: 'Inventory' },
  'invt.subtitle': { id: 'Pantau stok, pergerakan, dan lakukan penyesuaian.', en: 'Monitor stock, movements, and make adjustments.' },
  'invt.stockTab': { id: 'Stok', en: 'Stock' },
  'invt.movementTab': { id: 'Pergerakan', en: 'Movements' },
  'invt.totalProducts': { id: 'Total Produk', en: 'Total Products' },
  'invt.safeStock': { id: 'Stok Aman', en: 'Healthy Stock' },
  'invt.lowStock': { id: 'Stok Menipis', en: 'Low Stock' },
  'invt.outStock': { id: 'Stok Habis', en: 'Out of Stock' },
  'invt.searchPlaceholder': { id: 'Cari nama atau kode barang...', en: 'Search name or product code...' },
  'invt.adjust': { id: 'Sesuaikan', en: 'Adjust' },
  'invt.movementTime': { id: 'Waktu', en: 'Time' },
  'invt.movementProduct': { id: 'Produk', en: 'Product' },
  'invt.movementType': { id: 'Jenis', en: 'Type' },
  'invt.movementChange': { id: 'Perubahan', en: 'Change' },
  'invt.movementBeforeAfter': { id: 'Sebelum → Sesudah', en: 'Before → After' },
  'invt.movementNote': { id: 'Keterangan', en: 'Note' },
  'invt.noMovement': { id: 'Belum ada pergerakan stok.', en: 'No stock movements yet.' },
  'invt.adjustTitle': { id: 'Sesuaikan Stok', en: 'Adjust Stock' },
  'invt.currentStock': { id: 'stok saat ini', en: 'current stock' },
  'invt.in': { id: 'Masuk', en: 'In' },
  'invt.out': { id: 'Keluar', en: 'Out' },
  'invt.opname': { id: 'Hitung Ulang', en: 'Opname' },
  'invt.damage': { id: 'Rusak', en: 'Damaged' },
  'invt.return': { id: 'Retur', en: 'Return' },
  'invt.actualQty': { id: 'Stok Aktual (hasil hitung)', en: 'Actual Stock (counted)' },
  'invt.qty': { id: 'Jumlah', en: 'Quantity' },
  'invt.notePlaceholder': { id: 'Opsional...', en: 'Optional...' },
  'invt.statusOk': { id: 'Aman', en: 'OK' },
  'invt.statusLow': { id: 'Menipis', en: 'Low' },
  'invt.statusOut': { id: 'Habis', en: 'Out' },

  // ── Laporan ──
  'rpt.title': { id: 'Laporan & Rekap Bulanan', en: 'Reports & Monthly Recap' },
  'rpt.subtitle': { id: 'Ringkasan omzet, laba, dan perbandingan periode.', en: 'Revenue, profit summary, and period comparison.' },
  'rpt.exportCsv': { id: 'Ekspor CSV', en: 'Export CSV' },
  'rpt.grossSales': { id: 'Penjualan Kotor', en: 'Gross Sales' },
  'rpt.netSales': { id: 'Penjualan Bersih', en: 'Net Sales' },
  'rpt.grossProfit': { id: 'Laba Kotor', en: 'Gross Profit' },
  'rpt.netProfit': { id: 'Laba Bersih Operasional', en: 'Net Operating Profit' },
  'rpt.refund': { id: 'Refund', en: 'Refund' },
  'rpt.unitsSold': { id: 'Barang Terjual', en: 'Units Sold' },
  'rpt.transactions': { id: 'Transaksi', en: 'Transactions' },
  'rpt.expenses': { id: 'Pengeluaran', en: 'Expenses' },
  'rpt.dailySales': { id: 'Penjualan Harian', en: 'Daily Sales' },
  'rpt.pnl': { id: 'Ringkasan Laba Rugi', en: 'Profit & Loss Summary' },
  'rpt.discount': { id: 'Diskon', en: 'Discount' },
  'rpt.cogs': { id: 'HPP', en: 'COGS' },
  'rpt.operatingExpense': { id: 'Pengeluaran Operasional', en: 'Operating Expenses' },
  'rpt.vsPrev': { id: 'vs bulan lalu', en: 'vs last month' },

  // ── Pengeluaran ──
  'exp.title': { id: 'Pengeluaran', en: 'Expenses' },
  'exp.subtitle': { id: 'Catat biaya operasional toko.', en: 'Record store operating costs.' },
  'exp.total': { id: 'Total Pengeluaran', en: 'Total Expenses' },
  'exp.date': { id: 'Tanggal', en: 'Date' },
  'exp.category': { id: 'Kategori', en: 'Category' },
  'exp.description': { id: 'Keterangan', en: 'Description' },
  'exp.amount': { id: 'Nominal', en: 'Amount' },
  'exp.from': { id: 'Dari', en: 'From' },
  'exp.to': { id: 'Sampai', en: 'To' },
  'exp.addTitle': { id: 'Tambah Pengeluaran', en: 'Add Expense' },
  'exp.editTitle': { id: 'Ubah Pengeluaran', en: 'Edit Expense' },
  'exp.descPlaceholder': { id: 'Mis. bayar listrik', en: 'e.g. pay electricity' },

  // ── Pelanggan ──
  'cust.title': { id: 'Pelanggan', en: 'Customers' },
  'cust.subtitle': { id: 'Data pelanggan dan riwayat pembelian.', en: 'Customer data and purchase history.' },
  'cust.add': { id: 'Tambah Pelanggan', en: 'Add Customer' },
  'cust.searchPlaceholder': { id: 'Cari nama, telepon, email...', en: 'Search name, phone, email...' },
  'cust.txCount': { id: 'Transaksi', en: 'Transactions' },
  'cust.totalSpend': { id: 'Total Belanja', en: 'Total Spend' },
  'cust.history': { id: 'Riwayat Pembelian', en: 'Purchase History' },
  'cust.noTx': { id: 'Belum ada transaksi.', en: 'No transactions yet.' },
  'cust.name': { id: 'Nama', en: 'Name' },
  'cust.phone': { id: 'Telepon', en: 'Phone' },
  'cust.email': { id: 'Email', en: 'Email' },
  'cust.address': { id: 'Alamat', en: 'Address' },
  'cust.pickHint': { id: 'Pilih pelanggan untuk melihat riwayat.', en: 'Select a customer to view history.' },

  // ── Promo ──
  'promo.title': { id: 'Promo', en: 'Promos' },
  'promo.subtitle': { id: 'Buat diskon nominal atau persentase dengan periode aktif.', en: 'Create nominal or percentage discounts with active period.' },
  'promo.add': { id: 'Tambah Promo', en: 'Add Promo' },
  'promo.name': { id: 'Nama Promo', en: 'Promo Name' },
  'promo.type': { id: 'Tipe', en: 'Type' },
  'promo.percent': { id: 'Persentase (%)', en: 'Percentage (%)' },
  'promo.nominal': { id: 'Nominal (Rp)', en: 'Nominal (IDR)' },
  'promo.value': { id: 'Nilai', en: 'Value' },
  'promo.minPurchase': { id: 'Minimum Belanja (Rp)', en: 'Minimum Purchase (IDR)' },
  'promo.start': { id: 'Mulai', en: 'Start' },
  'promo.end': { id: 'Selesai', en: 'End' },
  'promo.noLimit': { id: 'Tanpa batas waktu', en: 'No time limit' },
  'promo.deactivate': { id: 'Nonaktifkan', en: 'Deactivate' },
  'promo.activate': { id: 'Aktifkan', en: 'Activate' },
  'promo.empty': { id: 'Belum ada promo', en: 'No promos yet' },

  // ── Shift ──
  'shift.title': { id: 'Shift Kasir', en: 'Cashier Shifts' },
  'shift.subtitle': { id: 'Buka/tutup shift, modal awal, dan rekonsiliasi kas.', en: 'Open/close shift, starting cash, and cash reconciliation.' },
  'shift.open': { id: 'Buka Shift', en: 'Open Shift' },
  'shift.close': { id: 'Tutup Shift', en: 'Close Shift' },
  'shift.active': { id: 'Shift Aktif', en: 'Active Shift' },
  'shift.openingCash': { id: 'Modal Awal', en: 'Opening Cash' },
  'shift.cashSales': { id: 'Penjualan Tunai', en: 'Cash Sales' },
  'shift.cashIn': { id: 'Kas Masuk', en: 'Cash In' },
  'shift.cashOut': { id: 'Kas Keluar', en: 'Cash Out' },
  'shift.expectedCash': { id: 'Kas Seharusnya', en: 'Expected Cash' },
  'shift.actualCash': { id: 'Kas Aktual', en: 'Actual Cash' },
  'shift.difference': { id: 'Selisih', en: 'Difference' },
  'shift.history': { id: 'Riwayat Shift', en: 'Shift History' },
  'shift.cashier': { id: 'Kasir', en: 'Cashier' },
  'shift.openTime': { id: 'Buka', en: 'Open' },
  'shift.closeTime': { id: 'Tutup', en: 'Close' },
  'shift.running': { id: 'Berjalan', en: 'Running' },
  'shift.finished': { id: 'Selesai', en: 'Finished' },
  'shift.empty': { id: 'Belum ada shift.', en: 'No shifts yet.' },

  // ── Pengaturan ──
  'set.title': { id: 'Pengaturan', en: 'Settings' },
  'set.subtitle': { id: 'Konfigurasi toko, pajak, struk, dan pembayaran.', en: 'Configure store, tax, receipt, and payments.' },
  'set.syncTitle': { id: 'Sinkron Produk Antar-Outlet', en: 'Sync Products Between Outlets' },
  'set.syncDesc': { id: 'Salin katalog produk (nama, varian, harga, kategori, SKU) dari outlet sumber ke outlet tujuan. Stok, transaksi, pelanggan, pengeluaran, dan nama outlet tidak ikut tersinkron. Produk yang belum ada dibuat baru dengan stok 0.', en: 'Copy the product catalog (name, variants, price, category, SKU) from source to target outlet. Stock, transactions, customers, expenses, and outlet name are NOT synced. Missing products are created with stock 0.' },
  'set.sourceOutlet': { id: 'Outlet Sumber', en: 'Source Outlet' },
  'set.targetOutlet': { id: 'Outlet Tujuan', en: 'Target Outlet' },
  'set.syncBtn': { id: 'Sinkron Produk', en: 'Sync Products' },
  'set.taxTitle': { id: 'Pajak & Biaya Layanan', en: 'Tax & Service Charge' },
  'set.taxRate': { id: 'Tarif Pajak (%)', en: 'Tax Rate (%)' },
  'set.serviceRate': { id: 'Biaya Layanan (%)', en: 'Service Charge (%)' },
  'set.taxIncluded': { id: 'Harga produk sudah termasuk pajak', en: 'Product prices already include tax' },
  'set.roundingTo': { id: 'Pembulatan ke (Rp)', en: 'Round to (IDR)' },
  'set.receiptTitle': { id: 'Struk & Penomoran', en: 'Receipt & Numbering' },
  'set.orderPrefix': { id: 'Format Nomor Transaksi (prefix)', en: 'Transaction Number Format (prefix)' },
  'set.receiptHeader': { id: 'Header Struk', en: 'Receipt Header' },
  'set.receiptFooter': { id: 'Footer Struk', en: 'Receipt Footer' },
  'set.paymentTitle': { id: 'Metode Pembayaran', en: 'Payment Methods' },
  'set.paymentHint': { id: 'Metode aktif akan muncul di halaman kasir.', en: 'Active methods appear on the cashier page.' },
  'set.tzTitle': { id: 'Zona Waktu & Notifikasi', en: 'Timezone & Notifications' },
  'set.tz': { id: 'Zona Waktu Toko', en: 'Store Timezone' },
  'set.lowStockThreshold': { id: 'Batas Stok Minimum Default', en: 'Default Low Stock Threshold' },
  'set.notifStock': { id: 'Tampilkan notifikasi stok menipis', en: 'Show low-stock notifications' },

  // ── Outlet & Tim ──
  'staff.title': { id: 'Outlet & Tim', en: 'Outlets & Team' },
  'staff.subtitle': { id: 'Kelola outlet, akun owner/kasir, dan hak akses tiap staff.', en: 'Manage outlets, owner/cashier accounts, and access rights.' },
  'staff.tabTeam': { id: 'Tim & Akses', en: 'Team & Access' },
  'staff.tabOutlet': { id: 'Outlet', en: 'Outlets' },
  'staff.addOutlet': { id: 'Tambah Outlet', en: 'Add Outlet' },
  'staff.addOwner': { id: 'Tambah Owner', en: 'Add Owner' },
  'staff.addStaff': { id: 'Tambah Staff', en: 'Add Staff' },
  'staff.ownerSection': { id: 'Owner / Admin', en: 'Owner / Admin' },
  'staff.cashierSection': { id: 'Kasir', en: 'Cashiers' },
  'staff.fullAccess': { id: 'Akses Penuh', en: 'Full Access' },
  'staff.active': { id: 'Aktif', en: 'Active' },
  'staff.outletActive': { id: 'Outlet Aktif', en: 'Active Outlet' },
  'staff.staffName': { id: 'Nama Staff', en: 'Staff Name' },
  'staff.ownerName': { id: 'Nama Owner', en: 'Owner Name' },
  'staff.outletName': { id: 'Nama Outlet', en: 'Outlet Name' },
  'staff.accessOutlets': { id: 'Outlet yang Bisa Diakses', en: 'Accessible Outlets' },
  'staff.accessHint': { id: 'Kasir dapat berpindah outlet di antara outlet yang dipilih.', en: 'Cashier can switch between the selected outlets.' },
  'staff.menuAccess': { id: 'Hak Akses Menu', en: 'Menu Access' },
  'staff.noCashier': { id: 'Belum Ada Akun Kasir', en: 'No Cashier Accounts Yet' },
  'staff.noCashierHint': { id: 'Klik "Tambah Staff" untuk membuat akun kasir baru dan mengatur hak aksesnya.', en: 'Click "Add Staff" to create a cashier account and set its access.' },
  'staff.noOutlet': { id: 'Belum ada outlet.', en: 'No outlets yet.' },
  'staff.address': { id: 'Alamat (opsional)', en: 'Address (optional)' },
  'staff.phone': { id: 'Telepon (opsional)', en: 'Phone (optional)' },

  // ── Login ──
  'login.appName': { id: 'KasirToko', en: 'KasirToko' },
  'login.subtitle': { id: 'Pusat Kendali POS', en: 'POS Command Center' },
  'login.emailPlaceholder': { id: 'contoh: manager@toko.com', en: 'e.g. manager@store.com' },
  'login.passwordPlaceholder': { id: 'Kata sandi', en: 'Password' },
};

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'id',
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'en' ? 'en' : 'id';
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  };

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const t = (key: string): string => {
    const entry = dict[key];
    if (!entry) return key;
    return entry[lang] ?? entry.id;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
