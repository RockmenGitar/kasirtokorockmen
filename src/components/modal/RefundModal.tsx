import { useState } from 'react';
import { X, Loader2, Undo2, AlertCircle } from 'lucide-react';
import { dbService } from '../../lib/db';
import type { Transaction, UserProfile } from '../../lib/db';

interface RefundModalProps {
  transaction: Transaction;
  storeId: number;
  currentUser: UserProfile;
  onClose: () => void;
  onDone: () => void;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.round(n || 0));

export default function RefundModal({ transaction, storeId, currentUser, onClose, onDone }: RefundModalProps) {
  const [mode, setMode] = useState<'full' | 'partial'>('full');
  const [qtys, setQtys] = useState<Record<number, number>>({});
  const [reason, setReason] = useState('');
  const [restock, setRestock] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refundAmount = mode === 'full'
    ? transaction.total_amount
    : transaction.items.reduce((s, item, i) => s + item.price * (qtys[i] || 0), 0);

  const submit = async () => {
    if (!reason.trim()) { setError('Alasan refund wajib diisi.'); return; }
    if (refundAmount <= 0) { setError('Tidak ada item yang dipilih untuk refund.'); return; }
    setSaving(true); setError('');
    try {
      const items = mode === 'full'
        ? transaction.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price }))
        : transaction.items
            .map((i, idx) => ({ name: i.name, quantity: qtys[idx] || 0, price: i.price, product_id: i.product_id, cost: i.cost }))
            .filter(i => i.quantity > 0);

      await dbService.addRefund({
        transaction_id: transaction.id,
        order_id: transaction.order_id,
        type: mode,
        amount: refundAmount,
        items: items.map(({ name, quantity, price }) => ({ name, quantity, price })),
        reason: reason.trim(),
        restock,
        user_name: currentUser.name || currentUser.email,
      }, storeId);

      // Restock returned items via ledger
      if (restock) {
        const products = await dbService.getProducts(storeId);
        await Promise.all(items.map(async (it: any) => {
          if (!it.product_id) return;
          const product = products.find(p => p.id === it.product_id);
          if (!product) return;
          await dbService.recordMovement({
            product, type: 'return', quantity: it.quantity,
            reference: transaction.order_id, reason: `Refund ${transaction.order_id}`,
            user_name: currentUser.name || currentUser.email,
          });
        }));
      }

      // Update transaction status
      const prevRefunded = (transaction.refunded_amount || 0) + refundAmount;
      const isFull = prevRefunded >= transaction.total_amount - 1;
      await dbService.setTransactionStatus(transaction.id, isFull ? 'Refunded' : transaction.status, storeId, {
        refunded_amount: prevRefunded,
      });

      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses refund.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><Undo2 className="h-4.5 w-4.5" /></div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base leading-tight">Refund / Pembatalan</h3>
              <p className="text-[10px] text-slate-400 font-medium">{transaction.order_id} · {fmt(transaction.total_amount)}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex gap-1.5 bg-slate-50 border border-slate-100 p-0.5 rounded-xl w-fit mb-4">
          <button onClick={() => setMode('full')} className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${mode === 'full' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Refund Penuh</button>
          <button onClick={() => setMode('partial')} className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${mode === 'partial' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>Refund Sebagian</button>
        </div>

        {mode === 'partial' && (
          <div className="space-y-2 mb-4">
            {transaction.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                <div className="text-left">
                  <p className="text-[11px] font-bold text-slate-700">{item.name}</p>
                  <p className="text-[9px] text-slate-400">{item.quantity}x · {fmt(item.price)}</p>
                </div>
                <input
                  type="number" min={0} max={item.quantity}
                  value={qtys[i] || ''}
                  onChange={e => setQtys(q => ({ ...q, [i]: Math.min(item.quantity, Math.max(0, Number(e.target.value) || 0)) }))}
                  placeholder="0"
                  className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 text-center"
                />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Alasan Refund *</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Mis. barang rusak / salah pesan"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500" />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={restock} onChange={e => setRestock(e.target.checked)} className="h-4 w-4 rounded accent-indigo-600" />
            <span className="text-xs font-semibold text-slate-600">Kembalikan barang ke stok</span>
          </label>
        </div>

        <div className="flex justify-between items-center bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 mt-4">
          <span className="text-[11px] font-bold text-rose-700">Jumlah Refund</span>
          <span className="text-base font-extrabold text-rose-700">{fmt(refundAmount)}</span>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5 mt-3">
            <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[10px] font-semibold text-rose-700 leading-snug flex-1">{error}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} disabled={saving} className="px-4 py-2.5 rounded-xl text-[11px] font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 cursor-pointer">Batal</button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Proses Refund
          </button>
        </div>
      </div>
    </div>
  );
}
