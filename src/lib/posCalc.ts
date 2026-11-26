import type { StoreSettings } from '../api/types';

export interface PosCartItem {
  product: { id: string; price: number };
  quantity: number;
  discount?: number;
}

export interface PosTotals {
  subtotal: number;
  itemDiscount: number;
  transactionDiscount: number;
  taxable: number;
  tax: number;
  serviceCharge: number;
  rounding: number;
  grandTotal: number;
  change: number;
}

/**
 * Central POS calculation. Handles item discounts, transaction discount,
 * tax-inclusive vs tax-exclusive pricing, service charge, rounding and cash change.
 */
export function calcPosTotals(
  items: PosCartItem[],
  settings: StoreSettings,
  options?: { transactionDiscount?: number; paidAmount?: number }
): PosTotals {
  const rawSubtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const itemDiscount = items.reduce((sum, i) => sum + (i.discount || 0), 0);
  const transactionDiscount = options?.transactionDiscount || 0;

  const afterDiscount = Math.max(0, rawSubtotal - itemDiscount - transactionDiscount);

  const taxRate = (settings.tax_rate || 0) / 100;
  const serviceRate = (settings.service_charge_rate || 0) / 100;

  let taxable: number;
  let tax: number;

  if (settings.tax_included) {
    // afterDiscount already includes tax; derive the base and the tax portion
    taxable = taxRate > 0 ? afterDiscount / (1 + taxRate) : afterDiscount;
    tax = afterDiscount - taxable;
  } else {
    taxable = afterDiscount;
    tax = afterDiscount * taxRate;
  }

  const serviceCharge = taxable * serviceRate;
  const preRounding = taxable + tax + serviceCharge;

  let rounding = 0;
  const step = settings.rounding || 0;
  let grandTotal = preRounding;
  if (step > 0) {
    grandTotal = Math.round(preRounding / step) * step;
    rounding = grandTotal - preRounding;
  }
  grandTotal = Math.round(grandTotal);

  const change = Math.max(0, (options?.paidAmount || 0) - grandTotal);

  return {
    subtotal: Math.round(rawSubtotal),
    itemDiscount: Math.round(itemDiscount),
    transactionDiscount: Math.round(transactionDiscount),
    taxable: Math.round(taxable),
    tax: Math.round(tax),
    serviceCharge: Math.round(serviceCharge),
    rounding: Math.round(rounding),
    grandTotal,
    change: Math.round(change),
  };
}
