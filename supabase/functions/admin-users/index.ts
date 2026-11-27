// =====================================================================
// Supabase Edge Function: admin-users
// Mengelola akun OWNER (auth.users + profiles) dan KASIR (cashiers)
// memakai service_role. Dipanggil dari panel web (kasir-toko).
//
// Deploy:
//   supabase functions deploy admin-users --no-verify-jwt
// (atau tanpa flag jika JWT diaktifkan)
//
// Secret otomatis tersedia di Edge Function:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const action = body.action as string;

    // ── OWNER: create ────────────────────────────────────────────────
    if (action === 'create-owner') {
      const { email, password, name, store_id } = body;
      if (!email || !password || !store_id) return json({ error: 'Data owner tidak lengkap.' }, 400);

      const { data: created, error } = await admin.auth.admin.createUser({
        email: String(email).trim().toLowerCase(),
        password,
        email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);

      const uid = created.user.id;
      // Trigger handle_new_user mungkin sudah membuat profile; pastikan/update.
      const { error: upErr } = await admin.from('profiles').upsert({
        id: uid, email: String(email).trim().toLowerCase(), role: 'admin',
        store_id: Number(store_id), name: name ?? null,
      });
      if (upErr) return json({ error: upErr.message }, 400);

      return json({ id: uid });
    }

    // ── OWNER: update ────────────────────────────────────────────────
    if (action === 'update-owner') {
      const { id, email, password, name } = body;
      if (!id) return json({ error: 'ID owner tidak ada.' }, 400);

      const authUpdates: Record<string, unknown> = {};
      if (email) authUpdates.email = String(email).trim().toLowerCase();
      if (password) authUpdates.password = password;
      if (Object.keys(authUpdates).length > 0) {
        const { error } = await admin.auth.admin.updateUserById(id, authUpdates);
        if (error) return json({ error: error.message }, 400);
      }

      const profileUpdates: Record<string, unknown> = {};
      if (email) profileUpdates.email = String(email).trim().toLowerCase();
      if (name !== undefined) profileUpdates.name = name;
      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await admin.from('profiles').update(profileUpdates).eq('id', id);
        if (error) return json({ error: error.message }, 400);
      }

      return json({ ok: true });
    }

    // ── OWNER: delete ────────────────────────────────────────────────
    if (action === 'delete-owner') {
      const { id } = body;
      if (!id) return json({ error: 'ID owner tidak ada.' }, 400);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      await admin.from('profiles').delete().eq('id', id);
      return json({ ok: true });
    }

    // ── CASHIER: create ──────────────────────────────────────────────
    if (action === 'create-cashier') {
      const { name, email, password, store_ids, permissions } = body;
      if (!name || !email || !password) return json({ error: 'Data kasir tidak lengkap.' }, 400);
      const ids = Array.isArray(store_ids) && store_ids.length ? store_ids.map(Number) : [];
      const { data, error } = await admin.from('cashiers').insert([{
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        password,
        store_id: ids[0] ?? null,
        store_ids: ids,
        permissions: permissions ?? [],
      }]).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ data });
    }

    // ── CASHIER: update ──────────────────────────────────────────────
    if (action === 'update-cashier') {
      const { id, name, email, password, store_ids, permissions } = body;
      if (!id) return json({ error: 'ID kasir tidak ada.' }, 400);
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = String(name).trim();
      if (email) updates.email = String(email).trim().toLowerCase();
      if (password) updates.password = password;
      if (permissions !== undefined) updates.permissions = permissions;
      if (store_ids !== undefined) {
        updates.store_ids = store_ids.map(Number);
        updates.store_id = store_ids[0] ?? null;
      }
      const { error } = await admin.from('cashiers').update(updates).eq('id', id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    // ── CASHIER: delete ──────────────────────────────────────────────
    if (action === 'delete-cashier') {
      const { id } = body;
      if (!id) return json({ error: 'ID kasir tidak ada.' }, 400);
      const { error } = await admin.from('cashiers').delete().eq('id', id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: `Aksi tidak dikenal: ${action}` }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Terjadi kesalahan.' }, 500);
  }
});
