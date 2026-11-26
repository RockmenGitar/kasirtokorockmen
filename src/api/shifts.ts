import { supabase } from './client';
import { fromCache, toCache, bustCache } from './cache';
import { readCollection, writeCollection, genId, nowISO } from './localStore';
import type { Shift } from './types';

const COLLECTION = 'shifts';

export const shiftService = {
  async getShifts(storeId: number): Promise<Shift[]> {
    const cacheKey = `shifts_${storeId}`;
    const cached = fromCache<Shift[]>(cacheKey);
    if (cached) return cached;

    if (supabase) {
      const { data, error } = await supabase
        .from('shifts').select('*').eq('store_id', storeId)
        .order('opened_at', { ascending: false });
      if (error) {
        console.error('Supabase getShifts error, falling back to LocalStorage', error);
      } else if (data) {
        const result = data.map(d => ({ ...d, store_id: Number(d.store_id) })) as Shift[];
        toCache(cacheKey, result);
        return result;
      }
    }

    const result = readCollection<Shift>(COLLECTION)
      .filter(s => s.store_id === storeId)
      .sort((a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime());
    toCache(cacheKey, result);
    return result;
  },

  async getOpenShift(storeId: number, cashierId?: string): Promise<Shift | null> {
    const shifts = await this.getShifts(storeId);
    return shifts.find(s => s.status === 'open' && (!cashierId || s.cashier_id === cashierId)) ?? null;
  },

  async openShift(input: { cashier_id?: string; cashier_name: string; opening_cash: number }, storeId: number): Promise<Shift> {
    const newShift: Shift = {
      id: genId('shift'),
      opened_at: nowISO(),
      cashier_id: input.cashier_id,
      cashier_name: input.cashier_name,
      opening_cash: input.opening_cash,
      cash_in: 0,
      cash_out: 0,
      status: 'open',
      store_id: storeId,
      created_at: nowISO(),
    };
    if (supabase) {
      const { data, error } = await supabase
        .from('shifts').insert([{ ...input, status: 'open', store_id: storeId }]).select().single();
      if (error) throw new Error(error.message);
      bustCache(`shifts_${storeId}`);
      return { ...data, store_id: Number(data.store_id) } as Shift;
    }
    const items = readCollection<Shift>(COLLECTION);
    items.push(newShift);
    writeCollection(COLLECTION, items);
    bustCache(`shifts_${storeId}`);
    return newShift;
  },

  async closeShift(input: { shiftId: string; closing_cash_actual: number; expected_cash: number; cash_in?: number; cash_out?: number; note?: string }, storeId: number): Promise<void> {
    const difference = input.closing_cash_actual - input.expected_cash;
    const updates: Partial<Shift> = {
      closed_at: nowISO(),
      closing_cash_actual: input.closing_cash_actual,
      expected_cash: input.expected_cash,
      difference,
      cash_in: input.cash_in,
      cash_out: input.cash_out,
      note: input.note,
      status: 'closed',
    };
    if (supabase) {
      const { error } = await supabase.from('shifts').update(updates).eq('id', input.shiftId).eq('store_id', storeId);
      if (error) throw new Error(error.message);
      bustCache(`shifts_${storeId}`);
      return;
    }
    const items = readCollection<Shift>(COLLECTION).map(s =>
      s.id === input.shiftId && s.store_id === storeId ? { ...s, ...updates } : s
    );
    writeCollection(COLLECTION, items);
    bustCache(`shifts_${storeId}`);
  },
};
