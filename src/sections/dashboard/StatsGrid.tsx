import { ShoppingBag, Banknote, UserCheck, TrendingUp } from 'lucide-react';
import { dbService } from '../../lib/db';
import type { Transaction, Cashier } from '../../lib/db';
import { useStoreData } from '../../hooks/useStoreData';
import { useI18n } from '../../lib/i18n';
import HelpBadge from '../../components/ui/HelpBadge';

interface StatsGridProps {
  storeId: number;
  refreshTrigger: number;
}

export default function StatsGrid({ storeId, refreshTrigger }: StatsGridProps) {
  const { t } = useI18n();
  const [txs] = useStoreData<Transaction[]>(dbService.getTransactions, storeId, refreshTrigger, []);
  const [cashiers] = useStoreData<Cashier[]>(dbService.getCashiers, storeId, refreshTrigger, []);

  // Sum total income
  const totalIncome = txs.reduce((sum, t) => sum + t.total_amount, 0);
  
  // Format Currency
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const avgOrderValue = txs.length > 0 ? totalIncome / txs.length : 0;

  const statCards = [
    {
      title: t('dash.totalRevenue'),
      value: formatIDR(totalIncome),
      desc: t('dash.totalRevenueDesc'),
      icon: Banknote,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100/50"
    },
    {
      title: t('dash.totalTx'),
      value: txs.length.toString(),
      desc: t('dash.totalTxDesc'),
      icon: ShoppingBag,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100/50"
    },
    {
      title: t('dash.avgOrder'),
      value: formatIDR(avgOrderValue),
      desc: t('dash.avgOrderDesc'),
      icon: TrendingUp,
      color: "text-amber-600 bg-amber-50 border-amber-100/50"
    },
    {
      title: t('dash.activeCashiers'),
      value: cashiers.length.toString(),
      desc: t('dash.activeCashiersDesc'),
      icon: UserCheck,
      color: "text-sky-600 bg-sky-50 border-sky-100/50"
    }
  ];

  return (
    <div className="space-y-3 animate-fadeIn">
      <div className="flex items-center gap-1.5">
        <h4 className="font-bold text-slate-800 text-sm leading-none">{t('sales.summary')}</h4>
        <HelpBadge text={t('help.dash.kpi')} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:shadow-slate-200/60 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-between">
            <div className="text-left space-y-1">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{c.title}</span>
              <h3 className="font-extrabold text-slate-800 text-lg leading-tight">{c.value}</h3>
              <p className="text-[9px] font-medium text-slate-400 leading-none">{c.desc}</p>
            </div>
            
            <div className={`h-11 w-11 rounded-2xl border flex items-center justify-center shrink-0 ${c.color}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
