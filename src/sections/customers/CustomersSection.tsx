import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, X, Loader2, Search, Users, Star } from 'lucide-react';
import { dbService } from '../../lib/db';
import type { Customer, Transaction } from '../../lib/db';
import { useStoreData } from '../../hooks/useStoreData';
import { useI18n } from '../../lib/i18n';
import HelpBadge from '../../components/ui/HelpBadge';

interface CustomersSectionProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.round(n || 0));

export default function CustomersSection({ storeId, refreshTrigger, triggerRefresh }: CustomersSectionProps) {
  const { t } = useI18n();
  const [customers] = useStoreData<Customer[]>(dbService.getCustomers, storeId, refreshTrigger, []);
  const [transactions] = useStoreData<Transaction[]>(dbService.getTransactions, storeId, refreshTrigger, []);

  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);

  const history = useMemo(() => {
    if (!selected) return { count: 0, total: 0, tx: [] as Transaction[] };
    const tx = transactions.filter(t => (t.customer_id && t.customer_id === selected.id) || t.customer_name?.toLowerCase() === selected.name.toLowerCase());
    return { count: tx.length, total: tx.reduce((s, t) => s + t.total_amount, 0), tx };
  }, [selected, transactions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q));
  }, [customers, search]);

  const remove = async (c: Customer) => {
    if (!confirm(`Hapus pelanggan "${c.name}"?`)) return;
    await dbService.deleteCustomer(c.id, storeId);
    if (selected?.id === c.id) setSelected(null);
    triggerRefresh?.();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-slate-800 text-xl leading-none flex items-center gap-2">
            {t('cust.title')}
            <HelpBadge
              text="Simpan data pelanggan agar bisa melihat riwayat pembelian mereka. Pelanggan tidak wajib diisi saat transaksi."
              steps={[
                'Klik Tambah Pelanggan untuk menyimpan nama & kontak.',
                'Klik salah satu pelanggan untuk melihat riwayat belanjanya.',
                'Saat di kasir, ketik nama pelanggan agar transaksi tercatat.',
              ]}
            />
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">{t('cust.subtitle')}</p>
        </div>
        <button onClick={() => { setEditing(null); setIsOpen(true); }} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> {t('cust.add')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 space-y-3">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-slate-800 text-sm leading-none">{t('cust.title')}</h4>
              <HelpBadge text={t('help.cust.list')} />
            </div>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('cust.searchPlaceholder')}
                className="w-full bg-slate-50 border border-slate-150 rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Users className="h-7 w-7 mx-auto mb-2 text-slate-200" />
                <p className="text-xs font-semibold">{t('common.noData')}</p>
              </div>
            ) : filtered.map(c => (
              <button key={c.id} onClick={() => setSelected(c)} className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50/70 transition-colors ${selected?.id === c.id ? 'bg-indigo-50/50' : ''}`}>
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                  {c.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{c.name}</p>
                  <p className="text-[11px] text-slate-400 font-medium truncate">{c.phone || c.email || '—'}</p>
                </div>
                {(c.discount_percent || 0) > 0 && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                    {c.discount_percent}%
                  </span>
                )}
                {(c.points || 0) > 0 && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Star className="h-3 w-3" /> {c.points}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <span onClick={(e) => { e.stopPropagation(); setEditing(c); setIsOpen(true); }} className="h-7 w-7 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-slate-300 inline-flex items-center justify-center cursor-pointer"><Pencil className="h-3.5 w-3.5" /></span>
                  <span onClick={(e) => { e.stopPropagation(); remove(c); }} className="h-7 w-7 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-300 inline-flex items-center justify-center cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-1.5 mb-3">
            <h4 className="font-bold text-slate-800 text-sm leading-none">{t('cust.history')}</h4>
            <HelpBadge text={t('help.cust.detail')} />
          </div>
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 py-16">
              <Users className="h-8 w-8 mb-2" />
              <p className="text-xs font-semibold">{t('cust.pickHint')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">{selected.name}</h3>
                <p className="text-[11px] text-slate-400 font-medium">{selected.phone || selected.email || 'Tanpa kontak'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('cust.txCount')}</p>
                  <p className="text-lg font-extrabold text-slate-800">{history.count}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('cust.totalSpend')}</p>
                  <p className="text-sm font-extrabold text-slate-800">{fmt(history.total)}</p>
                </div>
              </div>
              {selected.note && <p className="text-[11px] text-slate-500 bg-slate-50 rounded-xl p-3">{selected.note}</p>}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('cust.history')}</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.tx.length === 0 ? (
                    <p className="text-[11px] text-slate-300 font-semibold">{t('cust.noTx')}</p>
                  ) : history.tx.map(t => (
                    <div key={t.id} className="flex justify-between items-center bg-slate-50/70 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-[11px] font-bold text-slate-700">{t.order_id}</p>
                        <p className="text-[9px] text-slate-400">{new Date(t.created_at || '').toLocaleDateString('id-ID')}</p>
                      </div>
                      <span className="text-[11px] font-extrabold text-slate-700">{fmt(t.total_amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isOpen && (
        <CustomerModal
          customer={editing}
          storeId={storeId}
          onClose={() => setIsOpen(false)}
          onDone={() => { setIsOpen(false); triggerRefresh?.(); }}
        />
      )}
    </div>
  );
}

function CustomerModal({ customer, storeId, onClose, onDone }: {
  customer: Customer | null; storeId: number; onClose: () => void; onDone: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [note, setNote] = useState(customer?.note || '');
  const [discount, setDiscount] = useState(customer?.discount_percent ? String(customer.discount_percent) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) { setError('Nama wajib diisi.'); return; }
    const disc = Number(discount);
    if (disc < 0 || disc > 100) { setError('Diskon pelanggan harus antara 0–100%.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { name: name.trim(), phone, email, address, note, discount_percent: disc || 0 };
      if (customer) await dbService.updateCustomer(customer.id, payload, storeId);
      else await dbService.addCustomer(payload, storeId);
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
          <h3 className="font-extrabold text-slate-800 text-base">{customer ? t('common.edit') : t('cust.add')}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <Field label={t('cust.name')}><input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('cust.phone')}><input value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" /></Field>
            <Field label={t('cust.email')}><input value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" /></Field>
          </div>
          <Field label={t('cust.address')}><input value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" /></Field>
          <Field label={t('cust.discount')}>
            <input type="number" min={0} max={100} value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" />
          </Field>
          <Field label={t('common.note')}><input value={note} onChange={e => setNote(e.target.value)} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" /></Field>
        </div>
        {error && <p className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5 mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} disabled={saving} className="px-4 py-2.5 rounded-xl text-[11px] font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 cursor-pointer">{t('common.cancel')}</button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
