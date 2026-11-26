import { supabase } from './client';
import { fromCache, toCache, bustCache } from './cache';
import { productService } from './products';
import type { UserProfile, Store, Cashier } from './types';

export const authService = {

  async getOrCreateStore(storeCode: string): Promise<number> {
    const formattedCode = storeCode.trim().toLowerCase().replace(/\s+/g, '-');

    if (supabase) {
      const { data: existingStore } = await supabase
        .from('stores').select('id').eq('code', formattedCode).maybeSingle();
      if (existingStore) return Number(existingStore.id);

      const capitalizedName = formattedCode
        .split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

      const { data: newStore, error: insertError } = await supabase
        .from('stores')
        .insert([{ name: capitalizedName + ' Suite', code: formattedCode }])
        .select('id').single();

      if (insertError || !newStore) throw new Error(insertError?.message || 'Gagal inisialisasi data toko.');
      return Number(newStore.id);
    }

    const stores: Store[] = JSON.parse(localStorage.getItem('kasirnya_stores') || '[]');
    const matched = stores.find(s => s.code === formattedCode);
    if (matched) return Number(matched.id);

    const newId = stores.length + 1;
    const capitalizedName = formattedCode
      .split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    const freshStore = { id: newId, name: capitalizedName + ' Suite', code: formattedCode };
    stores.push(freshStore);
    localStorage.setItem('kasirnya_stores', JSON.stringify(stores));
    return newId;
  },

  async listStores(): Promise<Store[]> {
    if (supabase) {
      const { data, error } = await supabase.from('stores').select('*').order('id', { ascending: true });
      if (!error && data) return data as Store[];
      return [];
    }
    return JSON.parse(localStorage.getItem('kasirnya_stores') || '[]');
  },

  async addStore(input: { name: string; code?: string; address?: string; phone?: string }): Promise<Store> {
    const name = input.name.trim();
    if (!name) throw new Error('Nama outlet tidak boleh kosong.');
    const code = (input.code?.trim() || name.toLowerCase().replace(/\s+/g, '-')).toLowerCase();

    if (supabase) {
      const { data, error } = await supabase
        .from('stores')
        .insert([{ name, code, address: input.address, phone: input.phone }])
        .select().single();
      if (error) throw new Error(error.message);
      bustCache('stores_all');
      return data as Store;
    }

    const stores: Store[] = JSON.parse(localStorage.getItem('kasirnya_stores') || '[]');
    if (stores.some(s => s.code === code)) throw new Error('Kode outlet sudah dipakai.');
    const newId = stores.reduce((m, s) => Math.max(m, s.id), 0) + 1;
    const store: Store = { id: newId, name, code, address: input.address, phone: input.phone };
    stores.push(store);
    localStorage.setItem('kasirnya_stores', JSON.stringify(stores));
    return store;
  },

  async updateStore(storeId: number, updates: Partial<Omit<Store, 'id'>>): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('stores').update(updates).eq('id', storeId);
      if (error) throw new Error(error.message);
      return;
    }
    const stores: Store[] = JSON.parse(localStorage.getItem('kasirnya_stores') || '[]');
    const idx = stores.findIndex(s => s.id === storeId);
    if (idx !== -1) {
      stores[idx] = { ...stores[idx], ...updates };
      localStorage.setItem('kasirnya_stores', JSON.stringify(stores));
    }
  },

  /**
   * Sync PRODUCT CATALOG from source outlet → target outlet.
   * Copies: name, variants, price, cost, category, SKU, barcode, unit.
   * Does NOT copy: stock, transactions, customers, expenses, outlet name.
   * Matching products are updated; missing ones are created with stock 0.
   */
  async syncProducts(sourceId: number, targetId: number): Promise<void> {
    if (sourceId === targetId) throw new Error('Outlet sumber dan tujuan harus berbeda.');

    const sourceProducts = await productService.getProducts(sourceId);
    const targetProducts = await productService.getProducts(targetId);

    const catalogFields = (p: (typeof sourceProducts)[number]) => ({
      name: p.name,
      description: p.description,
      price: p.price,
      image_url: p.image_url,
      category: p.category,
      sku: p.sku,
      barcode: p.barcode,
      unit: p.unit,
      cost: p.cost,
      min_stock: p.min_stock,
      active: p.active,
      variants: p.variants,
    });

    for (const src of sourceProducts) {
      const existing = targetProducts.find(t =>
        (src.sku && t.sku === src.sku) || t.name.toLowerCase() === src.name.toLowerCase()
      );
      if (existing) {
        await productService.updateProduct(existing.id, catalogFields(src), targetId);
      } else {
        await productService.addProduct({
          ...catalogFields(src),
          stock_status: 'Out of Stock',
          stock_quantity: 0,
        }, targetId);
      }
    }
  },

  async deleteStore(storeId: number): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('stores').delete().eq('id', storeId);
      if (error) throw new Error(error.message);
      return;
    }
    const stores: Store[] = JSON.parse(localStorage.getItem('kasirnya_stores') || '[]');
    localStorage.setItem('kasirnya_stores', JSON.stringify(stores.filter(s => s.id !== storeId)));
  },

  async getStoreById(storeId: number): Promise<Store | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('stores').select('*').eq('id', storeId).single();
      if (!error && data) return data as Store;
      return null;
    }

    const stores: Store[] = JSON.parse(localStorage.getItem('kasirnya_stores') || '[]');
    const store = stores.find(s => s.id === storeId) || null;
    if (store) {
      const cached = localStorage.getItem(`kasirnya_avatar_${storeId}`);
      if (cached) store.avatar_url = cached;
    }
    return store;
  },

  async updateStoreAvatar(storeId: number, avatarBase64: string): Promise<void> {
    localStorage.setItem(`kasirnya_avatar_${storeId}`, avatarBase64);
    if (supabase) {
      const { error } = await supabase
        .from('stores').update({ avatar_url: avatarBase64 }).eq('id', storeId);
      if (error) throw new Error('Gagal menyimpan foto ke cloud: ' + error.message);
    }
  },

  async updateStoreName(storeId: number, name: string): Promise<void> {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Nama toko tidak boleh kosong.');

    if (supabase) {
      const { error } = await supabase
        .from('stores').update({ name: cleanName }).eq('id', storeId);
      if (error) throw new Error('Gagal menyimpan nama toko ke cloud: ' + error.message);
      return;
    }

    const stores: Store[] = JSON.parse(localStorage.getItem('kasirnya_stores') || '[]');
    const updated = stores.map(s => s.id === storeId ? { ...s, name: cleanName } : s);
    localStorage.setItem('kasirnya_stores', JSON.stringify(updated));
  },

  async signIn(email: string, password: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();

    if (supabase) {
      const adminAttempt = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

      if (!adminAttempt.error && adminAttempt.data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles').select('*').eq('id', adminAttempt.data.user.id).single();
        if (profileError || !profile) {
          throw new Error('Profil pengguna belum dikonfigurasi.');
        }
        return {
          id: profile.id, email: profile.email,
          role: profile.role, store_id: Number(profile.store_id)
        };
      }

      const { data: cashier } = await supabase
        .from('cashiers').select('*')
        .ilike('email', cleanEmail).eq('password', password).maybeSingle();

      if (cashier) {
        const sessionUser: UserProfile = {
          id: cashier.id, email: cashier.email,
          role: 'cashier', store_id: Number(cashier.store_id), name: cashier.name,
          store_ids: cashier.store_ids ?? [Number(cashier.store_id)],
          permissions: cashier.permissions ?? ['pos', 'invoices']
        };
        localStorage.setItem('kasirnya_current_user', JSON.stringify(sessionUser));
        return sessionUser;
      }

      throw new Error('Email atau kata sandi salah.');
    }

    const profiles: (UserProfile & { password?: string })[] = JSON.parse(localStorage.getItem('kasirnya_profiles') || '[]');
    const matchedAdmin = profiles.find(p => p.email === cleanEmail && (!p.password || p.password === password));
    if (matchedAdmin) {
      const { password: _pw, ...sessionUser } = matchedAdmin;
      localStorage.setItem('kasirnya_current_user', JSON.stringify(sessionUser));
      return sessionUser;
    }

    const cashiers: Cashier[] = JSON.parse(localStorage.getItem('kasirnya_cashiers') || '[]');
    const matchedCashier = cashiers.find(c => c.email?.toLowerCase() === cleanEmail && c.password === password);
    if (matchedCashier) {
      const sessionUser: UserProfile = {
        id: matchedCashier.id, email: matchedCashier.email,
        role: 'cashier', store_id: matchedCashier.store_id, name: matchedCashier.name,
        store_ids: matchedCashier.store_ids ?? [matchedCashier.store_id],
        permissions: matchedCashier.permissions ?? ['pos', 'invoices']
      };
      localStorage.setItem('kasirnya_current_user', JSON.stringify(sessionUser));
      return sessionUser;
    }

    throw new Error('Email atau kata sandi salah.');
  },

  async getCurrentSession(): Promise<UserProfile | null> {
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
          return {
            id: profile.id, email: profile.email,
            role: profile.role, store_id: Number(profile.store_id)
          };
        }
      }
    }

    const raw = localStorage.getItem('kasirnya_current_user');
    return raw ? JSON.parse(raw) : null;
  },

  async signOut(): Promise<void> {
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem('kasirnya_current_user');
  },

  async getCashiers(storeId: number): Promise<Cashier[]> {
    const cacheKey = `cashiers_${storeId}`;
    const cached = fromCache<Cashier[]>(cacheKey);
    if (cached) return cached;

    if (supabase) {
      const { data, error } = await supabase
        .from('cashiers').select('*');
      if (!error && data) {
        const result = (data as any[])
          .filter(d => Number(d.store_id) === storeId || (d.store_ids ?? []).map(Number).includes(storeId))
          .map(d => ({ ...d, store_id: Number(d.store_id), store_ids: (d.store_ids ?? []).map(Number) })) as Cashier[];
        toCache(cacheKey, result);
        return result;
      }
      return [];
    }

    const cashiers: Cashier[] = JSON.parse(localStorage.getItem('kasirnya_cashiers') || '[]');
    const result = cashiers.filter(c =>
      c.store_id === storeId || (c.store_ids ?? []).includes(storeId)
    );
    toCache(cacheKey, result);
    return result;
  },

  // ── Staff (cashier) management ─────────────────────────────────────────
  async addStaff(input: { name: string; email: string; password: string; permissions?: string[]; store_ids?: number[] }, storeId: number): Promise<Cashier> {
    const cleanEmail = input.email.trim().toLowerCase();
    if (!input.name.trim()) throw new Error('Nama staff tidak boleh kosong.');
    if (!cleanEmail) throw new Error('Email tidak boleh kosong.');
    if (!input.password || input.password.length < 4) throw new Error('Kata sandi minimal 4 karakter.');

    const storeIds = input.store_ids?.length ? input.store_ids : [storeId];

    if (supabase) {
      const { data, error } = await supabase
        .from('cashiers')
        .insert([{
          name: input.name.trim(), email: cleanEmail, password: input.password,
          store_id: storeIds[0], store_ids: storeIds, permissions: input.permissions ?? [],
        }])
        .select().single();
      if (error) throw new Error(error.message);
      bustCache(`cashiers_${storeId}`);
      return { ...data, store_id: Number(data.store_id) } as Cashier;
    }

    const cashiers: Cashier[] = JSON.parse(localStorage.getItem('kasirnya_cashiers') || '[]');
    if (cashiers.some(c => c.email?.toLowerCase() === cleanEmail)) {
      throw new Error('Email ini sudah dipakai staff lain.');
    }

    const newCashier: Cashier = {
      id: `cashier-${Date.now()}`,
      name: input.name.trim(),
      email: cleanEmail,
      password: input.password,
      store_id: storeIds[0],
      store_ids: storeIds,
      permissions: input.permissions ?? [],
      created_at: new Date().toISOString(),
    };
    cashiers.push(newCashier);
    localStorage.setItem('kasirnya_cashiers', JSON.stringify(cashiers));
    bustCache(`cashiers_${storeId}`, `cashiers_${storeIds[0]}`);
    return newCashier;
  },

  async updateStaff(id: string, updates: { name?: string; email?: string; password?: string; permissions?: string[]; store_ids?: number[] }, storeId: number): Promise<void> {
    const cashiers: Cashier[] = JSON.parse(localStorage.getItem('kasirnya_cashiers') || '[]');
    const cleanEmail = updates.email?.trim().toLowerCase();
    if (cleanEmail && cashiers.some(c => c.id !== id && c.email?.toLowerCase() === cleanEmail)) {
      throw new Error('Email ini sudah dipakai staff lain.');
    }

    if (supabase) {
      const { error } = await supabase.from('cashiers').update({
        ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
        ...(cleanEmail ? { email: cleanEmail } : {}),
        ...(updates.password ? { password: updates.password } : {}),
        ...(updates.permissions !== undefined ? { permissions: updates.permissions } : {}),
        ...(updates.store_ids !== undefined ? { store_ids: updates.store_ids, store_id: updates.store_ids[0] ?? storeId } : {}),
      }).eq('id', id);
      if (error) throw new Error(error.message);
      bustCache(`cashiers_${storeId}`);
      return;
    }

    const updated = cashiers.map(c => c.id === id ? {
      ...c,
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      ...(cleanEmail ? { email: cleanEmail } : {}),
      ...(updates.password ? { password: updates.password } : {}),
      ...(updates.permissions !== undefined ? { permissions: updates.permissions } : {}),
      ...(updates.store_ids !== undefined ? { store_ids: updates.store_ids, store_id: updates.store_ids[0] ?? storeId } : {}),
    } : c);
    localStorage.setItem('kasirnya_cashiers', JSON.stringify(updated));
    bustCache(`cashiers_${storeId}`);
  },

  async deleteStaff(id: string, storeId: number): Promise<void> {
    const cashiers: Cashier[] = JSON.parse(localStorage.getItem('kasirnya_cashiers') || '[]');
    localStorage.setItem('kasirnya_cashiers', JSON.stringify(cashiers.filter(c => c.id !== id)));
    bustCache(`cashiers_${storeId}`);
  },

  // ── Owner (admin) management ───────────────────────────────────────────
  async addOwner(input: { name: string; email: string; password: string }, storeId: number): Promise<UserProfile> {
    const cleanEmail = input.email.trim().toLowerCase();
    if (!input.name.trim()) throw new Error('Nama owner tidak boleh kosong.');
    if (!cleanEmail) throw new Error('Email tidak boleh kosong.');
    if (!input.password || input.password.length < 4) throw new Error('Kata sandi minimal 4 karakter.');

    const profiles: (UserProfile & { password?: string })[] = JSON.parse(localStorage.getItem('kasirnya_profiles') || '[]');
    if (profiles.some(p => p.email?.toLowerCase() === cleanEmail)) {
      throw new Error('Email ini sudah dipakai akun lain.');
    }

    const newOwner: UserProfile & { password: string } = {
      id: `admin-${Date.now()}`,
      email: cleanEmail,
      role: 'admin',
      store_id: storeId,
      name: input.name.trim(),
      password: input.password,
    };
    profiles.push(newOwner);
    localStorage.setItem('kasirnya_profiles', JSON.stringify(profiles));
    const { password: _pw, ...profile } = newOwner;
    return profile;
  },

  async updateOwner(id: string, updates: { name?: string; email?: string; password?: string }): Promise<void> {
    const profiles: (UserProfile & { password?: string })[] = JSON.parse(localStorage.getItem('kasirnya_profiles') || '[]');
    const cleanEmail = updates.email?.trim().toLowerCase();
    if (cleanEmail && profiles.some(p => p.id !== id && p.email?.toLowerCase() === cleanEmail)) {
      throw new Error('Email ini sudah dipakai akun lain.');
    }
    const updated = profiles.map(p => p.id === id ? {
      ...p,
      ...(updates.name !== undefined ? { name: updates.name.trim() } : {}),
      ...(cleanEmail ? { email: cleanEmail } : {}),
      ...(updates.password ? { password: updates.password } : {}),
    } : p);
    localStorage.setItem('kasirnya_profiles', JSON.stringify(updated));
  },

  async deleteOwner(id: string): Promise<void> {
    const profiles: (UserProfile & { password?: string })[] = JSON.parse(localStorage.getItem('kasirnya_profiles') || '[]');
    localStorage.setItem('kasirnya_profiles', JSON.stringify(profiles.filter(p => p.id !== id)));
  },

  async getOwners(storeId: number): Promise<UserProfile[]> {
    const profiles: (UserProfile & { password?: string })[] = JSON.parse(localStorage.getItem('kasirnya_profiles') || '[]');
    return profiles
      .filter(p => p.store_id === storeId)
      .map(({ password: _pw, ...profile }) => profile);
  },

  async resetPassword(email: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
    } else {
      throw new Error('Supabase belum dikonfigurasi. Reset kata sandi butuh database cloud.');
    }
  },

  async updatePassword(password: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    } else {
      throw new Error('Supabase belum dikonfigurasi.');
    }
  }
};
