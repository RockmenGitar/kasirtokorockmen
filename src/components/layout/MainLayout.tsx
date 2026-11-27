import { useState, useEffect, useMemo } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';
import ErrorBoundary from '../ui/ErrorBoundary';
import { authService, dbService, type UserProfile, type Store } from '../../lib/db';

import Dashboard from '../../pages/admin/Dashboard';
import Catalog from '../../pages/admin/Catalog';
import Sales from '../../pages/admin/Sales';
import Staff from '../../pages/admin/Staff';
import Profile from '../../pages/admin/Profile';
import Inventory from '../../pages/admin/Inventory';
import Customers from '../../pages/admin/Customers';
import Expenses from '../../pages/admin/Expenses';
import Promos from '../../pages/admin/Promos';
import SettingsPage from '../../pages/admin/Settings';
import POS from '../../pages/shared/POS';
import Invoices from '../../pages/shared/Invoices';
import Shifts from '../../pages/shared/Shifts';
import Help from '../../pages/shared/Help';

interface MainLayoutProps {
  currentUser: UserProfile;
  onLogout: () => void;
}

export default function MainLayout({ currentUser, onLogout }: MainLayoutProps) {
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (currentUser.role === 'admin') return 'dashboard';
    const granted = currentUser.permissions ?? ['pos', 'invoices'];
    if (granted.includes('pos')) return 'pos';
    if (granted.includes('dashboard')) return 'dashboard';
    if (granted.includes('invoices')) return 'invoices';
    return granted[0] ?? 'profile';
  });

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem('kasirnya_sidebar_collapsed') === '1'
  );
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('kasirnya_sidebar_collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  };

  // ── Outlet selection ──────────────────────────────────────────────────
  const allowedStoreIds = useMemo<number[]>(() => {
    if (currentUser.role === 'admin') return currentUser.store_ids ?? [currentUser.store_id];
    return currentUser.store_ids ?? [currentUser.store_id];
  }, [currentUser]);

  const [stores, setStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<number>(() => {
    const saved = Number(localStorage.getItem('kasirnya_active_store'));
    if (saved && allowedStoreIds.includes(saved)) return saved;
    return currentUser.store_id;
  });

  useEffect(() => {
    authService.listStores().then(all => {
      const mine = currentUser.role === 'admin'
        ? all
        : all.filter(s => allowedStoreIds.includes(s.id));
      setStores(mine);
    }).catch(() => {});
  }, [currentUser, allowedStoreIds]);

  const switchStore = (id: number) => {
    if (id === activeStoreId) return;
    setActiveStoreId(id);
    try { localStorage.setItem('kasirnya_active_store', String(id)); } catch {}
    setMountedTabs(new Set([activeTab]));
    setRefreshTrigger(prev => prev + 1);
  };

  const [mountedTabs, setMountedTabs] = useState<Set<string>>(() => new Set([activeTab]));

  useEffect(() => {
    setMountedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const [avatarUrl, setAvatarUrl] = useState<string>(
    () => localStorage.getItem(`kasirnya_avatar_${currentUser.store_id}`) ?? ''
  );
  const [storeName, setStoreName] = useState<string>('');

  useEffect(() => {
    setAvatarUrl(localStorage.getItem(`kasirnya_avatar_${activeStoreId}`) ?? '');
    authService.getStoreById(activeStoreId).then(store => {
      if (store?.avatar_url) {
        localStorage.setItem(`kasirnya_avatar_${activeStoreId}`, store.avatar_url);
        setAvatarUrl(store.avatar_url);
      } else {
        setAvatarUrl('');
      }
      if (store?.name) setStoreName(store.name);
    }).catch(() => {});
  }, [activeStoreId]);

  useEffect(() => {
    Promise.all([
      dbService.getProducts(activeStoreId),
      dbService.getCategories(activeStoreId),
      dbService.getTransactions(activeStoreId),
    ]).catch(() => {});
  }, [activeStoreId]);

  const tabContents = useMemo(() => ({
    dashboard: <Dashboard storeId={activeStoreId} refreshTrigger={refreshTrigger} />,
    pos: <POS storeId={activeStoreId} refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh} currentUser={currentUser} />,
    invoices: <Invoices storeId={activeStoreId} refreshTrigger={refreshTrigger} setActiveTab={setActiveTab} currentUser={currentUser} triggerRefresh={triggerRefresh} />,
    catalog: <Catalog storeId={activeStoreId} refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh} />,
    inventory: <Inventory storeId={activeStoreId} refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh} currentUser={currentUser} />,
    customers: <Customers storeId={activeStoreId} refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh} />,
    promos: <Promos storeId={activeStoreId} refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh} />,
    sales: <Sales storeId={activeStoreId} refreshTrigger={refreshTrigger} />,
    expenses: <Expenses storeId={activeStoreId} refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh} currentUser={currentUser} />,
    shifts: <Shifts storeId={activeStoreId} refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh} currentUser={currentUser} />,
    settings: <SettingsPage storeId={activeStoreId} refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh} />,
    staff: <Staff storeId={activeStoreId} refreshTrigger={refreshTrigger} triggerRefresh={triggerRefresh} allStores={stores} />,
    profile: <Profile currentUser={currentUser} avatarUrl={avatarUrl} onAvatarChange={setAvatarUrl} onStoreNameChange={setStoreName} />,
    help: <Help currentUser={currentUser} />,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [activeStoreId, refreshTrigger, currentUser, avatarUrl]);

  const tabKeys = Object.keys(tabContents) as (keyof typeof tabContents)[];

  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={onLogout}
        storeName={storeName}
        avatarUrl={avatarUrl}
        stores={stores}
        activeStoreId={activeStoreId}
        onSwitchStore={switchStore}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      <main className={`flex-1 pl-0 ${sidebarCollapsed ? 'lg:pl-[5.5rem]' : 'lg:pl-64'} flex flex-col min-h-screen transition-[padding] duration-300 ease-out`}>

        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          avatarUrl={avatarUrl}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <div className={`${activeTab === 'pos' || activeTab === 'invoices' ? 'px-3 sm:px-8' : 'p-3 sm:p-8'} flex-1 overflow-x-hidden flex flex-col justify-between`}>

          <div className="flex-1">
            {tabKeys.map(tab => {
              if (!mountedTabs.has(tab)) return null;
              const isActive = activeTab === tab;
              return (
                <div key={tab} className={isActive ? '' : 'hidden'}>
                  {isActive ? <ErrorBoundary>{tabContents[tab]}</ErrorBoundary> : tabContents[tab]}
                </div>
              );
            })}
          </div>

          {activeTab !== 'pos' && activeTab !== 'invoices' && <Footer />}

        </div>
      </main>
    </div>
  );
}
