import type { Product, ProductVariant } from '../../api/types';

export interface BarcodeMatch {
  product: Product;
  variant?: ProductVariant;
}

/**
 * Cari produk berdasarkan barcode/SKU persis (exact). Case-insensitive.
 * Mengembalikan SEMUA kandidat agar pemanggil bisa menangani kasus
 * satu barcode cocok dengan beberapa varian.
 */
export function findBarcodeMatches(products: Product[], rawCode: string): BarcodeMatch[] {
  const code = (rawCode || '').trim().toLowerCase();
  if (!code) return [];

  const matches: BarcodeMatch[] = [];
  for (const p of products) {
    if ((p.barcode || '').toLowerCase() === code || (p.sku || '').toLowerCase() === code) {
      matches.push({ product: p });
    }
  }
  for (const p of products) {
    for (const v of p.variants ?? []) {
      if ((v.barcode || '').toLowerCase() === code || (v.sku || '').toLowerCase() === code) {
        matches.push({ product: p, variant: v });
      }
    }
  }
  return matches;
}

/**
 * Versi ringkas: mengembalikan kandidat pertama (kompatibel untuk pemakaian lama).
 */
export function findByBarcode(products: Product[], rawCode: string): BarcodeMatch | null {
  const matches = findBarcodeMatches(products, rawCode);
  return matches.length > 0 ? matches[0] : null;
}
