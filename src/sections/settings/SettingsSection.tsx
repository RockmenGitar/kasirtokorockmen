import { useEffect, useState } from 'react';
import { Save, Loader2, Receipt, CreditCard, Bell, Clock, Check, RefreshCw, Copy } from 'lucide-react';
import { dbService, DEFAULT_STORE_SETTINGS } from '../../lib/db';
import type { StoreSettings, Store } from '../../lib/db';
import { useI18n } from '../../lib/i18n';
import HelpBadge from '../../components/ui/HelpBadge';

interface SettingsSectionProps {
  storeId: number;
  refreshTrigger: number;
  triggerRefresh?: () => void;
}

const TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'Asia/Singapore', 'Asia/Kuala_Lumpur'];
const ALL_PAYMENT_METHODS = ['Cash', 'QRIS', 'Transfer', 'Debit', 'E-Wallet'];

export default function SettingsSection({ storeId, refreshTrigger, triggerRefresh }: SettingsSectionProps) {
  const { t } = useI18n();
  const [settings, setSettings] = useState<StoreSettings>({ ...DEFAULT_STORE_SETTINGS, store_id: storeId });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [outlets, setOutlets] = useState<Store[]>([]);
  const [syncSource, setSyncSource] = useState<number>(0);
  const [syncTarget, setSyncTarget] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    dbService.getSettings(storeId).then(s => { setSettings(s); setLoading(false); }).catch(() => setLoading(false));
    dbService.listStores().then(list => {
      setOutlets(list);
      if (list.length >= 2) { setSyncSource(list[0].id); setSyncTarget(list[1].id); }
    }).catch(() => {});
  }, [storeId, refreshTrigger]);

  const doSyncProducts = async () => {
    if (syncSource === syncTarget) { setSyncMsg('Outlet sumber dan tujuan harus berbeda.'); return; }
    setSyncing(true); setSyncMsg('');
    try {
      await dbService.syncProducts(syncSource, syncTarget);
      setSyncMsg('Produk berhasil disinkronkan (nama, varian, harga, kategori). Stok tidak diubah.');
      triggerRefresh?.();
      setTimeout(() => setSyncMsg(''), 4000);
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : 'Gagal sinkron produk.');
    } finally { setSyncing(false); }
  };

  const set = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) =>
    setSettings(s => ({ ...s, [key]: value }));

  const togglePayment = (m: string) => {
    setSettings(s => ({
      ...s,
      payment_methods: s.payment_methods.includes(m)
        ? s.payment_methods.filter(x => x !== m)
        : [...s.payment_methods, m],
    }));
  };

  const save = async () => {
    setSaving(true); setSuccess(false);
    try {
      await dbService.saveSettings(settings);
      setSuccess(true);
      triggerRefresh?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan.');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="py-16 text-center text-slate-400 text-xs font-semibold">Memuat pengaturan...</div>;

  return (
    <div className="space-y-6 animate-fadeIn pb-12 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-slate-800 text-xl leading-none flex items-center gap-2">
            {t('set.title')}
            <HelpBadge
              align="right"
              text="Atur pajak, struk, metode pembayaran, dan sinkron produk antar-outlet di sini."
              steps={[
                'Ubah nilai lalu klik Simpan di kanan atas.',
                'Pajak & biaya layanan berlaku di kasir.',
                'Sinkron Produk menyalin katalog dari satu outlet ke outlet lain (tanpa mengubah stok).',
              ]}
            />
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">{t('set.subtitle')}</p>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : success ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? t('common.saving') : success ? t('common.saved') : t('common.save')}
        </button>
      </div>

      {/* Sinkron produk antar-outlet */}
      {outlets.length >= 2 && (
        <Card icon={Copy} title={t('set.syncTitle')} help={t('help.set.sync')}>
          <p className="text-[11px] text-slate-400 font-medium mb-3 leading-relaxed">
            {t('set.syncDesc')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('set.sourceOutlet')}</label>
              <select value={syncSource} onChange={e => setSyncSource(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                {outlets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('set.targetOutlet')}</label>
              <select value={syncTarget} onChange={e => setSyncTarget(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
                {outlets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <button onClick={doSyncProducts} disabled={syncing} className="flex items-center gap-1.5 mt-4 px-4 py-2.5 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer disabled:opacity-50">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t('set.syncBtn')}
          </button>
          {syncMsg && <p className="text-[11px] font-semibold text-indigo-600 mt-2">{syncMsg}</p>}
        </Card>
      )}

      {/* Pajak & biaya */}
      <Card icon={Receipt} title={t('set.taxTitle')} help={t('help.set.tax')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('set.taxRate')}</label>
            <input type="number" value={settings.tax_rate} onChange={e => set('tax_rate', Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('set.serviceRate')}</label>
            <input type="number" value={settings.service_charge_rate} onChange={e => set('service_charge_rate', Number(e.target.value) || 0)} className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
        <label className="flex items-center gap-2.5 mt-4 cursor-pointer">
          <input type="checkbox" checked={settings.tax_included} onChange={e => set('tax_included', e.target.checked)} className="h-4 w-4 rounded accent-indigo-600" />
          <span className="text-xs font-semibold text-slate-600">{t('set.taxIncluded')}</span>
        </label>
        <div className="mt-4">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('set.roundingTo')}</label>
          <input type="number" value={settings.rounding} onChange={e => set('rounding', Number(e.target.value) || 0)} placeholder="0 = tanpa pembulatan" className="w-full sm:w-48 bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500" />
        </div>
      </Card>

      {/* Struk & penomoran */}
      <Card icon={Receipt} title={t('set.receiptTitle')} help={t('help.set.receipt')}>
        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('set.orderPrefix')}</label>
            <input value={settings.order_prefix || ''} onChange={e => set('order_prefix', e.target.value)} placeholder="ORD" className="w-full sm:w-48 bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('set.receiptHeader')}</label>
            <input value={settings.receipt_header || ''} onChange={e => set('receipt_header', e.target.value)} placeholder="Nama/alamat toko" className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('set.receiptFooter')}</label>
            <input value={settings.receipt_footer || ''} onChange={e => set('receipt_footer', e.target.value)} placeholder="Terima kasih..." className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
      </Card>

      {/* Pembayaran */}
      <Card icon={CreditCard} title={t('set.paymentTitle')} help={t('help.set.payment')}>
        <div className="flex flex-wrap gap-2">
          {ALL_PAYMENT_METHODS.map(m => {
            const active = settings.payment_methods.includes(m);
            return (
              <button key={m} onClick={() => togglePayment(m)} className={`px-3.5 py-2 rounded-xl text-[11px] font-bold cursor-pointer transition-all border ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                {m}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 font-medium mt-2">{t('set.paymentHint')}</p>
      </Card>

      {/* Zona waktu & notifikasi */}
      <Card icon={Clock} title={t('set.tzTitle')} help={t('help.set.tz')}>
        <div className="space-y-4">
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('set.tz')}</label>
            <select value={settings.timezone} onChange={e => set('timezone', e.target.value)} className="w-full sm:w-64 bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{t('set.lowStockThreshold')}</label>
            <input type="number" value={settings.low_stock_threshold} onChange={e => set('low_stock_threshold', Number(e.target.value) || 0)} className="w-full sm:w-48 bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500" />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={settings.notification_stock} onChange={e => set('notification_stock', e.target.checked)} className="h-4 w-4 rounded accent-indigo-600" />
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Bell className="h-3.5 w-3.5 text-slate-400" /> {t('set.notifStock')}</span>
          </label>
        </div>
      </Card>
    </div>
  );
}

function Card({ icon: Icon, title, children, help, steps }: { icon: any; title: string; children: React.ReactNode; help?: string; steps?: string[] }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Icon className="h-4 w-4" /></div>
        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
        {help && <HelpBadge text={help} steps={steps} />}
      </div>
      {children}
    </div>
  );
}
