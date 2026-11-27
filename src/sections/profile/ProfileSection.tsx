import { useState, useEffect, useRef } from 'react';
import { Camera, Store, Mail, ShieldCheck, ImagePlus, Loader2, Trash2, Pencil, Check, X } from 'lucide-react';
import { authService, type UserProfile, type Store as StoreInfo } from '../../lib/db';
import { useI18n } from '../../lib/i18n';

interface ProfileSectionProps {
  currentUser: UserProfile;
  avatarUrl: string;
  onAvatarChange: (url: string) => void;
  onStoreNameChange?: (name: string) => void;
}

function resizeImage(file: File, size = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const ratio = Math.min(size / img.width, size / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ── Shared outlet info card ────────────────────────────────────────────────
function OutletInfoCard({ storeInfo, storeLoading, editable = false, storeId, onUpdated }: {
  storeInfo: StoreInfo | null;
  storeLoading: boolean;
  editable?: boolean;
  storeId?: number;
  onUpdated?: (newName: string) => void;
}) {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setName(storeInfo?.name ?? ''); }, [storeInfo]);

  const startEdit = () => { setName(storeInfo?.name ?? ''); setError(null); setIsEditing(true); };
  const cancelEdit = () => { setIsEditing(false); setError(null); };

  const handleSave = async () => {
    if (!storeId) return;
    if (!name.trim()) { setError('Nama toko tidak boleh kosong.'); return; }
    setSaving(true);
    setError(null);
    try {
      await authService.updateStoreName(storeId, name.trim());
      if (storeInfo) storeInfo.name = name.trim();
      onUpdated?.(name.trim());
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan nama toko.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-5">
        <div className="h-7 w-7 bg-indigo-50 border border-indigo-100/60 rounded-lg flex items-center justify-center">
          <Store className="h-3.5 w-3.5 text-indigo-500" />
        </div>
        <h4 className="font-bold text-slate-800 text-sm leading-none">{t('prof.outletInfo')}</h4>
      </div>

      {storeLoading ? (
        <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
      ) : isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('prof.storeName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelEdit(); }}
              className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          {error && (
            <div className="text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-100 px-3.5 py-2.5 rounded-xl">{error}</div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-[10px] px-3.5 py-2 rounded-xl cursor-pointer transition-all shadow-sm"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span>{saving ? t('common.saving') : t('common.save')}</span>
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-500 font-bold text-[10px] px-3.5 py-2 rounded-xl cursor-pointer transition-all"
            >
              <X className="h-3.5 w-3.5" />
              <span>{t('common.cancel')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between py-2">
          <span className="text-xs font-semibold text-slate-500">{t('prof.storeName')}</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">
              {storeInfo?.name ?? <span className="text-slate-400 font-normal italic text-xs">—</span>}
            </span>
            {editable && (
              <button
                onClick={startEdit}
                title={t('prof.renameHint')}
                className="h-7 w-7 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cashier Profile ────────────────────────────────────────────────────────
function CashierProfile({ currentUser }: ProfileSectionProps) {
  const { t } = useI18n();
  const [storeInfo, setStoreInfo]       = useState<StoreInfo | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);

  useEffect(() => {
    authService.getStoreById(currentUser.store_id)
      .then(info => setStoreInfo(info))
      .catch(() => {})
      .finally(() => setStoreLoading(false));
  }, [currentUser.store_id]);

  const initials = (currentUser.name || 'K').charAt(0).toUpperCase();

  return (
    <div className="max-w-xl space-y-6 animate-fadeIn pb-12">
      <div>
        <h2 className="font-extrabold text-slate-800 text-xl leading-none">{t('prof.cashierTitle')}</h2>
        <p className="text-slate-400 text-xs mt-1.5 font-medium">{t('prof.cashierSubtitle')}</p>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-indigo-600 to-violet-600" />

        <div className="px-6 pb-6">
          {/* Initials avatar */}
          <div className="-mt-10 mb-5">
            <div className="h-20 w-20 rounded-2xl border-4 border-white shadow-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-extrabold">
              {initials}
            </div>
          </div>

          <div className="space-y-3.5">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('prof.cashierName')}</span>
              <span className="font-bold text-slate-800 text-base leading-tight">{currentUser.name || '—'}</span>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
              <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{t('prof.role')}</span>
                <span className="font-bold text-indigo-600 text-xs uppercase tracking-wide font-mono">{t('role.cashier')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <OutletInfoCard storeInfo={storeInfo} storeLoading={storeLoading} />
    </div>
  );
}

// ── Admin Profile ──────────────────────────────────────────────────────────
function AdminProfile({ currentUser, avatarUrl, onAvatarChange, onStoreNameChange }: ProfileSectionProps) {
  const { t } = useI18n();
  const [storeInfo, setStoreInfo]       = useState<StoreInfo | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [saving, setSaving]             = useState(false);
  const [uploadError, setUploadError]   = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    authService.getStoreById(currentUser.store_id)
      .then(info => setStoreInfo(info))
      .catch(() => {})
      .finally(() => setStoreLoading(false));
  }, [currentUser.store_id]);

  const handleDeletePhoto = async () => {
    setSaving(true);
    setUploadError(null);
    setUploadSuccess(false);
    try {
      await authService.updateStoreAvatar(currentUser.store_id, '');
      localStorage.removeItem(`kasirnya_avatar_${currentUser.store_id}`);
      onAvatarChange('');
    } catch (err: any) {
      setUploadError(err.message || 'Gagal menghapus foto.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(false);

    if (!file.type.startsWith('image/')) {
      setUploadError('File harus berupa gambar (JPG, PNG, WebP, dll.)');
      e.target.value = '';
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 8MB.');
      e.target.value = '';
      return;
    }

    setSaving(true);
    try {
      const resized = await resizeImage(file, 300);
      await authService.updateStoreAvatar(currentUser.store_id, resized);
      onAvatarChange(resized);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3500);
    } catch (err: any) {
      setUploadError(err.message || 'Gagal menyimpan foto.');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const displayName = currentUser.email
    .split('@')[0]
    .split(/[-_.]/)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');

  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="max-w-xl space-y-6 animate-fadeIn pb-12">
      <div>
        <h2 className="font-extrabold text-slate-800 text-xl leading-none">{t('prof.adminTitle')}</h2>
        <p className="text-slate-400 text-xs mt-1.5 font-medium">{t('prof.adminSubtitle')}</p>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-indigo-600 to-violet-600" />

        <div className="px-6 pb-6">
          <div className="relative -mt-12 mb-4 flex items-end justify-between">
            <div className="relative group">
              <div className="h-20 w-20 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-slate-100">
                {avatarUrl
                  ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                  : <div className="h-full w-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-extrabold">{initials}</div>
                }
              </div>

              {!saving && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-[14px] bg-black/55 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                  title="Ganti foto profil"
                >
                  <Camera className="h-4.5 w-4.5 text-white" />
                  <span className="text-[8px] font-bold text-white uppercase tracking-wide">Ganti</span>
                </button>
              )}
              {saving && (
                <div className="absolute inset-0 rounded-[14px] bg-black/60 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={saving} />
            </div>

            <div className="flex items-center gap-2 self-end mb-0.5">
              {avatarUrl && (
                <button
                  onClick={handleDeletePhoto}
                  disabled={saving}
                  className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-600 font-bold text-[10px] px-3.5 py-2 rounded-xl cursor-pointer transition-all shadow-sm border border-rose-100"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  <span>{t('prof.deletePhoto')}</span>
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-[10px] px-3.5 py-2 rounded-xl cursor-pointer transition-all shadow-sm"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                <span>{saving ? t('common.saving') : t('prof.changePhoto')}</span>
              </button>
            </div>
          </div>

          {uploadError && (
            <div className="text-rose-600 text-xs font-semibold mb-4 bg-rose-50 border border-rose-100 px-3.5 py-2.5 rounded-xl">{uploadError}</div>
          )}
          {uploadSuccess && (
            <div className="text-emerald-600 text-xs font-semibold mb-4 bg-emerald-50 border border-emerald-100 px-3.5 py-2.5 rounded-xl">✓ Foto profil berhasil disimpan ke cloud!</div>
          )}

          <div className="space-y-3.5">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{t('prof.adminName')}</span>
              <span className="font-bold text-slate-800 text-base leading-tight">{displayName}</span>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{t('prof.email')}</span>
                <span className="font-semibold text-slate-700 text-xs">{currentUser.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
              <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{t('prof.role')}</span>
                <span className="font-bold text-indigo-600 text-xs uppercase tracking-wide font-mono">{currentUser.role === 'admin' ? t('role.owner') : t('role.cashier')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <OutletInfoCard
        storeInfo={storeInfo}
        storeLoading={storeLoading}
        editable
        storeId={currentUser.store_id}
        onUpdated={onStoreNameChange}
      />
    </div>
  );
}

// ── Entry point ────────────────────────────────────────────────────────────
export default function ProfileSection(props: ProfileSectionProps) {
  if (props.currentUser.role === 'cashier') return <CashierProfile {...props} />;
  return <AdminProfile {...props} />;
}
