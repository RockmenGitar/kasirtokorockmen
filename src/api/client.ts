import { createClient } from '@supabase/supabase-js';
import type { Store, Category, Product, Transaction, UserProfile, Cashier } from './types';

const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(
  envUrl &&
  envKey &&
  !envUrl.includes('your-project-id') &&
  !envKey.includes('your-supabase-anon-key')
);

export const supabase = isSupabaseConfigured
  ? createClient(envUrl, envKey)
  : null;

// ── Mock seed data for localStorage demo mode ──────────────────────────────

const defaultStores: Store[] = [
  { id: 1, name: 'Rockmen Gitarku', code: 'rockmenpemogan' },
  { id: 2, name: 'Rockmen Gitarku', code: 'rockmenbali' }
];

const defaultCategories: Category[] = [
  { id: 'cat-1', name: 'Gitar',           emoji: '🎸', store_id: 1 },
  { id: 'cat-2', name: 'Gitar Custom',    emoji: '🎸', store_id: 1 },
  { id: 'cat-3', name: 'Senar Gitar',     emoji: '🎼', store_id: 1 },
  { id: 'cat-4', name: 'Aksesoris Gitar', emoji: '🎵', store_id: 1 },
  { id: 'cat-5', name: 'Gitar',           emoji: '🎸', store_id: 2 },
  { id: 'cat-6', name: 'Gitar Custom',    emoji: '🎸', store_id: 2 },
  { id: 'cat-7', name: 'Senar Gitar',     emoji: '🎼', store_id: 2 },
  { id: 'cat-8', name: 'Aksesoris Gitar', emoji: '🎵', store_id: 2 },
];

// Catalogue: same product names both outlets, but each outlet holds its own stock.
type SeedProduct = Omit<Product, 'id' | 'store_id' | 'stock_quantity' | 'stock_status'> & { key: string };
const seedCatalogue: SeedProduct[] = [
  { key: 'g-acoustic', name: 'Gitar Akustik APX 500 II',    description: 'Gitar akustik elegan dengan suara jernih.',  price: 600000,  image_url: '', category: 'Gitar',           cost: 420000,  unit: 'pcs', sku: 'GT-APX500', barcode: '8991001', min_stock: 2 },
  { key: 'g-electric', name: 'Gitar Elektrik Stratocaster', description: 'Gitar elektrik single coil, cocok untuk segala genre.', price: 2500000, image_url: '', category: 'Gitar',    cost: 1850000, unit: 'pcs', sku: 'GT-STRAT', barcode: '8991002', min_stock: 1 },
  { key: 'g-classic',  name: 'Gitar Klasik Yamaha C40',     description: 'Gitar klasik senar nilon untuk pemula.',     price: 950000,  image_url: '', category: 'Gitar',           cost: 700000,  unit: 'pcs', sku: 'GT-C40',    barcode: '8991003', min_stock: 2 },
  { key: 'g-custom-1', name: 'Gitar Custom Rockmen Series',  description: 'Gitar custom handcrafted, finish premium.',  price: 4500000, image_url: '', category: 'Gitar Custom',    cost: 3200000, unit: 'pcs', sku: 'GT-CUSTOM-RM', barcode: '8992001', min_stock: 1 },
  { key: 'g-custom-2', name: 'Gitar Custom Bali Carving',    description: 'Gitar custom ukiran khas Bali.',             price: 5500000, image_url: '', category: 'Gitar Custom',    cost: 4000000, unit: 'pcs', sku: 'GT-CUSTOM-BL', barcode: '8992002', min_stock: 1 },
  { key: 's-string-1', name: 'Senar Gitar Akustik Set',       description: 'Satu set senar akustik gauge 12-53.',        price: 85000,   image_url: '', category: 'Senar Gitar',     cost: 55000,   unit: 'set', sku: 'SR-ACOU',  barcode: '8993001', min_stock: 10 },
  { key: 's-string-2', name: 'Senar Gitar Elektrik Set',      description: 'Satu set senar elektrik gauge 09-42.',       price: 95000,   image_url: '', category: 'Senar Gitar',     cost: 62000,   unit: 'set', sku: 'SR-ELEC',  barcode: '8993002', min_stock: 10 },
  { key: 's-string-3', name: 'Senar Gitar Ecer (per buah)',   description: 'Senar gitar satuan, berbagai ukuran.',       price: 15000,   image_url: '', category: 'Senar Gitar',     cost: 8000,    unit: 'pcs', sku: 'SR-ECER',  barcode: '8993003', min_stock: 20 },
  { key: 'a-pick',     name: 'Pick Gitar (isi 10)',           description: 'Pick gitar tebal, paket isi 10.',            price: 25000,   image_url: '', category: 'Aksesoris Gitar', cost: 12000,   unit: 'pack', sku: 'AK-PICK10', barcode: '8994001', min_stock: 15 },
  { key: 'a-capo',     name: 'Capo Gitar',                     description: 'Capo logam anti karat.',                     price: 65000,   image_url: '', category: 'Aksesoris Gitar', cost: 35000,   unit: 'pcs', sku: 'AK-CAPO',   barcode: '8994002', min_stock: 8 },
  { key: 'a-tuner',    name: 'Tuner Elektronik',              description: 'Tuner clip-on dengan layar LCD.',            price: 75000,   image_url: '', category: 'Aksesoris Gitar', cost: 40000,   unit: 'pcs', sku: 'AK-TUNER',  barcode: '8994003', min_stock: 8 },
  { key: 'a-strap',    name: 'Strap Gitar Kulit',             description: 'Strap gitar kulit asli, nyaman.',            price: 120000,  image_url: '', category: 'Aksesoris Gitar', cost: 70000,   unit: 'pcs', sku: 'AK-STRAP',  barcode: '8994004', min_stock: 6 },
  { key: 'a-bag',      name: 'Tas Gitar Padded',              description: 'Gig bag berlapis busa pelindung.',           price: 185000,  image_url: '', category: 'Aksesoris Gitar', cost: 110000,  unit: 'pcs', sku: 'AK-BAG',    barcode: '8994005', min_stock: 5 },
  { key: 'a-cable',    name: 'Kabel Jack Gitar 3m',           description: 'Kabel instrumen 3 meter kualitas pro.',      price: 55000,   image_url: '', category: 'Aksesoris Gitar', cost: 30000,   unit: 'pcs', sku: 'AK-CABLE',  barcode: '8994006', min_stock: 10 },
];

const stockForStore: Record<number, Record<string, number>> = {
  1: { 'g-acoustic': 12, 'g-electric': 5, 'g-classic': 8, 'g-custom-1': 3, 'g-custom-2': 2, 's-string-1': 40, 's-string-2': 35, 's-string-3': 120, 'a-pick': 60, 'a-capo': 25, 'a-tuner': 20, 'a-strap': 15, 'a-bag': 10, 'a-cable': 30 },
  2: { 'g-acoustic': 7,  'g-electric': 3, 'g-classic': 4, 'g-custom-1': 1, 'g-custom-2': 1, 's-string-1': 22, 's-string-2': 18, 's-string-3': 75,  'a-pick': 30, 'a-capo': 12, 'a-tuner': 9,  'a-strap': 6,  'a-bag': 4,  'a-cable': 14 },
};

const defaultProducts: Product[] = [1, 2].flatMap(storeId =>
  seedCatalogue.map(sp => {
    const qty = stockForStore[storeId][sp.key] ?? 0;
    const status = qty <= 0 ? 'Out of Stock' : qty <= (sp.min_stock ?? 5) ? 'Low Stock' : 'In Stock';
    const { key, ...rest } = sp;
    return {
      ...rest,
      id: `p${storeId}-${key}`,
      store_id: storeId,
      stock_quantity: qty,
      stock_status: status,
      active: true,
      image_url: '',
    } as Product;
  })
);

// Build fake sales: a batch today and a batch in the previous month, per outlet.
function buildSeedTransactions(products: Product[]): Transaction[] {
  const byKey = new Map<string, Product>();
  products.forEach(p => byKey.set(`${p.store_id}:${p.name}`, p));

  const TxProduct = [
    'Gitar Akustik APX 500 II', 'Gitar Elektrik Stratocaster', 'Gitar Klasik Yamaha C40',
    'Gitar Custom Rockmen Series', 'Gitar Custom Bali Carving',
    'Senar Gitar Akustik Set', 'Senar Gitar Elektrik Set', 'Senar Gitar Ecer (per buah)',
    'Pick Gitar (isi 10)', 'Capo Gitar', 'Tuner Elektronik', 'Strap Gitar Kulit',
    'Tas Gitar Padded', 'Kabel Jack Gitar 3m',
  ];
  const methods = ['Cash', 'QRIS', 'Transfer'];
  const customers = ['Andi', 'Budi', 'Citra', 'Dewi', 'Eko', 'Fajar', 'Gita', 'Hendra', 'Umum'];

  const tx: Transaction[] = [];
  let counter = 1;
  let seed = 12345;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  const makeBatch = (storeId: number, baseDate: Date, count: number) => {
    for (let i = 0; i < count; i++) {
      const dayOffset = Math.floor(rand() * 27);
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - dayOffset);
      d.setHours(9 + Math.floor(rand() * 10), Math.floor(rand() * 60), 0, 0);

      const itemCount = 1 + Math.floor(rand() * 3);
      const items = [];
      let total = 0;
      let cogs = 0;
      for (let j = 0; j < itemCount; j++) {
        const name = TxProduct[Math.floor(rand() * TxProduct.length)];
        const prod = byKey.get(`${storeId}:${name}`);
        if (!prod) continue;
        const qty = 1 + Math.floor(rand() * 3);
        total += prod.price * qty;
        cogs += (prod.cost ?? 0) * qty;
        items.push({ name: prod.name, price: prod.price, quantity: qty, category: prod.category, product_id: prod.id, sku: prod.sku, cost: prod.cost ?? 0 });
      }
      if (items.length === 0) continue;

      const tax = Math.round(total - total / 1.11);
      const method = methods[Math.floor(rand() * methods.length)];
      tx.push({
        id: `seed-t${counter}`,
        order_id: `#ORD-${String(5000 + counter).padStart(4, '0')}`,
        customer_name: customers[Math.floor(rand() * customers.length)],
        cashier_name: storeId === 1 ? 'Dave 1' : 'Dave 2',
        subtotal: total - tax,
        tax,
        total_amount: total,
        cogs,
        payment_method: method,
        status: 'Success',
        paid_amount: method === 'Cash' ? total : total,
        change_amount: 0,
        items,
        store_id: storeId,
        created_at: d.toISOString(),
      });
      counter++;
    }
  };

  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 20);

  [1, 2].forEach(storeId => {
    makeBatch(storeId, new Date(now), 8);              // hari ini (beberapa hari terakhir)
    makeBatch(storeId, prevMonth, 14);                 // bulan lalu
  });

  return tx;
}

const defaultTransactions: Transaction[] = buildSeedTransactions(defaultProducts);

// Demo-mode login accounts. Default passwords: owner = admin123, kasir = kasir123
const defaultProfiles: (UserProfile & { password: string })[] = [
  { id: 'admin-1', email: 'owner@rockmen.com', role: 'admin', store_id: 1, name: 'Owner Rockmen Pemogan', password: 'admin123' },
  { id: 'admin-2', email: 'dave@rockmen.com', role: 'admin', store_id: 2, name: 'Dave Rockmen Bali', password: 'admin123' },
];

const defaultCashiers: Cashier[] = [
  { id: 'cashier-1', name: 'Dave 1', email: 'dave@rockmen.com', password: 'kasir123', store_id: 1 },
  { id: 'cashier-2', name: 'Dave 2', email: 'dave2@rockmen.com', password: 'kasir123', store_id: 2 },
];

// Bump this when seed data changes to refresh stale demo data in existing browsers.
const SEED_VERSION = '6';
const SEED_VERSION_KEY = 'kasirnya_seed_version';

// Seed localStorage with mock data (demo mode only)
const initializeLocalStorage = () => {
  const currentVersion = localStorage.getItem(SEED_VERSION_KEY);
  const isFresh = !localStorage.getItem('kasirnya_initialized_relational');

  // Re-seed when first run OR when the seed version changed (clears stale demo data).
  if (isFresh || currentVersion !== SEED_VERSION) {
    localStorage.setItem('kasirnya_stores',       JSON.stringify(defaultStores));
    localStorage.setItem('kasirnya_products',     JSON.stringify(defaultProducts));
    localStorage.setItem('kasirnya_transactions', JSON.stringify(defaultTransactions));
    localStorage.setItem('kasirnya_categories',   JSON.stringify(defaultCategories));
    localStorage.setItem('kasirnya_profiles',     JSON.stringify(defaultProfiles));
    localStorage.setItem('kasirnya_cashiers',     JSON.stringify(defaultCashiers));
    localStorage.setItem('kasirnya_initialized_relational', 'true');
    localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    // Clear cached queries so stale demo data doesn't linger.
    localStorage.removeItem('kasirnya_cache_v1');
    // Reset any previously selected outlet.
    localStorage.removeItem('kasirnya_active_store');
  }

  // Always ensure demo login accounts exist
  if (!localStorage.getItem('kasirnya_profiles')) {
    localStorage.setItem('kasirnya_profiles', JSON.stringify(defaultProfiles));
  }
  if (!localStorage.getItem('kasirnya_cashiers')) {
    localStorage.setItem('kasirnya_cashiers', JSON.stringify(defaultCashiers));
  }
};

if (!isSupabaseConfigured) initializeLocalStorage();
