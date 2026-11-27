import type { Product, ProductVariant } from '../../api/types';

export interface BarcodeMatch {
  product: Product;
  variant?: ProductVariant;
}

/**
 * Cari produk berdasarkan barcode/SKU persis (exact). Cek produk dulu,
 * lalu varian. Case-insensitive, abaikan spasi.
 */
export function findByBarcode(products: Product[], rawCode: string): BarcodeMatch | null {
  const code = (rawCode || '').trim().toLowerCase();
  if (!code) return null;

  for (const p of products) {
    if ((p.barcode || '').toLowerCase() === code || (p.sku || '').toLowerCase() === code) {
      return { product: p };
    }
  }
  for (const p of products) {
    for (const v of p.variants ?? []) {
      if ((v.barcode || '').toLowerCase() === code || (v.sku || '').toLowerCase() === code) {
        return { product: p, variant: v };
      }
    }
  }
  return null;
}
