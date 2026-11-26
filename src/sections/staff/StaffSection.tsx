import { useState, useEffect } from 'react';
import { Users, ShieldCheck, Plus, Pencil, Trash2, X, Check, Loader2, AlertCircle, Crown, KeyRound, Store as StoreIcon, Building2 } from 'lucide-react';
import { dbService, PERMISSION_OPTIONS, DEFAULT_CASHIER_PERMISSIONS } from '../../lib/db';
import type { Cashier, UserProfile, Store } from '../../lib/db';
import { useStoreData } from '../../hooks/useStoreData';

interface StaffSectionProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
  allStores?: Store[];
}

type StaffForm = {
  name: string;
  email: string;
  password: string;
  permissions: string[];
  store_ids: number[];
};

const EMPTY_FORM: StaffForm = { name: '', email: '', password: '', permissions: [...DEFAULT_CASHIER_PERMISSIONS], store_ids: [] };

export default function StaffSection({ storeId, refreshTrigger, triggerRefresh, allStores = [] }: StaffSectionProps) {
  const [cashiers] = useStoreData<Cashier[]>(dbService.getCashiers, storeId, refreshTrigger, []);
  const [owners, setOwners] = useState<UserProfile[]>([]);
  const [tab, setTab] = useState<'staff' | 'outlet'>('staff');
  const [outlets, setOutlets] = useState<Store[]>([]);
  const [outletModalOpen, setOutletModalOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Store | null>(null);

  const loadOutlets = () => { dbService.listStores().then(setOutlets).catch(() => {}); };
  useEffect(loadOutlets, [storeId, refreshTrigger, allStores]);

  const [isStaffModalOpen, setStaffModalOpen] = useState(false);
  const [isOwnerModalOpen, setOwnerModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Cashier | null>(null);
  const [editingOwner, setEditingOwner] = useState<UserProfile | null>(null);

  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadOwners = () => {
    dbService.getOwners(storeId).then(setOwners).catch(() => {});
  };
  useEffect(loadOwners, [storeId, refreshTrigger]);

  const refresh = () => { triggerRefresh?.(); };

  // ── Staff modal helpers ─────────────────────────────────────────────
  const openAddStaff = () => {
    setEditingStaff(null);
    setForm({ ...EMPTY_FORM, store_ids: [storeId] });
    setError('');
    setStaffModalOpen(true);
  };

  const openEditStaff = (c: Cashier) => {
    setEditingStaff(c);
    setForm({
      name: c.name,
      email: c.email,
      password: '',
      permissions: c.permissions ?? [...DEFAULT_CASHIER_PERMISSIONS],
      store_ids: c.store_ids?.length ? c.store_ids : [c.store_id],
    });
    setError('');
    setStaffModalOpen(true);
  };

  const togglePermission = (key: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter(p => p !== key)
        : [...f.permissions, key],
    }));
  };

  const toggleStaffStore = (id: number) => {
    setForm(f => ({
      ...f,
      store_ids: f.store_ids.includes(id)
        ? f.store_ids.filter(s => s !== id)
        : [...f.store_ids, id],
    }));
  };

  const submitStaff = async () => {
    if (form.store_ids.length === 0) { setError('Pilih minimal satu outlet.'); return; }
    setError('');
    setSaving(true);
    try {
      if (editingStaff) {
        await dbService.updateStaff(editingStaff.id, {
          name: form.name,
          email: form.email,
          ...(form.password ? { password: form.password } : {}),
          permissions: form.permissions,
          store_ids: form.store_ids,
        }, storeId);
      } else {
        await dbService.addStaff({
          name: form.name,
          email: form.email,
          password: form.password,
          permissions: form.permissions,
          store_ids: form.store_ids,
        }, storeId);
      }
      setStaffModalOpen(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan staff.');
    } finally {
      setSaving(false);
    }
  };

  const deleteStaff = async (c: Cashier) => {
    if (!confirm(`Hapus akun staff "${c.name}"?`)) return;
    try {
      await dbService.deleteStaff(c.id, storeId);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus staff.');
    }
  };

  // ── Outlet CRUD ─────────────────────────────────────────────────────
  const saveOutlet = async (payload: { name: string; address?: string; phone?: string }) => {
    if (editingOutlet) await dbService.updateStore(editingOutlet.id, payload);
    else await dbService.addStore(payload);
    setOutletModalOpen(false);
    setEditingOutlet(null);
    loadOutlets();
    refresh();
  };

  const deleteOutlet = async (s: Store) => {
    if (outlets.length <= 1) { alert('Minimal harus ada satu outlet.'); return; }
    if (!confirm(`Hapus outlet "${s.name}"? Data yang terkait tidak ikut terhapus.`)) return;
    await dbService.deleteStore(s.id);
    loadOutlets();
    refresh();
  };

  // ── Owner modal helpers ─────────────────────────────────────────────
  const openAddOwner = () => {
    setEditingOwner(null);
    setForm({ name: '', email: '', password: '', permissions: [], store_ids: [storeId] });
    setError('');
    setOwnerModalOpen(true);
  };

  const openEditOwner = (o: UserProfile) => {
    setEditingOwner(o);
    setForm({ name: o.name ?? '', email: o.email, password: '', permissions: [], store_ids: [o.store_id] });
    setError('');
    setOwnerModalOpen(true);
  };

  const submitOwner = async () => {
    setError('');
    setSaving(true);
    try {
      if (editingOwner) {
        await dbService.updateOwner(editingOwner.id, {
          name: form.name,
          email: form.email,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await dbService.addOwner({ name: form.name, email: form.email, password: form.password }, storeId);
      }
      setOwnerModalOpen(false);
      loadOwners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan owner.');
    } finally {
      setSaving(false);
    }
  };

  const deleteOwner = async (o: UserProfile) => {
    if (owners.length <= 1) {
      alert('Minimal harus ada satu akun owner aktif.');
      return;
    }
    if (!confirm(`Hapus akun owner "${o.name ?? o.email}"?`)) return;
    try {
      await dbService.deleteOwner(o.id);
      loadOwners();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus owner.');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-slate-800 text-xl leading-none">Outlet &amp; Tim</h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">Kelola outlet, akun owner/kasir, dan hak akses tiap staff.</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'outlet' ? (
            <button
              onClick={() => { setEditingOutlet(null); setOutletModalOpen(true); }}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-3.5 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Outlet
            </button>
          ) : (
            <>
              <button
                onClick={openAddOwner}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] px-3.5 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm"
              >
                <Crown className="h-3.5 w-3.5" /> Tambah Owner
              </button>
              <button
                onClick={openAddStaff}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-3.5 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Staff
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1.5 bg-slate-50 border border-slate-100 p-0.5 rounded-2xl w-fit">
        <button onClick={() => setTab('staff')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${tab === 'staff' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Tim & Akses</button>
        <button onClick={() => setTab('outlet')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${tab === 'outlet' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Outlet</button>
      </div>

      {tab === 'outlet' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {outlets.length === 0 ? (
            <div className="col-span-full bg-slate-50 border border-slate-100/80 rounded-3xl p-10 text-center text-slate-400 text-xs font-semibold">Belum ada outlet.</div>
          ) : outlets.map(s => (
            <div key={s.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-32">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"><StoreIcon className="h-4.5 w-4.5" /></div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-slate-800 text-sm truncate">{s.name}</h4>
                  {s.address && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{s.address}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{s.id === storeId ? 'Outlet Aktif' : 'Outlet'}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingOutlet(s); setOutletModalOpen(true); }} className="h-7 w-7 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-slate-300 inline-flex items-center justify-center cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => deleteOutlet(s)} className="h-7 w-7 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-300 inline-flex items-center justify-center cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Owner list */}
      {tab === 'staff' && <>
        <div>
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Crown className="h-3.5 w-3.5 text-amber-500" /> Owner / Admin
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {owners.length === 0 ? (
            <div className="col-span-full bg-slate-50 border border-slate-100/80 rounded-2xl p-6 text-center text-slate-400 text-xs font-semibold">
              Tidak ada data owner.
            </div>
          ) : (
            owners.map(owner => (
              <div key={owner.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-36">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                    <Crown className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-left overflow-hidden">
                    <h4 className="font-extrabold text-slate-800 text-sm truncate leading-snug" title={owner.name ?? owner.email}>
                      {owner.name ?? '—'}
                    </h4>
                    <span className="text-[10px] font-mono font-bold text-amber-600 block tracking-normal mt-0.5 truncate" title={owner.email}>
                      {owner.email}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-50 pt-3.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Akses Penuh</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditOwner(owner)} title="Edit owner" className="h-7 w-7 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-slate-300 flex items-center justify-center cursor-pointer transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteOwner(owner)} title="Hapus owner" className="h-7 w-7 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-300 flex items-center justify-center cursor-pointer transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cashier list */}
      <div>
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Kasir
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cashiers.length === 0 ? (
            <div className="col-span-full bg-slate-50 border border-slate-100/80 rounded-3xl p-10 text-center space-y-3">
              <div className="h-12 w-12 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto shadow-sm">
                <Users className="h-5.5 w-5.5" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm leading-none">Belum Ada Akun Kasir</h4>
              <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
                Klik "Tambah Staff" untuk membuat akun kasir baru dan mengatur hak aksesnya.
              </p>
            </div>
          ) : (
            cashiers.map(cashier => (
              <div key={cashier.id} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-36 text-left">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-indigo-50 border border-indigo-100 text-indigo-650 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                    {cashier.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="text-left overflow-hidden">
                    <h4 className="font-extrabold text-slate-800 text-sm truncate leading-snug" title={cashier.name}>
                      {cashier.name}
                    </h4>
                    <span className="text-[10px] font-mono font-bold text-indigo-500 block tracking-normal mt-0.5 truncate" title={cashier.email}>
                      {cashier.email}
                    </span>
                  </div>
                </div>

                {/* Permission chips */}
                <div className="flex flex-wrap gap-1 my-3">
                  {(cashier.permissions ?? DEFAULT_CASHIER_PERMISSIONS).map(p => {
                    const opt = PERMISSION_OPTIONS.find(o => o.key === p);
                    return (
                      <span key={p} className="bg-slate-50 border border-slate-100 text-slate-500 rounded-md px-1.5 py-0.5 text-[9px] font-bold">
                        {opt?.label ?? p}
                      </span>
                    );
                  })}
                  {(cashier.permissions ?? DEFAULT_CASHIER_PERMISSIONS).length === 0 && (
                    <span className="text-[9px] font-semibold text-slate-300 italic">Tanpa akses</span>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-3.5">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Aktif</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditStaff(cashier)} title="Edit staff & akses" className="h-7 w-7 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-slate-300 flex items-center justify-center cursor-pointer transition-colors">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteStaff(cashier)} title="Hapus staff" className="h-7 w-7 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-300 flex items-center justify-center cursor-pointer transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </>}

      {/* Staff Modal */}
      {isStaffModalOpen && (
        <ModalShell onClose={() => setStaffModalOpen(false)} title={editingStaff ? 'Edit Staff' : 'Tambah Staff Baru'} subtitle="Akun kasir + atur hak akses menu.">
          <div className="space-y-4">
            <Field label="Nama Staff">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Budi Santoso"
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="e.g. budi@toko.com"
                className={INPUT_CLASS}
              />
            </Field>
            <Field label={editingStaff ? 'Kata Sandi Baru (opsional)' : 'Kata Sandi'}>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editingStaff ? 'Biarkan kosong jika tidak diubah' : 'Minimal 4 karakter'}
                className={INPUT_CLASS}
              />
            </Field>

            <div>
              <label className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block mb-2">Outlet yang Bisa Diakses</label>
              <div className="flex flex-wrap gap-2">
                {outlets.map(s => {
                  const active = form.store_ids.includes(s.id);
                  return (
                    <button type="button" key={s.id} onClick={() => toggleStaffStore(s.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border cursor-pointer transition-all ${
                        active ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-150 bg-slate-50 text-slate-500'
                      }`}>
                      <span className={`h-4 w-4 rounded-md border flex items-center justify-center ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}>
                        {active && <Check className="h-3 w-3" />}
                      </span>
                      {s.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-400 font-medium mt-1.5">Kasir dapat berpindah outlet di antara outlet yang dipilih.</p>
            </div>

            <div>
              <label className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block mb-2">Hak Akses Menu</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERMISSION_OPTIONS.map(opt => {
                  const active = form.permissions.includes(opt.key);
                  return (
                    <button
                      type="button"
                      key={opt.key}
                      onClick={() => togglePermission(opt.key)}
                      className={`flex items-start gap-2.5 text-left border rounded-xl px-3 py-2.5 transition-all cursor-pointer ${
                        active ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-150 bg-slate-50 hover:bg-slate-100/60'
                      }`}
                    >
                      <span className={`mt-0.5 h-4 w-4 rounded-md border flex items-center justify-center shrink-0 ${
                        active ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'
                      }`}>
                        {active && <Check className="h-3 w-3" />}
                      </span>
                      <span>
                        <span className="block text-[11px] font-bold text-slate-700">{opt.label}</span>
                        <span className="block text-[9px] text-slate-400 font-medium mt-0.5">{opt.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <ErrorBox message={error} />}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => setStaffModalOpen(false)} disabled={saving} className={BTN_SECONDARY}>Batal</button>
              <button onClick={submitStaff} disabled={saving} className={BTN_PRIMARY}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Owner Modal */}
      {isOwnerModalOpen && (
        <ModalShell onClose={() => setOwnerModalOpen(false)} title={editingOwner ? 'Edit Owner' : 'Tambah Owner Baru'} subtitle="Akun owner memiliki akses penuh ke semua menu.">
          <div className="space-y-4">
            <Field label="Nama Owner">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Andi Wijaya"
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="e.g. andi@toko.com"
                className={INPUT_CLASS}
              />
            </Field>
            <Field label={editingOwner ? 'Kata Sandi Baru (opsional)' : 'Kata Sandi'}>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editingOwner ? 'Biarkan kosong jika tidak diubah' : 'Minimal 4 karakter'}
                className={INPUT_CLASS}
              />
            </Field>

            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-3">
              <Crown className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-semibold text-amber-700 leading-snug">
                Akun owner otomatis mendapat akses ke seluruh menu: Dashboard, POS, Invoices, Katalog, Sales, dan Staff.
              </p>
            </div>

            {error && <ErrorBox message={error} />}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => setOwnerModalOpen(false)} disabled={saving} className={BTN_SECONDARY}>Batal</button>
              <button onClick={submitOwner} disabled={saving} className={BTN_PRIMARY}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {outletModalOpen && (
        <OutletModal
          outlet={editingOutlet}
          onClose={() => { setOutletModalOpen(false); setEditingOutlet(null); }}
          onSave={saveOutlet}
        />
      )}

    </div>
  );
}

function OutletModal({ outlet, onClose, onSave }: {
  outlet: Store | null;
  onClose: () => void;
  onSave: (payload: { name: string; address?: string; phone?: string }) => Promise<void>;
}) {
  const [name, setName] = useState(outlet?.name || '');
  const [address, setAddress] = useState(outlet?.address || '');
  const [phone, setPhone] = useState(outlet?.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!name.trim()) { setError('Nama outlet wajib diisi.'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ name: name.trim(), address: address.trim() || undefined, phone: phone.trim() || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan outlet.');
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title={outlet ? 'Edit Outlet' : 'Tambah Outlet'} subtitle="Data outlet untuk multi-cabang.">
      <div className="space-y-4">
        <Field label="Nama Outlet">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Mis. Cabang Bandung" className={INPUT_CLASS} />
        </Field>
        <Field label="Alamat (opsional)">
          <input type="text" value={address} onChange={e => setAddress(e.target.value)} className={INPUT_CLASS} />
        </Field>
        <Field label="Telepon (opsional)">
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className={INPUT_CLASS} />
        </Field>
        {error && <ErrorBox message={error} />}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={onClose} disabled={saving} className={BTN_SECONDARY}>Batal</button>
          <button onClick={submit} disabled={saving} className={BTN_PRIMARY}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ── Small presentational helpers ───────────────────────────────────────
const INPUT_CLASS = 'w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-300';
const BTN_PRIMARY = 'flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-[11px] px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm';
const BTN_SECONDARY = 'flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-500 font-bold text-[11px] px-4 py-2.5 rounded-xl cursor-pointer transition-all';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
      <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
      <p className="text-[10px] font-semibold text-rose-700 leading-snug flex-1">{message}</p>
    </div>
  );
}

function ModalShell({ onClose, title, subtitle, children }: { onClose: () => void; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-indigo-50 rounded-xl flex items-center justify-center">
              <KeyRound className="h-4.5 w-4.5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base leading-tight">{title}</h3>
              {subtitle && <p className="text-[10px] text-slate-400 font-medium mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center cursor-pointer transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
