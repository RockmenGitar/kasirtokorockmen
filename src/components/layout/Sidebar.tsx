import { useState } from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Package,
  BarChart3,
  User,
  HelpCircle,
  LogOut,
  UserPlus,
  ShoppingCart,
  ChevronsLeft,
  ChevronsRight,
  Boxes,
  Users,
  Wallet,
  Settings,
  Tag,
  Clock
} from 'lucide-react';
import { authService, type UserProfile, type Store } from '../../lib/db';
import { useI18n } from '../../lib/i18n';
import SignOutModal from '../modal/SignOutModal';
import KasirIcon from '../ui/KasirIcon';
import { ChevronDown, Store as StoreIcon } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserProfile;
  onLogout: () => void;
  storeName?: string;
  avatarUrl?: string;
  stores?: Store[];
  activeStoreId?: number;
  onSwitchStore?: (id: number) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  storeName,
  avatarUrl,
  stores = [],
  activeStoreId,
  onSwitchStore,
  collapsed,
  onToggleCollapsed,
  mobileOpen = false,
  onCloseMobile
}: SidebarProps) {
  const { t } = useI18n();
  const [showSignOut, setShowSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showOutletMenu, setShowOutletMenu] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await authService.signOut();
    onLogout();
  };

  const ALL_MENU = [
    { id: 'dashboard', name: t('menu.dashboard'), icon: LayoutDashboard },
    { id: 'pos', name: t('menu.pos'), icon: ShoppingCart },
    { id: 'invoices', name: t('menu.invoices'), icon: ReceiptText },
    { id: 'catalog', name: t('menu.catalog'), icon: Package },
    { id: 'inventory', name: t('menu.inventory'), icon: Boxes },
    { id: 'promos', name: t('menu.promos'), icon: Tag },
    { id: 'customers', name: t('menu.customers'), icon: Users },
    { id: 'shifts', name: t('menu.shifts'), icon: Clock },
    { id: 'sales', name: t('menu.sales'), icon: BarChart3 },
    { id: 'expenses', name: t('menu.expenses'), icon: Wallet },
    { id: 'settings', name: t('menu.settings'), icon: Settings },
    { id: 'staff', name: t('menu.staff'), icon: UserPlus },
  ];

  const getMenuItems = () => {
    if (currentUser.role === 'cashier') {
      const granted = currentUser.permissions ?? ['pos', 'invoices'];
      const filtered = ALL_MENU.filter(item => granted.includes(item.id));
      return [...filtered, { id: 'profile', name: t('menu.profile'), icon: User }];
    }
    return [...ALL_MENU, { id: 'profile', name: t('menu.profile'), icon: User }];
  };

  const menuItems = getMenuItems();

  const labelTransition = 'transition-[opacity,max-width] duration-300 ease-out whitespace-nowrap overflow-hidden';
  const labelState = collapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[200px]';

  return (
    <>
    {/* Overlay for mobile */}
    {mobileOpen && (
      <div className="lg:hidden fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-sm" onClick={onCloseMobile} />
    )}
    <aside className={`${collapsed ? 'lg:w-[5.5rem]' : 'lg:w-64'} w-64 bg-white border-r border-slate-100/80 flex flex-col h-screen fixed left-0 top-0 z-30 transition-transform lg:transition-[width] duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

      <button
        onClick={onToggleCollapsed}
        title={collapsed ? 'Perbesar sidebar' : 'Perkecil sidebar'}
        className="absolute -right-3 top-9 h-6 w-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-200 shadow-sm cursor-pointer z-30 transition-colors"
      >
        {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
      </button>

      <div className="p-6 border-b border-slate-100/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200/60 shrink-0">
            <KasirIcon className="h-5 w-5" />
          </div>
          <div className={`${labelTransition} ${labelState}`}>
            <h1 className="font-extrabold text-slate-800 text-base leading-tight tracking-tight">KasirToko</h1>
            <span className="text-[10px] font-semibold text-slate-400 block tracking-wider uppercase mt-0.5">{t('menu.subtitle')}</span>
          </div>
        </div>

        {/* Outlet switcher */}
        {stores.length > 1 && (
          <div className={`mt-4 relative ${collapsed ? 'hidden' : ''}`}>
            <button
              onClick={() => setShowOutletMenu(v => !v)}
              className="w-full flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl px-3 py-2.5 cursor-pointer transition-colors"
            >
              <StoreIcon className="h-4 w-4 text-indigo-500 shrink-0" />
              <span className="flex-1 text-left text-xs font-bold text-slate-700 truncate">
                {stores.find(s => s.id === activeStoreId)?.name ?? storeName ?? 'Outlet'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            </button>
            {showOutletMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowOutletMenu(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-40 overflow-hidden">
                  {stores.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { onSwitchStore?.(s.id); setShowOutletMenu(false); }}
                      className={`w-full text-left px-3 py-2.5 text-xs font-semibold cursor-pointer transition-colors flex items-center justify-between ${
                        s.id === activeStoreId ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{s.name}</span>
                      {s.id === activeStoreId && <span className="text-indigo-500">●</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); onCloseMobile?.(); }}
              title={collapsed ? item.name : undefined}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 group ${isActive
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-300/30'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white/90' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span className={`flex-1 text-left text-sm ${labelTransition} ${labelState}`}>{item.name}</span>
              <div className={`h-1.5 w-1.5 bg-white/60 rounded-full shrink-0 transition-opacity duration-200 ${isActive && !collapsed ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-50 space-y-1">
        <button
          onClick={() => { setActiveTab('help'); onCloseMobile?.(); }}
          title={collapsed ? t('menu.help') : undefined}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
          <span className={`${labelTransition} ${labelState}`}>{t('menu.help')}</span>
        </button>

        <button
          onClick={() => setShowSignOut(true)}
          title={collapsed ? 'Keluar' : undefined}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold text-rose-500 hover:bg-rose-50/50 cursor-pointer transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className={`${labelTransition} ${labelState}`}>Keluar</span>
        </button>
      </div>

      {showSignOut && (
        <SignOutModal
          isOpen={showSignOut}
          onCancel={() => setShowSignOut(false)}
          onConfirm={handleSignOut}
          currentUser={currentUser}
          storeName={storeName}
          avatarUrl={avatarUrl}
          isLoading={signingOut}
        />
      )}
    </aside>
    </>
  );
}
