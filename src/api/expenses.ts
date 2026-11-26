import { supabase } from './client';
import { fromCache, toCache, bustCache } from './cache';
import { readCollection, writeCollection, genId, nowISO } from './localStore';
import type { Expense } from './types';

const COLLECTION = 'expenses';

export const expenseService = {
  async getExpenses(storeId: number): Promise<Expense[]> {
    const cacheKey = `expenses_${storeId}`;
    const cached = fromCache<Expense[]>(cacheKey);
    if (cached) return cached;

    if (supabase) {
      const { data, error } = await supabase
        .from('expenses').select('*').eq('store_id', storeId)
        .order('date', { ascending: false });
      if (error) {
        console.error('Supabase getExpenses error, falling back to LocalStorage', error);
      } else if (data) {
        const result = data.map(d => ({ ...d, store_id: Number(d.store_id) })) as Expense[];
        toCache(cacheKey, result);
        return result;
      }
    }

    const result = readCollection<Expense>(COLLECTION)
      .filter(e => e.store_id === storeId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    toCache(cacheKey, result);
    return result;
  },

  async addExpense(expense: Omit<Expense, 'id' | 'created_at' | 'store_id'>, storeId: number): Promise<Expense> {
    const newExpense: Expense = {
      ...expense,
      id: genId('exp'),
      store_id: storeId,
      created_at: nowISO(),
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('expenses').insert([{ ...expense, store_id: storeId }]).select().single();
      if (error) throw new Error(error.message);
      bustCache(`expenses_${storeId}`);
      return { ...data, store_id: Number(data.store_id) } as Expense;
    }

    const items = readCollection<Expense>(COLLECTION);
    items.push(newExpense);
    writeCollection(COLLECTION, items);
    bustCache(`expenses_${storeId}`);
    return newExpense;
  },

  async updateExpense(id: string, updates: Partial<Omit<Expense, 'id' | 'store_id'>>, storeId: number): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('expenses').update(updates).eq('id', id).eq('store_id', storeId);
      if (error) throw new Error(error.message);
      bustCache(`expenses_${storeId}`);
      return;
    }
    const items = readCollection<Expense>(COLLECTION).map(e =>
      e.id === id && e.store_id === storeId ? { ...e, ...updates } : e
    );
    writeCollection(COLLECTION, items);
    bustCache(`expenses_${storeId}`);
  },

  async deleteExpense(id: string, storeId: number): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('expenses').delete().eq('id', id).eq('store_id', storeId);
      if (error) throw new Error(error.message);
      bustCache(`expenses_${storeId}`);
      return;
    }
    writeCollection(COLLECTION, readCollection<Expense>(COLLECTION).filter(e => !(e.id === id && e.store_id === storeId)));
    bustCache(`expenses_${storeId}`);
  },
};
