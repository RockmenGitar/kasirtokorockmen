import { supabase } from './client';
import { fromCache, toCache, bustCache } from './cache';
import { readCollection, writeCollection, genId, nowISO } from './localStore';
import type { Refund } from './types';

const COLLECTION = 'refunds';

export const refundService = {
  async getRefunds(storeId: number): Promise<Refund[]> {
    const cacheKey = `refunds_${storeId}`;
    const cached = fromCache<Refund[]>(cacheKey);
    if (cached) return cached;

    if (supabase) {
      const { data, error } = await supabase
        .from('refunds').select('*').eq('store_id', storeId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase getRefunds error, falling back to LocalStorage', error);
      } else if (data) {
        const result = data.map(d => ({ ...d, store_id: Number(d.store_id) })) as Refund[];
        toCache(cacheKey, result);
        return result;
      }
    }

    const result = readCollection<Refund>(COLLECTION)
      .filter(r => r.store_id === storeId)
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    toCache(cacheKey, result);
    return result;
  },

  async addRefund(refund: Omit<Refund, 'id' | 'created_at' | 'store_id'>, storeId: number): Promise<Refund> {
    const newRefund: Refund = { ...refund, id: genId('ref'), store_id: storeId, created_at: nowISO() };
    if (supabase) {
      const { data, error } = await supabase
        .from('refunds').insert([{ ...refund, store_id: storeId }]).select().single();
      if (error) throw new Error(error.message);
      bustCache(`refunds_${storeId}`);
      return { ...data, store_id: Number(data.store_id) } as Refund;
    }
    const items = readCollection<Refund>(COLLECTION);
    items.push(newRefund);
    writeCollection(COLLECTION, items);
    bustCache(`refunds_${storeId}`);
    return newRefund;
  },

  async getRefundedAmountByOrder(orderId: string, storeId: number): Promise<number> {
    const refunds = await this.getRefunds(storeId);
    return refunds.filter(r => r.order_id === orderId).reduce((s, r) => s + (r.amount || 0), 0);
  },
};
