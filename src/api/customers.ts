import { supabase } from './client';
import { fromCache, toCache, bustCache } from './cache';
import { readCollection, writeCollection, genId, nowISO } from './localStore';
import type { Customer } from './types';

const COLLECTION = 'customers';

export const customerService = {
  async getCustomers(storeId: number): Promise<Customer[]> {
    const cacheKey = `customers_${storeId}`;
    const cached = fromCache<Customer[]>(cacheKey);
    if (cached) return cached;

    if (supabase) {
      const { data, error } = await supabase
        .from('customers').select('*').eq('store_id', storeId)
        .order('name', { ascending: true });
      if (error) {
        console.error('Supabase getCustomers error, falling back to LocalStorage', error);
      } else if (data) {
        const result = data.map(d => ({ ...d, store_id: Number(d.store_id) })) as Customer[];
        toCache(cacheKey, result);
        return result;
      }
    }

    const result = readCollection<Customer>(COLLECTION)
      .filter(c => c.store_id === storeId)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    toCache(cacheKey, result);
    return result;
  },

  async addCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'store_id'>, storeId: number): Promise<Customer> {
    const newCustomer: Customer = {
      ...customer,
      id: genId('cust'),
      store_id: storeId,
      created_at: nowISO(),
      points: customer.points ?? 0,
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('customers').insert([{ ...customer, store_id: storeId }]).select().single();
      if (error) throw new Error(error.message);
      bustCache(`customers_${storeId}`);
      return { ...data, store_id: Number(data.store_id) } as Customer;
    }

    const items = readCollection<Customer>(COLLECTION);
    items.push(newCustomer);
    writeCollection(COLLECTION, items);
    bustCache(`customers_${storeId}`);
    return newCustomer;
  },

  async updateCustomer(id: string, updates: Partial<Omit<Customer, 'id' | 'store_id'>>, storeId: number): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('customers').update(updates).eq('id', id).eq('store_id', storeId);
      if (error) throw new Error(error.message);
      bustCache(`customers_${storeId}`);
      return;
    }
    const items = readCollection<Customer>(COLLECTION).map(c =>
      c.id === id && c.store_id === storeId ? { ...c, ...updates } : c
    );
    writeCollection(COLLECTION, items);
    bustCache(`customers_${storeId}`);
  },

  async deleteCustomer(id: string, storeId: number): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('customers').delete().eq('id', id).eq('store_id', storeId);
      if (error) throw new Error(error.message);
      bustCache(`customers_${storeId}`);
      return;
    }
    writeCollection(COLLECTION, readCollection<Customer>(COLLECTION).filter(c => !(c.id === id && c.store_id === storeId)));
    bustCache(`customers_${storeId}`);
  },

  async adjustPoints(id: string, delta: number, storeId: number): Promise<void> {
    const items = readCollection<Customer>(COLLECTION);
    const idx = items.findIndex(c => c.id === id && c.store_id === storeId);
    if (idx !== -1) {
      items[idx].points = Math.max(0, (items[idx].points || 0) + delta);
      writeCollection(COLLECTION, items);
      bustCache(`customers_${storeId}`);
    }
  },
};
