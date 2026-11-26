import { useEffect, useState } from 'react';
import { Clock, Plus, Loader2, Wallet, X, Check } from 'lucide-react';
import { dbService } from '../../lib/db';
import type { Shift, UserProfile, Transaction } from '../../lib/db';
import { useStoreData } from '../../hooks/useStoreData';

interface ShiftsSectionProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
  currentUser: UserProfile;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.round(n || 0));

export default function ShiftsSection({ storeId, refreshTrigger, triggerRefresh, currentUser }: ShiftsSectionProps) {
  const [shifts] = useStoreData<Shift[]>(dbService.getShifts, storeId, refreshTrigger, []);
  const [transactions] = useStoreData<Transaction[]>(dbService.getTransactions, storeId, refreshTrigger, []);
  const [openShift, setOpenShift] = useState<Shift | null>(null);
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);

  useEffect(() => { dbService.getOpenShift(storeId).then(setOpenShift).catch(() => {}); }, [storeId, refreshTrigger]);

  const shiftSales = openShift
    ? transactions.filter(t => new Date(t.created_at || '') >= new Date(openShift.opened_at) && t.status === 'Success')
        .reduce((s, t) => s + (t.payment_method === 'Cash' ? t.total_amount : 0), 0)
    : 0;
  const expectedCash = openShift ? openShift.opening_cash + shiftSales + (openShift.cash_in || 0) - (openShift.cash_out || 0) : 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-slate-800 text-xl leading-none">Shift Kasir</h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">Buka/tutup shift, modal awal, dan rekonsiliasi kas.</p>
        </div>
        {!openShift ? (
          <button onClick={() => setShowOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
            <Plus className="h-3.5 w-3.5" /> Buka Shift
          </button>
        ) : (
          <button onClick={() => setShowClose(true)} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer">
            <Wallet className="h-3.5 w-3.5" /> Tutup Shift
          </button>
        )}
      </div>

      {/* Active shift panel */}
      {openShift && (
        <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Shift Aktif — {openShift.cashier_name}</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Modal Awal" value={fmt(openShift.opening_cash)} />
            <Stat label="Penjualan Tunai" value={fmt(shiftSales)} />
            <Stat label="Kas Masuk" value={fmt(openShift.cash_in || 0)} />
            <Stat label="Kas Keluar" value={fmt(openShift.cash_out || 0)} />
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider">Kas Seharusnya</span>
            <span className="text-xl font-extrabold">{fmt(expectedCash)}</span>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Riwayat Shift</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-50">
                <th className="text-left font-bold px-4 py-3">Kasir</th>
                <th className="text-left font-bold px-4 py-3">Buka</th>
                <th className="text-left font-bold px-4 py-3">Tutup</th>
                <th className="text-right font-bold px-4 py-3">Modal</th>
                <th className="text-right font-bold px-4 py-3">Aktual</th>
                <th className="text-right font-bold px-4 py-3">Selisih</th>
                <th className="text-left font-bold px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-xs font-semibold">Belum ada shift.</td></tr>
              ) : shifts.map(s => (
                <tr key={s.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-700">{s.cashier_name}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(s.opened_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{s.closed_at ? new Date(s.closed_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{fmt(s.opening_cash)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{s.closing_cash_actual != null ? fmt(s.closing_cash_actual) : '—'}</td>
                  <td className={`px-4 py-3 text-right font-bold ${(s.difference || 0) < 0 ? 'text-rose-500' : 'text-emerald-600'}`}>{s.difference != null ? fmt(s.difference) : '—'}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${s.status === 'open' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 bg-slate-50'}`}>{s.status === 'open' ? 'Berjalan' : 'Selesai'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showOpen && (
        <OpenShiftModal storeId={storeId} currentUser={currentUser} onClose={() => setShowOpen(false)} onDone={() => { setShowOpen(false); triggerRefresh?.(); }} />
      )}
      {showClose && openShift && (
        <CloseShiftModal shift={openShift} expectedCash={expectedCash} storeId={storeId} onClose={() => setShowClose(false)} onDone={() => { setShowClose(false); triggerRefresh?.(); }} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-base font-extrabold leading-tight mt-0.5">{value}</p>
    </div>
  );
}

function OpenShiftModal({ storeId, currentUser, onClose, onDone }: {
  storeId: number; currentUser: UserProfile; onClose: () => void; onDone: () => void;
}) {
  const [openingCash, setOpeningCash] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const amt = Number(openingCash);
    if (amt < 0 || openingCash === '') { setError('Modal awal tidak valid.'); return; }
    setSaving(true); setError('');
    try {
      await dbService.openShift({
        cashier_id: currentUser.id,
        cashier_name: currentUser.name || currentUser.email,
        opening_cash: amt,
      }, storeId);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuka shift.');
    } finally { setSaving(false); }
  };

  return (
    <Shell title="Buka Shift" onClose={onClose}>
      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Modal Awal (Rp)</label>
      <input type="number" value={openingCash} onChange={e => setOpeningCash(e.target.value)} placeholder="0"
        className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" />
      {error && <p className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5 mt-3">{error}</p>}
      <Footer onCancel={onClose} onConfirm={submit} saving={saving} label="Buka Shift" />
    </Shell>
  );
}

function CloseShiftModal({ shift, expectedCash, storeId, onClose, onDone }: {
  shift: Shift; expectedCash: number; storeId: number; onClose: () => void; onDone: () => void;
}) {
  const [actual, setActual] = useState('');
  const [cashIn, setCashIn] = useState('');
  const [cashOut, setCashOut] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const diff = (Number(actual) || 0) - expectedCash;

  const submit = async () => {
    if (actual === '') { setError('Kas aktual wajib diisi.'); return; }
    setSaving(true); setError('');
    try {
      await dbService.closeShift({
        shiftId: shift.id,
        closing_cash_actual: Number(actual),
        expected_cash: expectedCash,
        cash_in: Number(cashIn) || 0,
        cash_out: Number(cashOut) || 0,
        note,
      }, storeId);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menutup shift.');
    } finally { setSaving(false); }
  };

  return (
    <Shell title="Tutup Shift" onClose={onClose}>
      <div className="space-y-3">
        <div className="bg-slate-50 rounded-xl px-3.5 py-3 flex justify-between items-center">
          <span className="text-[11px] font-bold text-slate-500">Kas Seharusnya</span>
          <span className="text-sm font-extrabold text-slate-800">{fmt(expectedCash)}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Kas Aktual</label>
            <input type="number" value={actual} onChange={e => setActual(e.target.value)} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-2.5 py-2.5 text-xs font-semibold text-slate-800" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Kas Masuk</label>
            <input type="number" value={cashIn} onChange={e => setCashIn(e.target.value)} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-2.5 py-2.5 text-xs font-semibold text-slate-800" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Kas Keluar</label>
            <input type="number" value={cashOut} onChange={e => setCashOut(e.target.value)} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-2.5 py-2.5 text-xs font-semibold text-slate-800" />
          </div>
        </div>
        {actual !== '' && (
          <div className={`flex justify-between items-center rounded-xl px-3.5 py-2.5 ${diff < 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
            <span className="text-[11px] font-bold">Selisih</span>
            <span className="text-sm font-extrabold">{diff < 0 ? '' : '+'}{fmt(diff)}</span>
          </div>
        )}
        <div>
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Catatan</label>
          <input value={note} onChange={e => setNote(e.target.value)} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800" />
        </div>
      </div>
      {error && <p className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5 mt-3">{error}</p>}
      <Footer onCancel={onClose} onConfirm={submit} saving={saving} label="Tutup Shift" />
    </Shell>
  );
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-slate-800 text-base">{title}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Footer({ onCancel, onConfirm, saving, label }: { onCancel: () => void; onConfirm: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 mt-5">
      <button onClick={onCancel} disabled={saving} className="px-4 py-2.5 rounded-xl text-[11px] font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 cursor-pointer">Batal</button>
      <button onClick={onConfirm} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {label}
      </button>
    </div>
  );
}
