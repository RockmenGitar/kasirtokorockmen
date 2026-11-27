import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { dbService, DEFAULT_STORE_SETTINGS } from '../../lib/db';
import type { Product, ProductVariant, Transaction, Category, UserProfile, Customer, StoreSettings, Promo } from '../../lib/db';
import { useStoreData } from '../../hooks/useStoreData';
import { calcPosTotals } from '../../lib/posCalc';
import { useI18n } from '../../lib/i18n';

import ProductGrid from './ProductGrid';
import CartDrawer, { type CartItem } from './CartDrawer';
import OrderSuccessModal from '../../components/modal/OrderSuccessModal';
import BarcodeScannerModal from '../../components/modal/BarcodeScannerModal';
import { useBarcodeScanner } from '../../lib/barcode/useBarcodeScanner';
import { findBarcodeMatches } from '../../lib/barcode/lookup';
import { beepSuccess, beepError } from '../../lib/barcode/beep';
import HelpBadge from '../../components/ui/HelpBadge';
import { Camera } from 'lucide-react';

interface POSSectionProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh: () => void;
  currentUser: UserProfile;
}

export default function POSSection({ storeId, refreshTrigger, triggerRefresh, currentUser }: POSSectionProps) {
  const { t } = useI18n();
  const [products] = useStoreData<Product[]>(dbService.getProducts, storeId, refreshTrigger, []);
  const [categories] = useStoreData<Category[]>(dbService.getCategories, storeId, refreshTrigger, []);
  const [customers] = useStoreData<Customer[]>(dbService.getCustomers, storeId, refreshTrigger, []);

  const cartKey = `kasirnya_cart_${storeId}`;
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(cartKey);
      return raw ? JSON.parse(raw) as CartItem[] : [];
    } catch { return []; }
  });
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);

  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('QRIS');
  const [transactionDiscount, setTransactionDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const [activePromos, setActivePromos] = useState<Promo[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState('');

  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const feedbackTimer = useRef<number | null>(null);

  const showScanFeedback = (type: 'ok' | 'err', text: string) => {
    setScanFeedback({ type, text });
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setScanFeedback(null), 2200);
  };

  useEffect(() => {
    dbService.getActivePromos(storeId).then(setActivePromos).catch(() => {});
  }, [storeId, refreshTrigger]);

  useEffect(() => {
    dbService.getSettings(storeId).then(s => {
      setSettings(s);
      if (s.payment_methods?.length) setPaymentMethod(s.payment_methods[1] || s.payment_methods[0]);
    }).catch(() => {});
  }, [storeId, refreshTrigger]);

  useEffect(() => {
    try {
      if (cart.length === 0) localStorage.removeItem(cartKey);
      else localStorage.setItem(cartKey, JSON.stringify(cart));
    } catch {}
  }, [cart, cartKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(cartKey);
      setCart(raw ? JSON.parse(raw) as CartItem[] : []);
    } catch { setCart([]); }
  }, [storeId, cartKey]);

  // Cart actions
  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const exists = prev.find(item => item.product.id === product.id);
      if (exists) {
        if (exists.quantity >= product.stock_quantity) {
          alert(`Stok tidak cukup! Hanya ${product.stock_quantity} tersedia.`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      if (product.stock_quantity <= 0) {
        alert('Stok produk habis.');
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  // Tambah produk (+varian) tertentu ke keranjang.
  const addScannedMatch = useCallback((product: Product, variant?: ProductVariant) => {
    const effPrice = variant ? variant.price : product.price;
    const effStock = variant ? variant.stock_quantity : product.stock_quantity;
    setCart(prev => {
      const key = variant ? `${product.id}::${variant.id}` : product.id;
      const exists = prev.find(i => (i.variant ? `${i.product.id}::${i.variant.id}` : i.product.id) === key);
      if (exists) {
        if (exists.quantity >= effStock) {
          beepError();
          showScanFeedback('err', `Stok ${product.name} tidak cukup`);
          return prev;
        }
        return prev.map(i => ((i.variant ? `${i.product.id}::${i.variant.id}` : i.product.id) === key)
          ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (effStock <= 0) {
        beepError();
        showScanFeedback('err', `Stok ${product.name} habis`);
        return prev;
      }
      const item: CartItem = {
        product: { ...product, price: effPrice, stock_quantity: effStock },
        quantity: 1,
        ...(variant ? { variant } : {}),
      };
      return [...prev, item];
    });
    beepSuccess();
    showScanFeedback('ok', `${product.name}${variant ? ` (${variant.name})` : ''} ditambahkan`);
  }, []);

  // Barcode cocok dengan beberapa varian → minta pilih.
  const [variantPicker, setVariantPicker] = useState<{ product: Product; variants: ProductVariant[] } | null>(null);

  // Tambah ke keranjang dari hasil scan barcode (bisa produk atau varian)
  const handleBarcodeScan = useCallback((code: string) => {
    const matches = findBarcodeMatches(products, code);
    if (matches.length === 0) {
      beepError();
      showScanFeedback('err', `Barcode "${code}" tidak ditemukan`);
      return;
    }
    if (matches.length === 1) {
      addScannedMatch(matches[0].product, matches[0].variant);
      return;
    }
    // Beberapa hasil: bila semuanya menunjuk produk yang sama dengan beberapa varian → minta pilih.
    const uniqueProducts = new Set(matches.map(m => m.product.id));
    if (uniqueProducts.size === 1) {
      const product = matches[0].product;
      const variants = matches.filter(m => m.variant).map(m => m.variant!) as ProductVariant[];
      if (variants.length > 1) {
        setVariantPicker({ product, variants });
        return;
      }
    }
    // Fallback: ambil kandidat pertama
    addScannedMatch(matches[0].product, matches[0].variant);
  }, [products, addScannedMatch]);

  useBarcodeScanner({ onScan: handleBarcodeScan });

  const handleUpdateCartQty = (productId: string, quantity: number) => {
    if (quantity <= 0) { handleRemoveFromCart(productId); return; }
    const product = products.find(p => p.id === productId);
    if (product && quantity > product.stock_quantity) {
      alert(`Stok tidak cukup! Hanya ${product.stock_quantity} tersedia.`);
      return;
    }
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity } : item));
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleUpdateCartNote = (productId: string, note: string) => {
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, note } : item));
  };

  const handleUpdateItemDiscount = (productId: string, discount: number) => {
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, discount } : item));
  };

  // Promo discount derived from the selected active promo (respects min purchase)
  const promoDiscount = useMemo(() => {
    const promo = activePromos.find(p => p.id === selectedPromoId);
    if (!promo) return 0;
    const rawSubtotal = cart.reduce((s, i) => s + i.product.price * i.quantity - (i.discount || 0), 0);
    if (promo.min_purchase && rawSubtotal < promo.min_purchase) return 0;
    return promo.type === 'percentage' ? Math.round(rawSubtotal * (promo.value / 100)) : promo.value;
  }, [activePromos, selectedPromoId, cart]);

  // Diskon khusus pelanggan terpilih (persen) — otomatis saat pelanggan dipilih.
  const customerDiscount = useMemo(() => {
    if (!customerId) return 0;
    const cust = customers.find(c => c.id === customerId);
    const pct = cust?.discount_percent || 0;
    if (pct <= 0) return 0;
    const rawSubtotal = cart.reduce((s, i) => s + i.product.price * i.quantity - (i.discount || 0), 0);
    return Math.round(rawSubtotal * (pct / 100));
  }, [customers, customerId, cart]);

  const effectiveTransactionDiscount = transactionDiscount + promoDiscount + customerDiscount;

  const totals = useMemo(
    () => calcPosTotals(
      cart.map(i => ({ product: { id: i.product.id, price: i.product.price }, quantity: i.quantity, discount: i.discount })),
      settings,
      { transactionDiscount: effectiveTransactionDiscount, paidAmount }
    ),
    [cart, settings, effectiveTransactionDiscount, paidAmount]
  );

  const resetCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerId('');
    setTransactionDiscount(0);
    setPaidAmount(0);
    setSelectedPromoId('');
  };

  const handleHold = () => {
    if (cart.length === 0) return;
    try {
      const key = `kasirnya_held_${storeId}`;
      const held = JSON.parse(localStorage.getItem(key) || '[]');
      held.push({ id: `hold-${Date.now()}`, cart, customerName, created_at: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(held));
      resetCart();
      alert('Pesanan disimpan sebagai tertunda.');
    } catch {
      alert('Gagal menyimpan pesanan tertunda.');
    }
  };

  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) return;

    const isKasbon = paymentMethod === 'Kasbon';
    if (isKasbon && !customerId) {
      alert('Kasbon perlu pelanggan terdaftar. Pilih/isi pelanggan yang ada di menu Pelanggan.');
      return;
    }

    const prefix = settings.order_prefix || 'ORD';
    const invoiceNo = `#${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const items = cart.map(item => ({
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      category: item.product.category,
      product_id: item.product.id,
      sku: item.product.sku,
      cost: item.product.cost ?? 0,
      ...(item.discount ? { discount: item.discount } : {}),
      ...(item.note?.trim() ? { note: item.note.trim() } : {}),
    }));

    const cogs = items.reduce((s, i) => s + (i.cost || 0) * i.quantity, 0);

    const transactionPayload = {
      order_id: invoiceNo,
      customer_name: customerName.trim() || 'Umum',
      customer_id: customerId || undefined,
      cashier_name: currentUser.name || (currentUser.role === 'admin' ? 'Admin' : currentUser.email),
      cashier_id: currentUser.id,
      subtotal: totals.subtotal,
      discount: totals.itemDiscount + totals.transactionDiscount,
      tax: totals.tax,
      service_charge: totals.serviceCharge,
      rounding: totals.rounding,
      total_amount: totals.grandTotal,
      cogs,
      payment_method: paymentMethod,
      order_type: settings.payment_methods ? 'Retail' : 'Retail',
      status: isKasbon ? 'Pending' : 'Success',
      paid_amount: isKasbon ? 0 : (paymentMethod === 'Cash' ? (paidAmount || totals.grandTotal) : totals.grandTotal),
      change_amount: paymentMethod === 'Cash' ? totals.change : 0,
      store_id: storeId,
      items,
    };

    const newTx = await dbService.createTransaction(transactionPayload, storeId);

    // Kasbon: catat utang pelanggan
    if (isKasbon) {
      const cust = customers.find(c => c.id === customerId);
      try {
        await dbService.addDebt({
          customer_id: customerId,
          customer_name: cust?.name || customerName.trim() || 'Umum',
          transaction_id: newTx.id,
          order_id: invoiceNo,
          amount: totals.grandTotal,
          note: `Kasbon ${invoiceNo}`,
          user_name: currentUser.name || currentUser.email,
        }, storeId);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Gagal mencatat kasbon.');
      }
    }

    // Decrement stock via inventory ledger (records movement + updates product)
    await Promise.all(cart.map(item => {
      const fresh = products.find(p => p.id === item.product.id) || item.product;
      return dbService.recordMovement({
        product: fresh,
        type: 'sale',
        quantity: -item.quantity,
        reference: invoiceNo,
        reason: `Penjualan ${invoiceNo}`,
        user_name: currentUser.name || currentUser.email,
        threshold: settings.low_stock_threshold,
      });
    }));

    setLastTransaction({ ...newTx, items: items as Transaction['items'] });
    setIsSuccessOpen(true);
    resetCart();
    triggerRefresh();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-fadeIn">

      {/* Scan feedback toast */}
      {scanFeedback && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl shadow-lg text-sm font-bold flex items-center gap-2 animate-fadeIn ${
          scanFeedback.type === 'ok' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          <span>{scanFeedback.type === 'ok' ? '✓' : '✕'}</span>
          <span>{scanFeedback.text}</span>
        </div>
      )}

      {/* Product Grid Area */}
      <div className="flex-1 space-y-6 py-8">
        <div className="flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-extrabold text-slate-800 text-xl leading-none flex items-center gap-2">{t('pos.title')}<HelpBadge text={t('help.pos.header')} /></h2>
            <p className="text-slate-400 text-xs mt-1.5 font-medium">{t('pos.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-full text-[10px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t('pos.scannerActive')}
            </span>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all"
            >
              <Camera className="h-4 w-4" />
              {t('pos.scan')}
            </button>
          </div>
        </div>

        <ProductGrid
          products={products.filter(p => p.active !== false)}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onAddToCart={handleAddToCart}
          onScanCode={handleBarcodeScan}
          categories={categories}
        />
      </div>

      {/* Desktop cart panel */}
      <div className="hidden lg:flex">
        <CartDrawer
          cart={cart}
          onUpdateQty={handleUpdateCartQty}
          onRemove={handleRemoveFromCart}
          onUpdateNote={handleUpdateCartNote}
          onUpdateItemDiscount={handleUpdateItemDiscount}
          selectedCustomerName={customerName}
          setSelectedCustomerName={setCustomerName}
          customers={customers}
          setSelectedCustomerId={setCustomerId}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          settings={settings}
          activePromos={activePromos}
          selectedPromoId={selectedPromoId}
          setSelectedPromoId={setSelectedPromoId}
          promoDiscount={promoDiscount}
          transactionDiscount={transactionDiscount}
          setTransactionDiscount={setTransactionDiscount}
          paidAmount={paidAmount}
          setPaidAmount={setPaidAmount}
          onCheckout={handleCheckoutSubmit}
          onHold={handleHold}
          totals={totals}
        />
      </div>

      {/* Mobile floating cart bar */}
      <button
        onClick={() => setIsMobileCartOpen(true)}
        className="lg:hidden fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-4 rounded-2xl shadow-2xl shadow-indigo-600/30 cursor-pointer"
      >
        <span className="flex items-center gap-2 text-sm">
          <span className="h-6 min-w-6 px-1.5 rounded-lg bg-white/20 flex items-center justify-center text-xs font-extrabold">
            {cart.reduce((s, i) => s + i.quantity, 0)}
          </span>
          <span>{t('pos.cart')}</span>
        </span>
        <span className="text-base font-extrabold">Rp {new Intl.NumberFormat('id-ID').format(totals.grandTotal)}</span>
      </button>

      {/* Mobile cart sheet */}
      {isMobileCartOpen && (
        <div className="lg:hidden">
          <CartDrawer
            isMobileSheet
            onCloseSheet={() => setIsMobileCartOpen(false)}
            cart={cart}
            onUpdateQty={handleUpdateCartQty}
            onRemove={handleRemoveFromCart}
            onUpdateNote={handleUpdateCartNote}
            onUpdateItemDiscount={handleUpdateItemDiscount}
            selectedCustomerName={customerName}
            setSelectedCustomerName={setCustomerName}
            customers={customers}
            setSelectedCustomerId={setCustomerId}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            settings={settings}
            activePromos={activePromos}
            selectedPromoId={selectedPromoId}
            setSelectedPromoId={setSelectedPromoId}
            promoDiscount={promoDiscount}
            transactionDiscount={transactionDiscount}
            setTransactionDiscount={setTransactionDiscount}
            paidAmount={paidAmount}
            setPaidAmount={setPaidAmount}
            onCheckout={() => { setIsMobileCartOpen(false); handleCheckoutSubmit(); }}
            onHold={handleHold}
            totals={totals}
          />
        </div>
      )}

      <OrderSuccessModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        transaction={lastTransaction}
        storeId={storeId}
      />

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetected={handleBarcodeScan}
      />

      {variantPicker && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setVariantPicker(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-extrabold text-slate-800 text-base">{t('recv.pickVariant')}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{variantPicker.product.name}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {variantPicker.variants.map(v => (
                <button
                  key={v.id}
                  onClick={() => { addScannedMatch(variantPicker.product, v); setVariantPicker(null); }}
                  className="text-xs font-bold bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-100 px-3 py-2 rounded-xl cursor-pointer"
                >
                  {v.name} · {t('common.stock')} {v.stock_quantity}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
