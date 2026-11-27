export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  cost?: number;
  stock_quantity: number;
}

export interface Product {
  id: string;
  created_at?: string;
  updated_at?: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock_status: string;
  stock_quantity: number;
  store_id: number;
  // Extended fields (optional for backward compatibility)
  sku?: string;
  barcode?: string;
  unit?: string;          // satuan: pcs, kg, porsi, dll
  cost?: number;          // harga modal / HPP per unit
  active?: boolean;       // status aktif
  min_stock?: number;     // batas stok minimum
  variants?: ProductVariant[];
}

export interface TransactionItem {
  name: string;
  price: number;
  quantity: number;
  category?: string;
  note?: string;
  product_id?: string;
  sku?: string;
  cost?: number;          // snapshot HPP saat transaksi
  discount?: number;      // diskon per item (nominal)
  variant_name?: string;
}

export interface Transaction {
  id: string;
  created_at?: string;
  order_id: string;
  customer_name: string;
  customer_email?: string;
  customer_id?: string;
  cashier_name?: string;
  cashier_id?: string;
  subtotal?: number;
  discount?: number;        // diskon transaksi (nominal)
  tax?: number;             // pajak
  service_charge?: number;  // biaya layanan
  rounding?: number;        // pembulatan
  total_amount: number;
  cogs?: number;            // total HPP saat transaksi (snapshot)
  payment_method: string;
  order_type?: string;      // dine-in / takeaway / retail
  status: string;           // Success | Pending | Refunded | Cancelled
  paid_amount?: number;
  change_amount?: number;
  refunded_amount?: number;
  items: TransactionItem[];
  store_id: number;
  shift_id?: string;
}

export interface StockMovement {
  id: string;
  created_at?: string;
  product_id: string;
  product_name: string;
  variant_id?: string;
  type: 'in' | 'out' | 'adjustment' | 'opname' | 'damage' | 'return' | 'transfer_in' | 'transfer_out' | 'sale';
  quantity: number;         // perubahan (negatif = keluar)
  stock_before: number;
  stock_after: number;
  reason?: string;
  reference?: string;       // mis. order_id / transfer id
  store_id: number;
  user_name?: string;
}

export interface Expense {
  id: string;
  created_at?: string;
  date: string;             // yyyy-mm-dd
  category: string;
  amount: number;
  description: string;
  attachment_url?: string;
  store_id: number;
  user_name?: string;
}

export interface Customer {
  id: string;
  created_at?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  points?: number;          // poin loyalitas (opsional)
  discount_percent?: number; // diskon khusus pelanggan (%) — otomatis di kasir
  store_id: number;
}

export interface Promo {
  id: string;
  created_at?: string;
  name: string;
  code?: string;
  type: 'nominal' | 'percentage';
  value: number;
  min_purchase?: number;
  start_date?: string;
  end_date?: string;
  active: boolean;
  store_id: number;
}

export interface Shift {
  id: string;
  created_at?: string;
  opened_at: string;
  closed_at?: string;
  cashier_id?: string;
  cashier_name: string;
  opening_cash: number;
  closing_cash_actual?: number;
  cash_in?: number;         // kas masuk selain penjualan
  cash_out?: number;        // kas keluar
  expected_cash?: number;
  difference?: number;      // selisih
  status: 'open' | 'closed';
  note?: string;
  store_id: number;
}

export interface Refund {
  id: string;
  created_at?: string;
  transaction_id: string;
  order_id: string;
  type: 'full' | 'partial';
  amount: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  reason: string;
  restock: boolean;
  user_name?: string;
  store_id: number;
}

export interface Debt {
  id: string;
  created_at?: string;
  customer_id?: string;
  customer_name: string;
  transaction_id?: string;
  order_id?: string;
  amount: number;         // total utang awal
  paid_amount: number;    // sudah dibayar
  status: 'unpaid' | 'partial' | 'paid';
  note?: string;
  due_date?: string;
  store_id: number;
  user_name?: string;
}

export interface DebtPayment {
  id: string;
  created_at?: string;
  debt_id: string;
  amount: number;
  note?: string;
  user_name?: string;
  store_id: number;
}

export interface StoreSettings {
  store_id: number;
  tax_rate: number;             // persen, mis. 11
  tax_included: boolean;        // harga sudah termasuk pajak
  service_charge_rate: number;  // persen
  rounding: number;             // pembulatan ke (mis. 100)
  timezone: string;             // mis. Asia/Jakarta
  receipt_header?: string;
  receipt_footer?: string;
  order_prefix?: string;        // mis. ORD
  low_stock_threshold: number;
  payment_methods: string[];
  notification_stock: boolean;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  store_id: 0,
  tax_rate: 11,
  tax_included: true,
  service_charge_rate: 0,
  rounding: 0,
  timezone: 'Asia/Jakarta',
  receipt_header: '',
  receipt_footer: 'Terima kasih atas kunjungan Anda',
  order_prefix: 'ORD',
  low_stock_threshold: 5,
  payment_methods: ['Cash', 'QRIS', 'Transfer', 'Kasbon'],
  notification_stock: true,
};

export interface Cashier {
  id: string;
  name: string;
  email: string;
  password: string;
  store_id: number;          // outlet utama
  store_ids?: number[];      // outlet yang boleh diakses (multi-outlet)
  created_at?: string;
  permissions?: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'cashier';
  store_id: number;          // outlet utama
  store_ids?: number[];      // daftar outlet yang boleh diakses
  name?: string;
  permissions?: string[];
}

/** Stok produk per outlet (satu katalog, stok terpisah tiap outlet). */
export interface ProductStock {
  product_id: string;
  store_id: number;
  stock_quantity: number;
  stock_status: string;
  min_stock?: number;
}

// Menu keys that can be granted/revoked per staff (admin always has all).
export const PERMISSION_OPTIONS: { key: string; label: string; description: string }[] = [
  { key: 'dashboard', label: 'Ringkasan',  description: 'Ringkasan bisnis & statistik' },
  { key: 'pos',       label: 'Kasir',      description: 'Proses transaksi penjualan' },
  { key: 'invoices',  label: 'Penjualan',  description: 'Riwayat & cetak ulang struk' },
  { key: 'catalog',   label: 'Produk',     description: 'Kelola produk & kategori' },
  { key: 'inventory', label: 'Inventori',  description: 'Pergerakan & penyesuaian stok' },
  { key: 'promos',    label: 'Promo',      description: 'Kelola promo & diskon' },
  { key: 'customers', label: 'Pelanggan',  description: 'Data & riwayat pelanggan' },
  { key: 'shifts',    label: 'Shift Kasir',description: 'Buka/tutup shift & kas' },
  { key: 'sales',     label: 'Laporan',    description: 'Laporan penjualan & ekspor' },
  { key: 'expenses',  label: 'Pengeluaran',description: 'Catat biaya operasional' },
  { key: 'settings',  label: 'Pengaturan', description: 'Pengaturan toko & sistem' },
  { key: 'staff',     label: 'Outlet & Tim', description: 'Kelola akun & hak akses' },
];

export const DEFAULT_CASHIER_PERMISSIONS = ['pos', 'invoices'];

export interface Store {
  id: number;
  name: string;
  code: string;
  avatar_url?: string;
  address?: string;
  phone?: string;
  tax_id?: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  store_id: number;
  created_at?: string;
}

export const EXPENSE_CATEGORIES = [
  'Gaji & Upah',
  'Sewa',
  'Listrik & Air',
  'Internet & Telepon',
  'Pembelian Bahan',
  'Transportasi',
  'Peralatan',
  'Pemasaran',
  'Lain-lain',
];

export const ORDER_TYPES = ['Dine-in', 'Takeaway', 'Retail', 'Delivery'];
