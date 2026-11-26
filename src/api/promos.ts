import { supabase } from './client';
import { fromCache, toCache, bustCache } from './cache';
import { readCollection, writeCollection, genId, nowISO, toDateStr } from './localStore';
import type { Promo } from './types';

const COLLECTION = 'promos';

export const promoService = {
  async getPromos(storeId: number): Promise<Promo[]> {
    const cacheKey = `promos_${storeId}`;
    const cached = fromCache<Promo[]>(cacheKey);
    if (cached) return cached;

    if (supabase) {
      const { data, error } = await supabase
        .from('promos').select('*').eq('store_id', storeId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase getPromos error, falling back to LocalStorage', error);
      } else if (data) {
        const result = data.map(d => ({ ...d, store_id: Number(d.store_id) })) as Promo[];
        toCache(cacheKey, result);
        return result;
      }
    }

    const result = readCollection<Promo>(COLLECTION).filter(p => p.store_id === storeId);
    toCache(cacheKey, result);
    return result;
  },

  /** Promos that are currently active (by date window and active flag). */
  async getActivePromos(storeId: number): Promise<Promo[]> {
    const all = await this.getPromos(storeId);
    const today = toDateStr(new Date());
    return all.filter(p =>
      p.active &&
      (!p.start_date || p.start_date <= today) &&
      (!p.end_date || p.end_date >= today)
    );
  },

  async addPromo(promo: Omit<Promo, 'id' | 'created_at' | 'store_id'>, storeId: number): Promise<Promo> {
    const newPromo: Promo = { ...promo, id: genId('promo'), store_id: storeId, created_at: nowISO() };
    if (supabase) {
      const { data, error } = await supabase
        .from('promos').insert([{ ...promo, store_id: storeId }]).select().single();
      if (error) throw new Error(error.message);
      bustCache(`promos_${storeId}`);
      return { ...data, store_id: Number(data.store_id) } as Promo;
    }
    const items = readCollection<Promo>(COLLECTION);
    items.push(newPromo);
    writeCollection(COLLECTION, items);
    bustCache(`promos_${storeId}`);
    return newPromo;
  },

  async updatePromo(id: string, updates: Partial<Omit<Promo, 'id' | 'store_id'>>, storeId: number): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('promos').update(updates).eq('id', id).eq('store_id', storeId);
      if (error) throw new Error(error.message);
      bustCache(`promos_${storeId}`);
      return;
    }
    const items = readCollection<Promo>(COLLECTION).map(p =>
      p.id === id && p.store_id === storeId ? { ...p, ...updates } : p
    );
    writeCollection(COLLECTION, items);
    bustCache(`promos_${storeId}`);
  },

  async deletePromo(id: string, storeId: number): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('promos').delete().eq('id', id).eq('store_id', storeId);
      if (error) throw new Error(error.message);
      bustCache(`promos_${storeId}`);
      return;
    }
    writeCollection(COLLECTION, readCollection<Promo>(COLLECTION).filter(p => !(p.id === id && p.store_id === storeId)));
    bustCache(`promos_${storeId}`);
  },
};
