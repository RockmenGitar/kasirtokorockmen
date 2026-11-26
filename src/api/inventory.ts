import { supabase } from './client';
import { fromCache, toCache, bustCache } from './cache';
import { readCollection, writeCollection, genId, nowISO, deriveStockStatus } from './localStore';
import { productStockService } from './productStock';
import type { StockMovement, Product } from './types';

const COLLECTION = 'stock_movements';

export const stockMovementService = {
  async getMovements(storeId: number, opts?: { productId?: string; limit?: number }): Promise<StockMovement[]> {
    const cacheKey = `movements_${storeId}${opts?.productId ? `_${opts.productId}` : ''}`;
    const cached = fromCache<StockMovement[]>(cacheKey);
    if (cached) return cached;

    let result: StockMovement[] = [];
    if (supabase) {
      let query = supabase.from('stock_movements').select('*').eq('store_id', storeId)
        .order('created_at', { ascending: false });
      if (opts?.productId) query = query.eq('product_id', opts.productId);
      const { data, error } = await query;
      if (error) {
        console.error('Supabase getMovements error, falling back to LocalStorage', error);
      } else if (data) {
        result = data.map(d => ({ ...d, store_id: Number(d.store_id) })) as StockMovement[];
      }
    }

    if (result.length === 0) {
      result = readCollection<StockMovement>(COLLECTION)
        .filter(m => m.store_id === storeId && (!opts?.productId || m.product_id === opts.productId))
        .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }

    toCache(cacheKey, result);
    return result;
  },

  /**
   * Record a stock movement and adjust the product stock atomically (demo mode).
   * `quantity` is the delta (negative = stock out).
   */
  async recordMovement(input: {
    product: Product;
    type: StockMovement['type'];
    quantity: number;
    reason?: string;
    reference?: string;
    user_name?: string;
    threshold?: number;
  }): Promise<StockMovement> {
    const { product } = input;
    const stockBefore = product.stock_quantity || 0;
    const stockAfter = Math.max(0, stockBefore + input.quantity);
    const threshold = input.threshold ?? product.min_stock ?? 5;
    const newStatus = deriveStockStatus(stockAfter, threshold);

    const movement: StockMovement = {
      id: genId('mv'),
      created_at: nowISO(),
      product_id: product.id,
      product_name: product.name,
      type: input.type,
      quantity: input.quantity,
      stock_before: stockBefore,
      stock_after: stockAfter,
      reason: input.reason,
      reference: input.reference,
      store_id: product.store_id,
      user_name: input.user_name,
    };

    if (supabase) {
      // Atomic path: single RPC locks the row, validates, updates stock and logs the movement.
      const { error } = await supabase.rpc('adjust_stock', {
        p_product_id: product.id,
        p_store_id: product.store_id,
        p_quantity: input.quantity,
        p_type: input.type,
        p_reason: input.reason ?? null,
        p_reference: input.reference ?? null,
        p_user_name: input.user_name ?? null,
      });
      if (error) {
        // Surface stock conflicts so the UI can react instead of silently overselling.
        throw new Error(error.message || 'Gagal menyesuaikan stok.');
      }
    } else {
      const products = readCollection<Product>('products');
      const idx = products.findIndex(p => p.id === product.id && p.store_id === product.store_id);
      if (idx !== -1) {
        products[idx].stock_quantity = stockAfter;
        products[idx].stock_status = newStatus;
        writeCollection('products', products);
      }
      const movements = readCollection<StockMovement>(COLLECTION);
      movements.push(movement);
      writeCollection(COLLECTION, movements);
    }

    // Persist per-outlet stock override so outlets hold independent stock.
    try {
      await productStockService.setStock(product.id, product.store_id, stockAfter, threshold);
    } catch { /* non-fatal */ }

    bustCache(
      `products_${product.store_id}`,
      `movements_${product.store_id}`,
      `movements_${product.store_id}_${product.id}`,
      `product_stock_${product.store_id}`,
    );
    return movement;
  },

  /**
   * Set stock to an exact value (stock opname). Records the difference as a movement.
   */
  async setStock(input: {
    product: Product;
    newQuantity: number;
    reason?: string;
    user_name?: string;
    threshold?: number;
  }): Promise<StockMovement | null> {
    const diff = input.newQuantity - (input.product.stock_quantity || 0);
    if (diff === 0) return null;
    return this.recordMovement({
      product: input.product,
      type: 'opname',
      quantity: diff,
      reason: input.reason ?? 'Stok opname',
      user_name: input.user_name,
      threshold: input.threshold,
    });
  },
};
