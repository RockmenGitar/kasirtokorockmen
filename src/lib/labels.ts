/**
 * labels.ts
 * Pemetaan nilai DB → kunci kamus i18n, agar bisa dwibahasa.
 * Pemakaian: t(mapStockStatus(product.stock_status))
 */

export function stockStatusKey(status?: string): string {
  switch (status) {
    case 'In Stock': return 'status.instock';
    case 'Low Stock': return 'status.lowstock';
    case 'Out of Stock': return 'status.outstock';
    default: return status || '-';
  }
}

export function txStatusKey(status?: string): string {
  switch (status) {
    case 'Success': return 'status.success';
    case 'Pending': return 'status.pending';
    case 'Refunded': return 'status.refunded';
    case 'Cancelled': return 'status.cancelled';
    default: return status || '-';
  }
}

export function paymentKey(method?: string): string {
  switch (method) {
    case 'Cash': return 'pay.cash';
    case 'QRIS': return 'pay.qris';
    case 'Transfer': return 'pay.transfer';
    case 'Debit': return 'pay.debit';
    case 'E-Wallet': return 'pay.ewallet';
    default: return method || '-';
  }
}

export function movementKey(type?: string): string {
  const map: Record<string, string> = {
    in: 'mv.in', out: 'mv.out', adjustment: 'mv.adjustment', opname: 'mv.opname',
    damage: 'mv.damage', return: 'mv.return', transfer_in: 'mv.transfer_in',
    transfer_out: 'mv.transfer_out', sale: 'mv.sale',
  };
  return (type && map[type]) || type || '-';
}
