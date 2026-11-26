import { useState, useEffect, useMemo } from 'react';
import { dbService, DEFAULT_STORE_SETTINGS } from '../../lib/db';
import type { Product, Transaction, Category, UserProfile, Customer, StoreSettings, Promo } from '../../lib/db';
import { useStoreData } from '../../hooks/useStoreData';
import { calcPosTotals } from '../../lib/posCalc';

import ProductGrid from './ProductGrid';
import CartDrawer, { type CartItem } from './CartDrawer';
import OrderSuccessModal from '../../components/modal/OrderSuccessModal';

interface POSSectionProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh: () => void;
  currentUser: UserProfile;
}

export default function POSSection({ storeId, refreshTrigger, triggerRefresh, currentUser }: POSSectionProps) {
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

  const effectiveTransactionDiscount = transactionDiscount + promoDiscount;

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
      status: 'Success',
      paid_amount: paymentMethod === 'Cash' ? (paidAmount || totals.grandTotal) : totals.grandTotal,
      change_amount: paymentMethod === 'Cash' ? totals.change : 0,
      store_id: storeId,
      items,
    };

    const newTx = await dbService.createTransaction(transactionPayload, storeId);

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

      {/* Product Grid Area */}
      <div className="flex-1 space-y-6 py-8">
        <div className="flex justify-between items-center shrink-0">
          <div>
            <h2 className="font-extrabold text-slate-800 text-xl leading-none">Kasir</h2>
            <p className="text-slate-400 text-xs mt-1.5 font-medium">Cari nama, SKU, atau barcode lalu buat pesanan.</p>
          </div>
        </div>

        <ProductGrid
          products={products.filter(p => p.active !== false)}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onAddToCart={handleAddToCart}
          categories={categories}
        />
      </div>

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

      <OrderSuccessModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        transaction={lastTransaction}
        storeId={storeId}
      />

    </div>
  );
}
