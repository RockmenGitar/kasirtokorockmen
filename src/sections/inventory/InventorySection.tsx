import { useMemo, useState } from 'react';
import { Boxes, AlertTriangle, XCircle, ArrowUpCircle, Settings2, Loader2, Search, History } from 'lucide-react';
import { dbService } from '../../lib/db';
import type { Product, StockMovement, StoreSettings, UserProfile } from '../../lib/db';
import { useStoreData } from '../../hooks/useStoreData';

interface InventorySectionProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
  currentUser: UserProfile;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));

const MOVEMENT_LABELS: Record<StockMovement['type'], string> = {
  in: 'Stok Masuk',
  out: 'Stok Keluar',
  adjustment: 'Penyesuaian',
  opname: 'Stok Opname',
  damage: 'Barang Rusak',
  return: 'Retur',
  transfer_in: 'Transfer Masuk',
  transfer_out: 'Transfer Keluar',
  sale: 'Penjualan',
};

export default function InventorySection({ storeId, refreshTrigger, triggerRefresh, currentUser }: InventorySectionProps) {
  const [products] = useStoreData<Product[]>(dbService.getProducts, storeId, refreshTrigger, []);
  const [movements] = useStoreData<StockMovement[]>(dbService.getMovements, storeId, refreshTrigger, []);

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [tab, setTab] = useState<'stock' | 'movements'>('stock');
  const [search, setSearch] = useState('');
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);

  useMemo(() => { dbService.getSettings(storeId).then(setSettings).catch(() => {}); }, [storeId]);
  const threshold = settings?.low_stock_threshold ?? 5;

  const stats = useMemo(() => {
    const inStock = products.filter(p => p.stock_quantity > threshold).length;
    const low = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= threshold).length;
    const out = products.filter(p => p.stock_quantity <= 0).length;
    return { inStock, low, out, total: products.length };
  }, [products, threshold]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products
      .filter(p => !q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q))
      .sort((a, b) => a.stock_quantity - b.stock_quantity);
  }, [products, search]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-slate-800 text-xl leading-none">Inventori</h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">Pantau stok, pergerakan, dan lakukan penyesuaian.</p>
        </div>
        <div className="flex gap-1.5 bg-slate-50 border border-slate-100 p-0.5 rounded-2xl">
          <button onClick={() => setTab('stock')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${tab === 'stock' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Stok</button>
          <button onClick={() => setTab('movements')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${tab === 'movements' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Pergerakan</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Boxes} label="Total Produk" value={String(stats.total)} color="indigo" />
        <StatCard icon={ArrowUpCircle} label="Stok Aman" value={String(stats.inStock)} color="emerald" />
        <StatCard icon={AlertTriangle} label="Stok Menipis" value={String(stats.low)} color="amber" />
        <StatCard icon={XCircle} label="Stok Habis" value={String(stats.out)} color="rose" />
      </div>

      {tab === 'stock' ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, SKU, atau barcode..."
                className="w-full bg-slate-50 border border-slate-150 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-50">
                  <th className="text-left font-bold px-4 py-3">Produk</th>
                  <th className="text-left font-bold px-4 py-3">SKU</th>
                  <th className="text-right font-bold px-4 py-3">Stok</th>
                  <th className="text-left font-bold px-4 py-3">Status</th>
                  <th className="text-right font-bold px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-xs font-semibold">Belum ada produk.</td></tr>
                ) : filteredProducts.map(p => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-700">{p.name}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{p.sku || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(p.stock_quantity)} <span className="text-slate-400 font-medium text-xs">{p.unit || ''}</span></td>
                    <td className="px-4 py-3"><StockBadge qty={p.stock_quantity} threshold={threshold} /></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setAdjustTarget(p)} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
                        <Settings2 className="h-3.5 w-3.5" /> Sesuaikan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-50">
                  <th className="text-left font-bold px-4 py-3">Waktu</th>
                  <th className="text-left font-bold px-4 py-3">Produk</th>
                  <th className="text-left font-bold px-4 py-3">Jenis</th>
                  <th className="text-right font-bold px-4 py-3">Perubahan</th>
                  <th className="text-right font-bold px-4 py-3">Sebelum → Sesudah</th>
                  <th className="text-left font-bold px-4 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-xs font-semibold">
                    <History className="h-6 w-6 mx-auto mb-2 text-slate-200" />
                    Belum ada pergerakan stok.
                  </td></tr>
                ) : movements.map(m => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(m.created_at || '').toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{m.product_name}</td>
                    <td className="px-4 py-3"><span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">{MOVEMENT_LABELS[m.type] ?? m.type}</span></td>
                    <td className={`px-4 py-3 text-right font-extrabold ${m.quantity >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{m.quantity >= 0 ? '+' : ''}{fmt(m.quantity)}</td>
                    <td className="px-4 py-3 text-right text-slate-500 text-xs">{fmt(m.stock_before)} → {fmt(m.stock_after)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{m.reason || m.reference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adjustTarget && (
        <AdjustStockModal
          product={adjustTarget}
          userName={currentUser.name || currentUser.email}
          threshold={threshold}
          onClose={() => setAdjustTarget(null)}
          onDone={() => { setAdjustTarget(null); triggerRefresh?.(); }}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const map: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${map[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-extrabold text-slate-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}

function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  if (qty <= 0) return <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">Habis</span>;
  if (qty <= threshold) return <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">Menipis</span>;
  return <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">Aman</span>;
}

function AdjustStockModal({ product, userName, threshold, onClose, onDone }: {
  product: Product; userName: string; threshold: number;
  onClose: () => void; onDone: () => void;
}) {
  const [mode, setMode] = useState<StockMovement['type']>('in');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const modes: { id: StockMovement['type']; label: string }[] = [
    { id: 'in', label: 'Masuk' },
    { id: 'out', label: 'Keluar' },
    { id: 'opname', label: 'Opname' },
    { id: 'damage', label: 'Rusak' },
    { id: 'return', label: 'Retur' },
  ];

  const submit = async () => {
    const n = Number(qty);
    if (!n || n < 0) { setError('Jumlah tidak valid.'); return; }
    setSaving(true);
    setError('');
    try {
      if (mode === 'opname') {
        await dbService.setStock({ product, newQuantity: n, reason: reason || 'Stok opname', user_name: userName, threshold });
      } else {
        const delta = (mode === 'in' || mode === 'return') ? n : -n;
        await dbService.recordMovement({
          product, type: mode, quantity: delta,
          reason: reason || MOVEMENT_LABELS[mode], user_name: userName, threshold,
        });
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
        <h3 className="font-extrabold text-slate-800 text-base">Sesuaikan Stok</h3>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{product.name} · stok saat ini {fmt(product.stock_quantity)}</p>

        <div className="flex flex-wrap gap-1.5 mt-4">
          {modes.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${mode === m.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{m.label}</button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{mode === 'opname' ? 'Stok Aktual (hasil hitung)' : 'Jumlah'}</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0"
              className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Keterangan</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Opsional..."
              className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        {error && <p className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5 mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} disabled={saving} className="px-4 py-2.5 rounded-xl text-[11px] font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 cursor-pointer">Batal</button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
