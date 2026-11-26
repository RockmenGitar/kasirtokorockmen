import { supabase } from './client';
import { readCollection, writeCollection } from './localStore';
import { DEFAULT_STORE_SETTINGS, type StoreSettings } from './types';

const COLLECTION = 'settings';

export const settingsService = {
  async getSettings(storeId: number): Promise<StoreSettings> {
    if (supabase) {
      const { data, error } = await supabase
        .from('store_settings').select('*').eq('store_id', storeId).maybeSingle();
      if (!error && data) {
        return { ...DEFAULT_STORE_SETTINGS, ...data, store_id: Number(data.store_id) } as StoreSettings;
      }
    }
    const all = readCollection<StoreSettings>(COLLECTION);
    const found = all.find(s => s.store_id === storeId);
    return found ? { ...DEFAULT_STORE_SETTINGS, ...found } : { ...DEFAULT_STORE_SETTINGS, store_id: storeId };
  },

  async saveSettings(settings: StoreSettings): Promise<void> {
    if (supabase) {
      const { error } = await supabase
        .from('store_settings')
        .upsert([settings], { onConflict: 'store_id' });
      if (error) throw new Error(error.message);
      return;
    }
    const all = readCollection<StoreSettings>(COLLECTION);
    const idx = all.findIndex(s => s.store_id === settings.store_id);
    if (idx === -1) all.push(settings);
    else all[idx] = settings;
    writeCollection(COLLECTION, all);
  },
};
