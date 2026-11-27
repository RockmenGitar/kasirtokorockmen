import { useMemo, useRef, useState } from 'react';
import { Trash2, Loader2, Search, Camera, Save, PackagePlus, AlertCircle, Check } from 'lucide-react';
import { dbService } from '../../lib/db';
import type { Product, UserProfile, Store } from '../../lib/db';
import { useI18n } from '../../lib/i18n';
import { useBarcodeScanner } from '../../lib/barcode/useBarcodeScanner';
import { findByBarcode } from '../../lib/barcode/lookup';
import { beepSuccess, beepError } from '../../lib/barcode/beep';
import BarcodeScannerModal from '../../components/modal/BarcodeScannerModal';
import HelpBadge from '../../components/ui/HelpBadge';

interface StockReceiveProps {
  storeId: number;
  products: Product[];
  currentUser: UserProfile;
  store?: Store | null;
  onDone: () => void;
}

interface Line {
  key: string;           // product_id + variant_id
  product_id: string;
  product_name: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  stock_now: number;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));

export default function StockReceive({ storeId, products, currentUser, store, onDone }: StockReceiveProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Varian perlu dipilih: daftar kandidat
  const [variantPicker, setVariantPicker] = useState<Product | null>(null);

  const qtyRef = useRef<HTMLInputElement>(null);
  const batchIdRef = useRef<string>('');

  // Hasil pencarian teks (nama/barcode/SKU)
  const searchResults = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return products
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.variants || []).some(v =>
          (v.sku || '').toLowerCase().includes(q) ||
          (v.barcode || '').toLowerCase().includes(q) ||
          v.name.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [products, query]);

  const resetBatch = () => {
    setLines([]);
    setNote('');
    setError('');
    setSuccess(false);
    batchIdRef.current = '';
  };

  const addLine = (product: Product, variant?: { id: string; name: string; stock_quantity: number }) => {
    const key = variant ? `${product.id}::${variant.id}` : product.id;
    const stockNow = variant ? variant.stock_quantity : product.stock_quantity;
    setLines(prev => {
      const existing = prev.find(l => l.key === key);
      if (existing) {
        return prev.map(l => l.key === key ? { ...l, quantity: l.quantity + 1 } : l);
      }
      return [...prev, {
        key,
        product_id: product.id,
        product_name: product.name,
        variant_id: variant?.id,
        variant_name: variant?.name,
        quantity: 1,
        stock_now: stockNow,
      }];
    });
    beepSuccess();
    setQuery('');
    setTimeout(() => qtyRef.current?.focus(), 50);
  };

  // Tangani scan: cari exact barcode/SKU. Bila produk punya >1 varian & scan tidak menunjuk varian tertentu → minta pilih.
  const handleScan = (code: string) => {
    const match = findByBarcode(products, code);
    if (!match) {
      beepError();
      setError(`Barcode "${code}" tidak dikenal. Cari manual di kolom pencarian.`);
      return;
    }
    setError('');
    if (match.variant) {
      addLine(match.product, match.variant);
    } else if ((match.product.variants?.length ?? 0) > 0) {
      // Scan produk ber-varian tanpa barcode varian → minta pilih varian
      setVariantPicker(match.product);
    } else {
      addLine(match.product);
    }
  };

  useBarcodeScanner({ onScan: handleScan });

  const updateQty = (key: string, qty: number) => {
    setLines(prev => prev.map(l => l.key === key ? { ...l, quantity: qty } : l));
  };

  const removeLine = (key: string) => setLines(prev => prev.filter(l => l.key !== key));

  const totalItems = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);

  const handleSave = async () => {
    if (lines.length === 0) return;
    setError('');
    // Validasi jumlah integer positif
    for (const l of lines) {
      if (!Number.isInteger(l.quantity) || l.quantity <= 0) {
        setError(`Jumlah untuk "${l.product_name}"${l.variant_name ? ` (${l.variant_name})` : ''} harus bilangan bulat positif.`);
        return;
      }
    }
    // Idempotency: buat batch id sekali per percobaan simpan
    if (!batchIdRef.current) {
      batchIdRef.current = `RCP-${storeId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }
    setSaving(true);
    try {
      await dbService.receiveStock({
        batch_id: batchIdRef.current,
        store_id: storeId,
        lines: lines.map(l => ({
          product_id: l.product_id,
          product_name: l.product_name,
          variant_id: l.variant_id,
          variant_name: l.variant_name,
          quantity: Math.floor(l.quantity),
        })),
        products,
        user_id: currentUser.id,
        user_name: currentUser.name || currentUser.email,
        note: note.trim() || undefined,
      });
      setSuccess(true);
      resetBatch();
      onDone();
      setTimeout(() => setSuccess(false), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan stok masuk.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Outlet aktif + panduan */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PackagePlus className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('recv.outlet')}</p>
              <p className="text-sm font-extrabold text-slate-800 leading-tight">{store?.name || '-'}</p>
            </div>
          </div>
          <HelpBadge
            align="right"
            text="Scan satu kemasan per produk atau varian, lalu masukkan jumlah barang yang diterima. Kalau ada 30 kemasan yang sama, scan sekali dan isi 30."
            steps={[
              'Scan barcode (alat USB/Bluetooth) atau ketik barcode/SKU/nama lalu Enter.',
              'Kalau produk punya varian, pilih varian yang sesuai.',
              'Isi jumlah barang yang diterima pada baris.',
              'Klik Simpan Stok Masuk untuk memperbarui stok & mencatat riwayat.',
            ]}
          />
        </div>

        {/* Kolom scan/cari */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && query.trim()) {
                  handleScan(query.trim());
                }
              }}
              placeholder={t('recv.searchPlaceholder')}
              className="w-full bg-slate-50 border border-slate-150 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-sm"
          >
            <Camera className="h-4 w-4" /> {t('pos.scan')}
          </button>
        </div>

        {/* Hasil pencarian */}
        {searchResults.length > 0 && (
          <div className="mt-2 border border-slate-100 rounded-xl divide-y divide-slate-50 overflow-hidden">
            {searchResults.map(p => (
              <div key={p.id} className="p-2.5">
                <button
                  onClick={() => {
                    if ((p.variants?.length ?? 0) > 0) setVariantPicker(p);
                    else addLine(p);
                  }}
                  className="w-full flex items-center justify-between gap-2 text-left hover:bg-slate-50 rounded-lg px-2 py-1.5 cursor-pointer"
                >
                  <span className="min-w-0">
                    <span className="text-xs font-bold text-slate-700 block truncate">{p.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{p.barcode || p.sku || '—'}</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 shrink-0">{t('common.stock')}: {fmt(p.stock_quantity)}</span>
                </button>
                {/* Varian langsung (jika produk punya varian, tampilkan opsi) */}
                {(p.variants?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-2 pt-1.5">
                    {p.variants!.map(v => (
                      <button
                        key={v.id}
                        onClick={() => addLine(p, v)}
                        className="text-[10px] font-bold bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-100 px-2 py-1 rounded-lg cursor-pointer"
                      >
                        {v.name} · {fmt(v.stock_quantity)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-[11px] font-semibold text-rose-700 leading-snug flex-1">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-[11px] font-semibold text-emerald-700">Stok masuk tersimpan. Riwayat tercatat di Inventori → Pergerakan.</p>
        </div>
      )}

      {/* Daftar penerimaan */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-700">{t('recv.listTitle')}</h3>
            <HelpBadge text="Barang yang akan diterima. Kamu bisa mengubah jumlah, menghapus baris, atau menambah produk lain. Baris dengan produk & varian sama otomatis digabung." />
          </div>
          <span className="text-[10px] font-bold text-slate-400">{lines.length} {t('pos.items')}</span>
        </div>

        {lines.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <PackagePlus className="h-7 w-7 mx-auto mb-2 text-slate-200" />
            <p className="text-xs font-semibold">{t('recv.empty')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {lines.map(l => (
              <div key={l.key} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{l.product_name}</p>
                  <p className="text-[10px] text-slate-400">
                    {l.variant_name ? `${l.variant_name} · ` : ''}{t('common.stock')} sekarang: {fmt(l.stock_now)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    ref={l === lines[0] ? qtyRef : undefined}
                    type="number"
                    min={1}
                    step={1}
                    value={l.quantity || ''}
                    onChange={e => updateQty(l.key, Math.floor(Number(e.target.value) || 0))}
                    className="w-20 bg-slate-50 border border-slate-150 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 text-center focus:outline-none focus:border-indigo-500"
                  />
                  <button onClick={() => removeLine(l.key)} className="h-8 w-8 rounded-lg hover:bg-rose-50 hover:text-rose-500 text-slate-300 flex items-center justify-center cursor-pointer">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {lines.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-50 space-y-3">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('recv.note')}</label>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={t('common.optional')}
                className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">{t('recv.totalItems')}: {fmt(totalItems)}</span>
              <div className="flex gap-2">
                <button onClick={resetBatch} disabled={saving} className="px-4 py-2.5 rounded-xl text-[11px] font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  {t('common.cancel')}
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t('recv.save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Variant picker */}
      {variantPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setVariantPicker(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-extrabold text-slate-800 text-base">{t('recv.pickVariant')}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{variantPicker.name}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {variantPicker.variants!.map(v => (
                <button
                  key={v.id}
                  onClick={() => { addLine(variantPicker, v); setVariantPicker(null); }}
                  className="text-xs font-bold bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-100 px-3 py-2 rounded-xl cursor-pointer"
                >
                  {v.name} · {t('common.stock')} {fmt(v.stock_quantity)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetected={handleScan}
      />
    </div>
  );
}
