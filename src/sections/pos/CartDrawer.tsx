import { useState } from 'react';
import { Minus, Plus, Trash2, ArrowRight, User, MessageSquare, ImageOff, Percent, Pause, Banknote } from 'lucide-react';
import type { Product, Customer, StoreSettings, Promo } from '../../lib/db';
import { useI18n } from '../../lib/i18n';
import HelpBadge from '../../components/ui/HelpBadge';

function CartItemImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="h-10 w-10 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0">
        <ImageOff className="h-4 w-4 text-slate-300" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      className="h-10 w-10 object-cover rounded-xl border border-slate-50 shadow-inner shrink-0"
    />
  );
}

export interface CartItem {
  product: Product;
  quantity: number;
  note?: string;
  discount?: number; // nominal per item
  variant?: import('../../api/types').ProductVariant;
}

interface CartDrawerProps {
  cart: CartItem[];
  onUpdateQty: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onUpdateNote: (productId: string, note: string) => void;
  onUpdateItemDiscount: (productId: string, discount: number) => void;
  selectedCustomerName: string;
  setSelectedCustomerName: (name: string) => void;
  customers: Customer[];
  setSelectedCustomerId: (id: string) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  settings: StoreSettings;
  activePromos: Promo[];
  selectedPromoId: string;
  setSelectedPromoId: (id: string) => void;
  promoDiscount: number;
  transactionDiscount: number;
  setTransactionDiscount: (v: number) => void;
  paidAmount: number;
  setPaidAmount: (v: number) => void;
  onCheckout: () => void;
  onHold: () => void;
  /** Tampil sebagai bottom-sheet overlay (mode HP). */
  isMobileSheet?: boolean;
  onCloseSheet?: () => void;
  totals: {
    subtotal: number;
    itemDiscount: number;
    transactionDiscount: number;
    taxable: number;
    tax: number;
    serviceCharge: number;
    rounding: number;
    grandTotal: number;
    change: number;
  };
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));

export default function CartDrawer({
  cart,
  onUpdateQty,
  onRemove,
  onUpdateNote,
  onUpdateItemDiscount,
  selectedCustomerName,
  setSelectedCustomerName,
  customers,
  setSelectedCustomerId,
  paymentMethod,
  setPaymentMethod,
  settings,
  activePromos,
  selectedPromoId,
  setSelectedPromoId,
  promoDiscount,
  transactionDiscount,
  setTransactionDiscount,
  paidAmount,
  setPaidAmount,
  onCheckout,
  onHold,
  isMobileSheet = false,
  onCloseSheet,
  totals,
}: CartDrawerProps) {
  const { t } = useI18n();
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const [openItemDiscount, setOpenItemDiscount] = useState<Record<string, boolean>>({});
  const [showDiscount, setShowDiscount] = useState(false);

  const toggleNote = (id: string) => setOpenNotes(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleItemDiscount = (id: string) => setOpenItemDiscount(prev => ({ ...prev, [id]: !prev[id] }));
  const isNoteVisible = (item: CartItem) => openNotes[item.product.id] || !!item.note?.trim();

  const paymentMethods = settings.payment_methods?.length ? settings.payment_methods : ['Cash', 'QRIS', 'Transfer'];
  const isCash = paymentMethod === 'Cash';

  const shell = isMobileSheet
    ? 'fixed inset-x-0 bottom-0 z-50 w-full max-h-[88vh] rounded-t-3xl border-t border-slate-100 bg-white p-5 shadow-2xl flex flex-col'
    : 'w-full lg:w-96 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col h-[calc(100vh-4rem)] sticky top-16 self-start';

  return (
    <>
    {isMobileSheet && (
      <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={onCloseSheet} />
    )}
    <div className={shell}>

      {/* HANDLE (mobile sheet) */}
      {isMobileSheet && (
        <div className="flex justify-center pb-2 shrink-0">
          <span className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-50 shrink-0">
        <div className="flex items-center gap-1.5">
          <h3 className="font-bold text-slate-800 text-sm">{t('pos.cart')}</h3>
          <HelpBadge
            text="Keranjang berisi barang yang akan dibayar. Angka total di bawah adalah jumlah yang harus dibayar pelanggan."
            steps={[
              'Tambahkan barang dengan mengetuk produk atau scan barcode.',
              'Ubah jumlah dengan tombol +/- pada tiap baris.',
              'Pilih cara bayar (Tunai/QRIS/Transfer), lalu klik Bayar & Selesaikan.',
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} {t('pos.items')}
          </span>
          {isMobileSheet && (
            <button onClick={onCloseSheet} className="h-7 w-7 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center cursor-pointer">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* SCROLLABLE ITEMS */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50 py-1 pr-1 mt-1 min-h-0">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16">
            <span className="text-[10px] font-bold">{t('pos.emptyCart')}</span>
            <p className="text-[9px] mt-1 text-center">{t('pos.emptyCartHint')}</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.product.id} className="py-2.5">
              <div className="flex gap-2.5 items-center">
                <CartItemImage src={item.product.image_url} alt={item.product.name} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-slate-750 block leading-tight truncate">{item.product.name}</span>
                  <span className="text-[10px] font-extrabold text-indigo-600 mt-0.5 block">
                    Rp {fmt(item.product.price * item.quantity - (item.discount || 0))}
                    {item.discount ? <span className="text-rose-500 font-bold ml-1">-{fmt(item.discount)}</span> : null}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onUpdateQty(item.product.id, item.quantity - 1)}
                    className="h-5 w-5 rounded-md border border-slate-100 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 cursor-pointer active:scale-95 transition-transform"
                  >
                    <Minus className="h-2.5 w-2.5" />
                  </button>
                  <span className="text-xs font-extrabold text-slate-800 w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQty(item.product.id, item.quantity + 1)}
                    className="h-5 w-5 rounded-md border border-slate-100 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-400 cursor-pointer active:scale-95 transition-transform"
                  >
                    <Plus className="h-2.5 w-2.5" />
                  </button>
                  <button
                    onClick={() => toggleItemDiscount(item.product.id)}
                    title="Diskon item"
                    className={`h-5 w-5 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                      item.discount ? 'bg-rose-50 text-rose-500' : 'hover:bg-slate-50 text-slate-300 hover:text-slate-500'
                    }`}
                  >
                    <Percent className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => toggleNote(item.product.id)}
                    title="Tambah catatan"
                    className={`h-5 w-5 rounded-md flex items-center justify-center cursor-pointer transition-colors ${
                      item.note?.trim() ? 'bg-indigo-50 text-indigo-500' : 'hover:bg-slate-50 text-slate-300 hover:text-slate-500'
                    }`}
                  >
                    <MessageSquare className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onRemove(item.product.id)}
                    className="h-5 w-5 rounded-md hover:bg-rose-50 hover:text-rose-500 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {openItemDiscount[item.product.id] && (
                <input
                  type="number"
                  value={item.discount || ''}
                  onChange={(e) => onUpdateItemDiscount(item.product.id, Math.max(0, Number(e.target.value) || 0))}
                  placeholder={t('pos.itemDiscount')}
                  className="w-full mt-1.5 bg-rose-50/60 border border-rose-100 rounded-lg px-3 py-1.5 text-[10px] font-medium text-rose-800 placeholder:text-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-300 focus:border-rose-300"
                />
              )}

              {isNoteVisible(item) && (
                <input
                  type="text"
                  value={item.note || ''}
                  onChange={(e) => onUpdateNote(item.product.id, e.target.value)}
                  placeholder="catatan..."
                  className="w-full mt-1.5 bg-indigo-50/60 border border-indigo-100 rounded-lg px-3 py-1.5 text-[10px] font-medium text-indigo-800 placeholder:text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300"
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* FOOTER */}
      <div className="shrink-0 border-t border-slate-50 pt-3 space-y-2.5 bg-white">

        {/* Customer (opsional) */}
        <div className="space-y-1">
          <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">{t('pos.customerOptional')}</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            <input
              type="text"
              list="customer-list"
              value={selectedCustomerName}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCustomerName(val);
                const match = customers.find(c => c.name.toLowerCase() === val.toLowerCase());
                setSelectedCustomerId(match?.id || '');
              }}
              placeholder={t('pos.customerPlaceholder')}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:font-medium"
            />
            <datalist id="customer-list">
              {customers.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>
        </div>

        {/* Payment method */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">{t('pos.paymentMethod')}</label>
          <div className="grid grid-cols-3 gap-1.5">
            {paymentMethods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`rounded-xl p-2 border text-[10px] font-bold transition-all cursor-pointer active:scale-95 ${
                  paymentMethod === m
                    ? 'border-indigo-400 bg-indigo-50/30 text-indigo-700 shadow-sm'
                    : 'border-slate-100 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Promo */}
        {activePromos.length > 0 && (
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">{t('pos.promo')}</label>
            <select
              value={selectedPromoId}
              onChange={(e) => setSelectedPromoId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:border-indigo-500"
            >
              <option value="">{t('pos.noPromo')}</option>
              {activePromos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type === 'percentage' ? `${p.value}%` : `Rp ${fmt(p.value)}`})
                </option>
              ))}
            </select>
            {promoDiscount > 0 && (
              <p className="text-[10px] font-bold text-emerald-600">Hemat Rp {fmt(promoDiscount)}</p>
            )}
          </div>
        )}

        {/* Diskon transaksi */}
        {showDiscount ? (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              <input
                type="number"
                value={transactionDiscount || ''}
                onChange={(e) => setTransactionDiscount(Number(e.target.value) || 0)}
                placeholder={t('pos.txDiscount')}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button onClick={() => { setShowDiscount(false); setTransactionDiscount(0); }} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 px-2">{t('common.cancel')}</button>
          </div>
        ) : (
          <button onClick={() => setShowDiscount(true)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            <Percent className="h-3 w-3" /> {t('pos.addTxDiscount')}
          </button>
        )}

        {/* Cash input */}
        {isCash && (
          <div className="space-y-1">
            <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">{t('pos.cashReceived')}</label>
            <div className="relative">
              <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              <input
                type="number"
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                placeholder="Rp 0"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Price breakdown */}
        <div className="bg-slate-50/50 border border-slate-100 px-3 py-2.5 rounded-2xl space-y-1.5">
          <Row label={t('pos.subtotal')} value={totals.subtotal} />
          {totals.itemDiscount > 0 && <Row label={t('pos.itemDisc')} value={-totals.itemDiscount} negative />}
          {totals.transactionDiscount > 0 && <Row label={t('pos.txDisc')} value={-totals.transactionDiscount} negative />}
          {settings.tax_rate > 0 && <Row label={`${t('pos.tax')} (${settings.tax_rate}%)`} value={totals.tax} />}
          {totals.serviceCharge > 0 && <Row label={t('pos.service')} value={totals.serviceCharge} />}
          {totals.rounding !== 0 && <Row label={t('pos.rounding')} value={totals.rounding} />}
          <div className="flex justify-between text-xs font-extrabold text-slate-800 pt-1.5 border-t border-slate-100">
            <span>{t('common.total')}</span>
            <span>Rp {fmt(totals.grandTotal)}</span>
          </div>
          {isCash && paidAmount > 0 && (
            <div className="flex justify-between text-[11px] font-extrabold text-emerald-600">
              <span>{t('pos.change')}</span>
              <span>Rp {fmt(Math.max(0, totals.change))}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onHold}
            disabled={cart.length === 0}
            className="flex items-center justify-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 font-bold py-3 px-3 rounded-2xl text-xs cursor-pointer transition-all"
            title={t('pos.hold')}
          >
            <Pause className="h-4 w-4" />
          </button>
          <button
            onClick={onCheckout}
            disabled={cart.length === 0}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-200 transition-all cursor-pointer hover:scale-[1.01]"
          >
            <span>{t('pos.pay')}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

      </div>
    </div>
    </>
  );
}

function Row({ label, value, negative }: { label: string; value: number; negative?: boolean }) {
  return (
    <div className="flex justify-between text-[10px] font-semibold text-slate-500">
      <span>{label}</span>
      <span className={negative ? 'text-rose-500' : ''}>Rp {fmt(value)}</span>
    </div>
  );
}
