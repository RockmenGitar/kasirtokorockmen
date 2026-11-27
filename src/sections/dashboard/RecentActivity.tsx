import { useMemo } from 'react';
import { History } from 'lucide-react';
import { dbService } from '../../lib/db';
import type { Transaction } from '../../lib/db';
import { useStoreData } from '../../hooks/useStoreData';
import { txStatusKey, paymentKey } from '../../lib/labels';
import { useI18n } from '../../lib/i18n';
import HelpBadge from '../../components/ui/HelpBadge';

interface RecentActivityProps {
  storeId: number;
  refreshTrigger: number;
}

export default function RecentActivity({ storeId, refreshTrigger }: RecentActivityProps) {
  const { t } = useI18n();
  const [allTxs] = useStoreData<Transaction[]>(dbService.getTransactions, storeId, refreshTrigger, []);

  const txs = useMemo(() => [...allTxs].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  }).slice(0, 5), [allTxs]);

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4 text-left animate-fadeIn">
      
      <div className="flex items-center justify-between">
        <h4 className="font-extrabold text-slate-800 text-sm leading-none flex items-center gap-2">
          <History className="h-4.5 w-4.5 text-indigo-600" />
          <span>{t('dash.recentActivity')}</span>
          <HelpBadge text={t('help.dash.recent')} />
        </h4>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Live Feed</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
              <th className="pb-3 pl-2">{t('inv.receiptNo')}</th>
              <th className="pb-3">{t('inv.customer')}</th>
              <th className="pb-3">{t('common.total')}</th>
              <th className="pb-3">{t('inv.payment')}</th>
              <th className="pb-3">{t('inv.status')}</th>
              <th className="pb-3 pr-2 text-right">{t('inv.time')}</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-50 text-[11px] font-semibold text-slate-600">
            {txs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                  {t('dash.noSales')}
                </td>
              </tr>
            ) : (
              txs.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 pl-2 font-mono text-slate-800 font-bold">{tx.order_id}</td>
                  <td className="py-3 text-slate-500 capitalize">{tx.customer_name}</td>
                  <td className="py-3 font-bold text-slate-800">{formatIDR(tx.total_amount)}</td>
                  <td className="py-3">
                    <span className="bg-slate-50 border border-slate-100/50 text-slate-500 px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-wide font-mono">
                      {t(paymentKey(tx.payment_method))}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide ${
                      tx.status === 'Success'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                        : 'bg-amber-50 text-amber-600 border border-amber-100/50'
                    }`}>
                      {t(txStatusKey(tx.status))}
                    </span>
                  </td>
                  <td className="py-3 pr-2 text-right font-mono text-slate-400 text-[10px]">
                    {tx.created_at ? new Date(tx.created_at).toLocaleString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      day: '2-digit',
                      month: '2-digit'
                    }) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
