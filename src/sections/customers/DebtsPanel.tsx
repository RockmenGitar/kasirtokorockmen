import { useState } from 'react';
import { Wallet, Loader2, Check, X } from 'lucide-react';
import { dbService } from '../../lib/db';
import type { Debt, UserProfile } from '../../lib/db';
import { useStoreData } from '../../hooks/useStoreData';
import HelpBadge from '../../components/ui/HelpBadge';

interface DebtsPanelProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
  currentUser: UserProfile;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.round(n || 0));

export default function DebtsPanel({ storeId, refreshTrigger, triggerRefresh, currentUser }: DebtsPanelProps) {
  const [debts] = useStoreData<Debt[]>(dbService.getDebts, storeId, refreshTrigger, []);
  const [payTarget, setPayTarget] = useState<Debt | null>(null);

  const open = debts.filter(d => d.status !== 'paid');
  const totalOutstanding = open.reduce((s, d) => s + (d.amount - d.paid_amount), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-amber-500" />
          <h4 className="font-bold text-slate-800 text-sm leading-none">Kasbon / Utang Pelanggan</h4>
          <HelpBadge
            text="Daftar utang pelanggan (kasbon). Catat pembayaran cicilan lewat tombol Bayar."
            steps={[
              'Kasbon dibuat otomatis saat kasir memakai metode bayar "Kasbon".',
              'Klik Bayar untuk mencatat pelunasan penuh atau cicilan.',
              'Total piutang adalah sisa utang yang belum dibayar.',
            ]}
          />
        </div>
        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg">
          Piutang: {fmt(totalOutstanding)}
        </span>
      </div>

      {open.length === 0 ? (
        <div className="py-10 text-center text-slate-400">
          <Wallet className="h-7 w-7 mx-auto mb-2 text-slate-200" />
          <p className="text-xs font-semibold">Tidak ada kasbon berjalan.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {open.map(d => {
            const sisa = d.amount - d.paid_amount;
            return (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                  {d.customer_name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{d.customer_name}</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    {d.order_id || '—'} · {d.status === 'partial' ? `Dibayar ${fmt(d.paid_amount)}` : 'Belum dibayar'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-extrabold text-slate-800">{fmt(sisa)}</p>
                  <p className="text-[9px] text-slate-400">dari {fmt(d.amount)}</p>
                </div>
                <button
                  onClick={() => setPayTarget(d)}
                  className="shrink-0 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-lg cursor-pointer"
                >
                  Bayar
                </button>
              </div>
            );
          })}
        </div>
      )}

      {payTarget && (
        <PayDebtModal
          debt={payTarget}
          storeId={storeId}
          userName={currentUser.name || currentUser.email}
          onClose={() => setPayTarget(null)}
          onDone={() => { setPayTarget(null); triggerRefresh?.(); }}
        />
      )}
    </div>
  );
}

function PayDebtModal({ debt, storeId, userName, onClose, onDone }: {
  debt: Debt; storeId: number; userName: string; onClose: () => void; onDone: () => void;
}) {
  const sisa = debt.amount - debt.paid_amount;
  const [amount, setAmount] = useState(String(Math.round(sisa)));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const n = Number(amount);
    if (!n || n <= 0) { setError('Nominal tidak valid.'); return; }
    if (n > sisa + 0.001) { setError('Nominal melebihi sisa utang.'); return; }
    setSaving(true); setError('');
    try {
      await dbService.payDebt(debt, n, storeId, userName, note.trim() || undefined);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pembayaran.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-slate-800 text-base">Bayar Kasbon</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs font-bold text-slate-700">{debt.customer_name}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Sisa utang: <span className="font-extrabold text-amber-700">{fmt(sisa)}</span></p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Nominal Bayar (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount ? new Intl.NumberFormat('id-ID').format(Number(amount.replace(/\D/g, ''))) : ''}
              onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Catatan (opsional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500" />
          </div>
        </div>
        {error && <p className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5 mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} disabled={saving} className="px-4 py-2.5 rounded-xl text-[11px] font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 cursor-pointer">Batal</button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Bayar
          </button>
        </div>
      </div>
    </div>
  );
}
