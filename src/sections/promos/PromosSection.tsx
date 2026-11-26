import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Tag, Percent, Wallet } from 'lucide-react';
import { dbService } from '../../lib/db';
import type { Promo } from '../../lib/db';
import { useStoreData } from '../../hooks/useStoreData';
import { toDateStr } from '../../api/localStore';

interface PromosSectionProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

export default function PromosSection({ storeId, refreshTrigger, triggerRefresh }: PromosSectionProps) {
  const [promos] = useStoreData<Promo[]>(dbService.getPromos, storeId, refreshTrigger, []);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Promo | null>(null);

  const today = toDateStr(new Date());
  const isActive = (p: Promo) => p.active && (!p.start_date || p.start_date <= today) && (!p.end_date || p.end_date >= today);

  const remove = async (p: Promo) => {
    if (!confirm(`Hapus promo "${p.name}"?`)) return;
    await dbService.deletePromo(p.id, storeId);
    triggerRefresh?.();
  };

  const toggleActive = async (p: Promo) => {
    await dbService.updatePromo(p.id, { active: !p.active }, storeId);
    triggerRefresh?.();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-slate-800 text-xl leading-none">Promo</h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">Buat diskon nominal atau persentase dengan periode aktif.</p>
        </div>
        <button onClick={() => { setEditing(null); setIsOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> Tambah Promo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {promos.length === 0 ? (
          <div className="col-span-full bg-slate-50 border border-slate-100/80 rounded-3xl p-10 text-center">
            <Tag className="h-7 w-7 mx-auto mb-2 text-slate-200" />
            <p className="text-xs font-bold text-slate-500">Belum ada promo</p>
          </div>
        ) : promos.map(p => (
          <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-36">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${p.type === 'percentage' ? 'bg-violet-50 text-violet-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {p.type === 'percentage' ? <Percent className="h-4.5 w-4.5" /> : <Wallet className="h-4.5 w-4.5" />}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm leading-tight">{p.name}</h4>
                  <p className="text-[11px] font-bold text-indigo-600 mt-0.5">
                    {p.type === 'percentage' ? `${p.value}%` : fmt(p.value)}
                    {p.min_purchase ? <span className="text-slate-400 font-medium"> · min {fmt(p.min_purchase)}</span> : null}
                  </p>
                </div>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${isActive(p) ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>
                {isActive(p) ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>

            <div className="text-[10px] text-slate-400 font-medium my-3">
              {p.start_date || p.end_date ? `${p.start_date || '...'} s/d ${p.end_date || '...'}` : 'Tanpa batas waktu'}
            </div>

            <div className="flex items-center justify-between border-t border-slate-50 pt-3">
              <button onClick={() => toggleActive(p)} className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 cursor-pointer">
                {p.active ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditing(p); setIsOpen(true); }} className="h-7 w-7 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-slate-300 inline-flex items-center justify-center cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove(p)} className="h-7 w-7 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-300 inline-flex items-center justify-center cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isOpen && (
        <PromoModal promo={editing} storeId={storeId} onClose={() => setIsOpen(false)} onDone={() => { setIsOpen(false); triggerRefresh?.(); }} />
      )}
    </div>
  );
}

function PromoModal({ promo, storeId, onClose, onDone }: {
  promo: Promo | null; storeId: number; onClose: () => void; onDone: () => void;
}) {
  const [name, setName] = useState(promo?.name || '');
  const [type, setType] = useState<'nominal' | 'percentage'>(promo?.type || 'percentage');
  const [value, setValue] = useState(promo ? String(promo.value) : '');
  const [minPurchase, setMinPurchase] = useState(promo?.min_purchase ? String(promo.min_purchase) : '');
  const [startDate, setStartDate] = useState(promo?.start_date || '');
  const [endDate, setEndDate] = useState(promo?.end_date || '');
  const [active, setActive] = useState(promo?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) { setError('Nama promo wajib diisi.'); return; }
    const val = Number(value);
    if (!val || val <= 0) { setError('Nilai promo tidak valid.'); return; }
    if (type === 'percentage' && val > 100) { setError('Persentase maksimal 100%.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        name: name.trim(), type, value: val,
        min_purchase: Number(minPurchase) || 0,
        start_date: startDate || undefined, end_date: endDate || undefined,
        active,
      };
      if (promo) await dbService.updatePromo(promo.id, payload, storeId);
      else await dbService.addPromo(payload, storeId);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-slate-800 text-base">{promo ? 'Edit Promo' : 'Tambah Promo'}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Nama Promo</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Mis. Diskon Lebaran"
              className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Tipe</label>
              <select value={type} onChange={e => setType(e.target.value as 'nominal' | 'percentage')}
                className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800">
                <option value="percentage">Persentase (%)</option>
                <option value="nominal">Nominal (Rp)</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{type === 'percentage' ? 'Nilai (%)' : 'Nilai (Rp)'}</label>
              <input type="number" value={value} onChange={e => setValue(e.target.value)}
                className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Minimum Belanja (Rp)</label>
            <input type="number" value={minPurchase} onChange={e => setMinPurchase(e.target.value)} placeholder="0"
              className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Mulai</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Selesai</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" />
            </div>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="h-4 w-4 rounded accent-indigo-600" />
            <span className="text-xs font-semibold text-slate-600">Aktif</span>
          </label>
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
