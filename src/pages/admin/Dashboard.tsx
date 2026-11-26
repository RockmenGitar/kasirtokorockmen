import { LayoutDashboard } from 'lucide-react';
import StatsGrid from '../../sections/dashboard/StatsGrid';
import RecentActivity from '../../sections/dashboard/RecentActivity';

interface DashboardProps {
  storeId: number;
  refreshTrigger: number;
}

export default function Dashboard({ storeId, refreshTrigger }: DashboardProps) {
  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* HEADER SECTION */}
      <div>
        <h2 className="font-extrabold text-slate-800 text-xl leading-none flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-indigo-650" />
          <span>Ringkasan Bisnis</span>
        </h2>
        <p className="text-slate-400 text-xs mt-1.5 font-medium">
          Selamat datang! Berikut ringkasan aktivitas outlet Anda hari ini.
        </p>
      </div>

      {/* DYNAMIC KPI SUMMARY CARDS */}
      <StatsGrid storeId={storeId} refreshTrigger={refreshTrigger} />

      {/* RECENT OUTLET FEED & LOGS */}
      <RecentActivity storeId={storeId} refreshTrigger={refreshTrigger} />

    </div>
  );
}
