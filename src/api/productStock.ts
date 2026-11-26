import { supabase } from './client';
import { fromCache, toCache, bustCache } from './cache';
import { readCollection, writeCollection, deriveStockStatus } from './localStore';
import type { ProductStock } from './types';

const COLLECTION = 'product_stock';

/**
 * Per-outlet stock layer. A product's `stock_quantity` remains the global/default,
 * while this maps (product_id, store_id) → quantity so each outlet can hold its own stock.
 */
export const productStockService = {
  async getStockMap(storeId: number): Promise<Record<string, number>> {
    const cacheKey = `product_stock_${storeId}`;
    const cached = fromCache<Record<string, number>>(cacheKey);
    if (cached) return cached;

    let rows: ProductStock[] = [];
    if (supabase) {
      const { data, error } = await supabase
        .from('product_stock').select('*').eq('store_id', storeId);
      if (!error && data) {
        rows = (data as any[]).map(d => ({
          product_id: d.product_id,
          store_id: Number(d.store_id),
          stock_quantity: Number(d.stock_quantity),
          stock_status: d.stock_status,
        }));
      }
    } else {
      rows = readCollection<ProductStock>(COLLECTION).filter(s => s.store_id === storeId);
    }

    const map: Record<string, number> = {};
    rows.forEach(r => { map[r.product_id] = r.stock_quantity; });
    toCache(cacheKey, map);
    return map;
  },

  async setStock(productId: string, storeId: number, quantity: number, threshold = 5): Promise<void> {
    const status = deriveStockStatus(quantity, threshold);
    if (supabase) {
      const { error } = await supabase
        .from('product_stock')
        .upsert([{ product_id: productId, store_id: storeId, stock_quantity: quantity, stock_status: status }],
          { onConflict: 'product_id,store_id' });
      if (error) throw new Error(error.message);
      bustCache(`product_stock_${storeId}`);
      return;
    }
    const rows = readCollection<ProductStock>(COLLECTION);
    const idx = rows.findIndex(r => r.product_id === productId && r.store_id === storeId);
    const next: ProductStock = { product_id: productId, store_id: storeId, stock_quantity: quantity, stock_status: status };
    if (idx === -1) rows.push(next);
    else rows[idx] = next;
    writeCollection(COLLECTION, rows);
    bustCache(`product_stock_${storeId}`);
  },

  /** Remove per-outlet override (product falls back to global stock). */
  async clearStock(productId: string, storeId: number): Promise<void> {
    if (supabase) {
      await supabase.from('product_stock').delete().eq('product_id', productId).eq('store_id', storeId);
      bustCache(`product_stock_${storeId}`);
      return;
    }
    writeCollection(COLLECTION, readCollection<ProductStock>(COLLECTION)
      .filter(r => !(r.product_id === productId && r.store_id === storeId)));
    bustCache(`product_stock_${storeId}`);
  },
};
