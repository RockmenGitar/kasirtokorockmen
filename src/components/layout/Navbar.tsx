import { type UserProfile } from '../../lib/db';
import { useI18n, type Lang } from '../../lib/i18n';
import { Menu } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserProfile;
  avatarUrl?: string;
  onOpenMobileNav?: () => void;
}

export default function Navbar({ activeTab, setActiveTab, currentUser, avatarUrl = '', onOpenMobileNav }: NavbarProps) {
  const { t, lang, setLang } = useI18n();

  const isCashier = currentUser.role === 'cashier';

  const displayName = isCashier
    ? (currentUser.name || t('role.cashier'))
    : currentUser.email.split('@')[0].split(/[-_.]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

  const initials = displayName.charAt(0).toUpperCase();

  const roleName = isCashier ? t('role.cashier') : t('role.owner');

  const TAB_KEYS: Record<string, string> = {
    dashboard: 'menu.dashboard', pos: 'menu.pos', invoices: 'menu.invoices', catalog: 'menu.catalog',
    inventory: 'menu.inventory', promos: 'menu.promos', customers: 'menu.customers', shifts: 'menu.shifts',
    sales: 'menu.sales', expenses: 'menu.expenses', settings: 'menu.settings', staff: 'menu.staff',
    profile: 'menu.profile', help: 'menu.help',
  };

  const LANG_OPTIONS: { id: Lang; label: string }[] = [
    { id: 'id', label: 'ID' },
    { id: 'en', label: 'EN' },
  ];

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 px-3 sm:px-8 flex items-center justify-between sticky top-0 z-10 shrink-0 shadow-sm">

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden h-9 w-9 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold text-slate-700 tracking-wide">
          {TAB_KEYS[activeTab] ? t(TAB_KEYS[activeTab]) : activeTab}
        </span>
      </div>

      <div className="flex items-center gap-5">

        {/* Language switcher */}
        <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200/60 p-0.5 rounded-xl">
          {LANG_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setLang(opt.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${
                lang === opt.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div
          onClick={() => setActiveTab('profile')}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
          title="Lihat profil"
        >
          {/* Avatar: foto kalau ada, inisial kalau tidak */}
          <div className="h-10 w-10 rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50 flex-shrink-0">
            {avatarUrl
              ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              )
              : (
                <div className="h-full w-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold text-sm">
                  {initials}
                </div>
              )
            }
          </div>

          <div className="hidden sm:block text-left">
            <span className="text-xs font-bold text-slate-700 block leading-tight group-hover:text-indigo-600 transition-colors duration-200">
              {displayName}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5 uppercase tracking-wide">
              {roleName}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
