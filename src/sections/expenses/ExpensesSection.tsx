import { useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, Wallet, X, Loader2, Download } from 'lucide-react';
import { dbService, EXPENSE_CATEGORIES } from '../../lib/db';
import type { Expense, UserProfile } from '../../lib/db';
import { useStoreData } from '../../hooks/useStoreData';
import { toDateStr } from '../../api/localStore';
import { useI18n } from '../../lib/i18n';
import HelpBadge from '../../components/ui/HelpBadge';

interface ExpensesSectionProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
  currentUser: UserProfile;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

export default function ExpensesSection({ storeId, refreshTrigger, triggerRefresh, currentUser }: ExpensesSectionProps) {
  const { t } = useI18n();
  const [expenses] = useStoreData<Expense[]>(dbService.getExpenses, storeId, refreshTrigger, []);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = useMemo(() => expenses.filter(e => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  }), [expenses, from, to]);

  const total = useMemo(() => filtered.reduce((s, e) => s + (e.amount || 0), 0), [filtered]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const openAdd = () => { setEditing(null); setIsOpen(true); };
  const openEdit = (e: Expense) => { setEditing(e); setIsOpen(true); };

  const remove = async (e: Expense) => {
    if (!confirm(`Hapus pengeluaran "${e.description}"?`)) return;
    await dbService.deleteExpense(e.id, storeId);
    triggerRefresh?.();
  };

  const exportCSV = () => {
    const rows = [['Tanggal', 'Kategori', 'Nominal', 'Keterangan'], ...filtered.map(e => [e.date, e.category, String(e.amount), e.description])];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pengeluaran_${toDateStr(new Date())}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-slate-800 text-xl leading-none flex items-center gap-2">
            {t('exp.title')}
            <HelpBadge
              text="Catat biaya operasional seperti sewa, listrik, gaji, dan pembelian bahan. Pengeluaran mengurangi laba bersih di laporan."
              steps={[
                'Klik Tambah untuk mencatat pengeluaran baru.',
                'Isi tanggal, kategori, nominal, dan keterangan.',
                'Gunakan filter tanggal untuk melihat periode tertentu.',
              ]}
            />
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">{t('exp.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <Download className="h-3.5 w-3.5" /> {t('rpt.exportCsv')}
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
            <Plus className="h-3.5 w-3.5" /> {t('common.add')}
          </button>
        </div>
      </div>

      {/* Filter + total */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-wrap items-end gap-3">
          <div className="w-full flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('common.search')}</span>
            <HelpBadge text={t('help.exp.filter')} />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('exp.from')}</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('exp.to')}</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700" />
          </div>
          {(from || to) && <button onClick={() => { setFrom(''); setTo(''); }} className="text-[11px] font-bold text-slate-400 hover:text-rose-500 pb-2">Reset</button>}
        </div>
        <div className="bg-indigo-600 rounded-2xl p-4 shadow-sm text-white flex items-center gap-3">
          <Wallet className="h-8 w-8 opacity-80" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">{t('exp.total')}<HelpBadge text={t('help.exp.total')} /></p>
            <p className="text-xl font-extrabold leading-tight">{fmt(total)}</p>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {byCategory.map(([cat, amt]) => (
            <span key={cat} className="text-[11px] font-bold bg-white border border-slate-100 rounded-xl px-3 py-1.5 text-slate-600 shadow-sm">
              {cat}: <span className="text-rose-500">{fmt(amt)}</span>
            </span>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-1.5">
          <h4 className="font-bold text-slate-800 text-sm leading-none">{t('exp.title')}</h4>
          <HelpBadge text={t('help.exp.table')} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-50">
                <th className="text-left font-bold px-4 py-3">{t('exp.date')}</th>
                <th className="text-left font-bold px-4 py-3">{t('exp.category')}</th>
                <th className="text-left font-bold px-4 py-3">{t('exp.description')}</th>
                <th className="text-right font-bold px-4 py-3">{t('exp.amount')}</th>
                <th className="text-right font-bold px-4 py-3">{t('common.action')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-xs font-semibold">{t('common.noData')}</td></tr>
              ) : filtered.map(e => (
                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{e.date}</td>
                  <td className="px-4 py-3"><span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">{e.category}</span></td>
                  <td className="px-4 py-3 text-slate-700 font-semibold">{e.description}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(e.amount)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(e)} className="h-7 w-7 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-slate-300 inline-flex items-center justify-center cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(e)} className="h-7 w-7 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-300 inline-flex items-center justify-center cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isOpen && (
        <ExpenseModal
          expense={editing}
          storeId={storeId}
          userName={currentUser.name || currentUser.email}
          onClose={() => setIsOpen(false)}
          onDone={() => { setIsOpen(false); triggerRefresh?.(); }}
        />
      )}
    </div>
  );
}

function ExpenseModal({ expense, storeId, userName, onClose, onDone }: {
  expense: Expense | null; storeId: number; userName: string; onClose: () => void; onDone: () => void;
}) {
  const { t } = useI18n();
  const [date, setDate] = useState(expense?.date || toDateStr(new Date()));
  const [category, setCategory] = useState(expense?.category || EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [description, setDescription] = useState(expense?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Nominal tidak valid.'); return; }
    if (!description.trim()) { setError('Keterangan wajib diisi.'); return; }
    setSaving(true); setError('');
    try {
      if (expense) {
        await dbService.updateExpense(expense.id, { date, category, amount: amt, description: description.trim() }, storeId);
      } else {
        await dbService.addExpense({ date, category, amount: amt, description: description.trim(), user_name: userName }, storeId);
      }
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
          <h3 className="font-extrabold text-slate-800 text-base">{expense ? t('exp.editTitle') : t('exp.addTitle')}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('exp.date')}</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('exp.category')}</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('exp.amount')} (Rp)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('exp.description')}</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('exp.descPlaceholder')} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" />
          </div>
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
