import { supabase } from './client';
import { fromCache, toCache, bustCache } from './cache';
import { readCollection, writeCollection, genId, nowISO } from './localStore';
import type { Debt } from './types';

const COLLECTION = 'debts';

function deriveStatus(amount: number, paid: number): Debt['status'] {
  if (paid <= 0) return 'unpaid';
  if (paid + 0.001 >= amount) return 'paid';
  return 'partial';
}

export const debtService = {
  async getDebts(storeId: number): Promise<Debt[]> {
    const cacheKey = `debts_${storeId}`;
    const cached = fromCache<Debt[]>(cacheKey);
    if (cached) return cached;

    if (supabase) {
      const { data, error } = await supabase
        .from('debts').select('*').eq('store_id', storeId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase getDebts error, falling back to LocalStorage', error);
      } else if (data) {
        const result = data.map(d => ({ ...d, store_id: Number(d.store_id), amount: Number(d.amount), paid_amount: Number(d.paid_amount) })) as Debt[];
        toCache(cacheKey, result);
        return result;
      }
    }

    const result = readCollection<Debt>(COLLECTION)
      .filter(d => d.store_id === storeId)
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    toCache(cacheKey, result);
    return result;
  },

  async addDebt(input: Omit<Debt, 'id' | 'created_at' | 'store_id' | 'paid_amount' | 'status'>, storeId: number): Promise<Debt> {
    const debt: Debt = {
      ...input,
      id: genId('debt'),
      paid_amount: 0,
      status: 'unpaid',
      store_id: storeId,
      created_at: nowISO(),
    };
    if (supabase) {
      const { data, error } = await supabase
        .from('debts').insert([{ ...input, paid_amount: 0, status: 'unpaid', store_id: storeId }]).select().single();
      if (error) throw new Error(error.message);
      bustCache(`debts_${storeId}`);
      return { ...data, store_id: Number(data.store_id) } as Debt;
    }
    const items = readCollection<Debt>(COLLECTION);
    items.push(debt);
    writeCollection(COLLECTION, items);
    bustCache(`debts_${storeId}`);
    return debt;
  },

  /** Bayar cicilan utang. */
  async payDebt(debt: Debt, payAmount: number, storeId: number, user_name?: string, note?: string): Promise<void> {
    const newPaid = Math.min(debt.amount, (debt.paid_amount || 0) + payAmount);
    const status = deriveStatus(debt.amount, newPaid);

    if (supabase) {
      const { error } = await supabase
        .from('debts').update({ paid_amount: newPaid, status }).eq('id', debt.id).eq('store_id', storeId);
      if (error) throw new Error(error.message);
      await supabase.from('debt_payments').insert([{
        debt_id: debt.id, amount: payAmount, note: note ?? null, user_name: user_name ?? null, store_id: storeId,
      }]);
      bustCache(`debts_${storeId}`);
      return;
    }

    const items = readCollection<Debt>(COLLECTION).map(d =>
      d.id === debt.id && d.store_id === storeId ? { ...d, paid_amount: newPaid, status } : d
    );
    writeCollection(COLLECTION, items);
    const pays = readCollection<{ id: string; debt_id: string; amount: number; note?: string; user_name?: string; store_id: number; created_at: string }>('debt_payments');
    pays.push({ id: genId('pay'), debt_id: debt.id, amount: payAmount, note, user_name, store_id: storeId, created_at: nowISO() });
    writeCollection('debt_payments', pays);
    bustCache(`debts_${storeId}`);
  },

  async deleteDebt(id: string, storeId: number): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('debts').delete().eq('id', id).eq('store_id', storeId);
      if (error) throw new Error(error.message);
      bustCache(`debts_${storeId}`);
      return;
    }
    writeCollection(COLLECTION, readCollection<Debt>(COLLECTION).filter(d => !(d.id === id && d.store_id === storeId)));
    bustCache(`debts_${storeId}`);
  },
};
