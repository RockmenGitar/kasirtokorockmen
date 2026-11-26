import { useMemo, useState } from 'react';
import { Download, TrendingUp, TrendingDown, Wallet, Receipt, Package, PiggyBank, Undo2 } from 'lucide-react';
import { dbService } from '../../lib/db';
import type { Transaction, Expense, Refund } from '../../lib/db';
import { useStoreData } from '../../hooks/useStoreData';

interface ReportsSectionProps {
  storeId: number;
  refreshTrigger: number;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.round(n || 0));
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function ReportsSection({ storeId, refreshTrigger }: ReportsSectionProps) {
  const [transactions] = useStoreData<Transaction[]>(dbService.getTransactions, storeId, refreshTrigger, []);
  const [expenses] = useStoreData<Expense[]>(dbService.getExpenses, storeId, refreshTrigger, []);
  const [refunds] = useStoreData<Refund[]>(dbService.getRefunds, storeId, refreshTrigger, []);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11

  const period = useMemo(() => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    return { start, end };
  }, [year, month]);

  const inPeriod = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= period.start && d <= period.end;
  };

  const monthTx = useMemo(() => transactions.filter(t => inPeriod(t.created_at) && t.status === 'Success'), [transactions, period]);
  const monthRefunds = useMemo(() => refunds.filter(r => inPeriod(r.created_at)), [refunds, period]);
  const monthExpenses = useMemo(() => expenses.filter(e => {
    const d = new Date(e.date);
    return d >= period.start && d <= period.end;
  }), [expenses, period]);

  const metrics = useMemo(() => {
    const grossSales = monthTx.reduce((s, t) => s + (t.total_amount || 0), 0);
    const totalDiscount = monthTx.reduce((s, t) => s + (t.discount || 0), 0);
    const totalRefund = monthRefunds.reduce((s, r) => s + (r.amount || 0), 0);
    const netSales = grossSales - totalRefund;
    const cogs = monthTx.reduce((s, t) => s + (t.cogs || 0), 0);
    const grossProfit = netSales - cogs;
    const totalExpense = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const netProfit = grossProfit - totalExpense;
    const txCount = monthTx.length;
    const unitsSold = monthTx.reduce((s, t) => s + t.items.reduce((a, i) => a + i.quantity, 0), 0);
    const tax = monthTx.reduce((s, t) => s + (t.tax || 0), 0);
    return { grossSales, totalDiscount, totalRefund, netSales, cogs, grossProfit, totalExpense, netProfit, txCount, unitsSold, tax };
  }, [monthTx, monthRefunds, monthExpenses]);

  // Previous month comparison
  const prevMetrics = useMemo(() => {
    const ps = new Date(year, month - 1, 1);
    const pe = new Date(year, month, 0, 23, 59, 59);
    const inPrev = (iso?: string) => { if (!iso) return false; const d = new Date(iso); return d >= ps && d <= pe; };
    const pTx = transactions.filter(t => inPrev(t.created_at) && t.status === 'Success');
    const pRef = refunds.filter(r => inPrev(r.created_at));
    const pExp = expenses.filter(e => { const d = new Date(e.date); return d >= ps && d <= pe; });
    const gross = pTx.reduce((s, t) => s + (t.total_amount || 0), 0);
    const net = gross - pRef.reduce((s, r) => s + r.amount, 0);
    const cogs = pTx.reduce((s, t) => s + (t.cogs || 0), 0);
    const exp = pExp.reduce((s, e) => s + e.amount, 0);
    return { netSales: net, grossProfit: net - cogs, netProfit: net - cogs - exp, txCount: pTx.length };
  }, [transactions, refunds, expenses, year, month]);

  // Daily chart
  const daily = useMemo(() => {
    const days = period.end.getDate();
    const arr = Array.from({ length: days }, () => ({ sales: 0, profit: 0 }));
    monthTx.forEach(t => {
      const d = new Date(t.created_at || '').getDate() - 1;
      if (d >= 0 && d < arr.length) {
        arr[d].sales += t.total_amount || 0;
        arr[d].profit += (t.total_amount || 0) - (t.cogs || 0);
      }
    });
    return arr;
  }, [monthTx, period]);

  const maxDaily = Math.max(1, ...daily.map(d => d.sales));

  const delta = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

  const exportMonthlyCSV = () => {
    const lines: string[][] = [];
    lines.push(['Rekap Bulanan', `${MONTH_NAMES[month]} ${year}`]);
    lines.push([]);
    lines.push(['Metrik', 'Nilai']);
    lines.push(['Penjualan Kotor', String(Math.round(metrics.grossSales))]);
    lines.push(['Diskon', String(Math.round(metrics.totalDiscount))]);
    lines.push(['Refund', String(Math.round(metrics.totalRefund))]);
    lines.push(['Penjualan Bersih', String(Math.round(metrics.netSales))]);
    lines.push(['HPP', String(Math.round(metrics.cogs))]);
    lines.push(['Laba Kotor', String(Math.round(metrics.grossProfit))]);
    lines.push(['Pengeluaran', String(Math.round(metrics.totalExpense))]);
    lines.push(['Laba Bersih Operasional', String(Math.round(metrics.netProfit))]);
    lines.push(['Jumlah Transaksi', String(metrics.txCount)]);
    lines.push(['Barang Terjual', String(metrics.unitsSold)]);
    lines.push([]);
    lines.push(['Tanggal', 'Penjualan', 'Laba Kotor']);
    daily.forEach((d, i) => lines.push([`${i + 1}`, String(Math.round(d.sales)), String(Math.round(d.profit))]));
    const csv = lines.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rekap_${year}_${String(month + 1).padStart(2, '0')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-extrabold text-slate-800 text-xl leading-none">Laporan &amp; Rekap Bulanan</h2>
          <p className="text-slate-400 text-xs mt-1.5 font-medium">Ringkasan omzet, laba, dan perbandingan periode.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 cursor-pointer">
            {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 cursor-pointer">
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={exportMonthlyCSV} className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
            <Download className="h-3.5 w-3.5" /> Ekspor CSV
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Receipt} label="Penjualan Kotor" value={fmt(metrics.grossSales)} delta={delta(metrics.netSales, prevMetrics.netSales)} color="indigo" />
        <MetricCard icon={Wallet} label="Penjualan Bersih" value={fmt(metrics.netSales)} delta={delta(metrics.netSales, prevMetrics.netSales)} color="blue" />
        <MetricCard icon={PiggyBank} label="Laba Kotor" value={fmt(metrics.grossProfit)} delta={delta(metrics.grossProfit, prevMetrics.grossProfit)} color="emerald" />
        <MetricCard icon={TrendingUp} label="Laba Bersih Operasional" value={fmt(metrics.netProfit)} delta={delta(metrics.netProfit, prevMetrics.netProfit)} color="violet" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat icon={Undo2} label="Refund" value={fmt(metrics.totalRefund)} />
        <MiniStat icon={Package} label="Barang Terjual" value={String(metrics.unitsSold)} />
        <MiniStat icon={Receipt} label="Transaksi" value={String(metrics.txCount)} />
        <MiniStat icon={Wallet} label="Pengeluaran" value={fmt(metrics.totalExpense)} />
      </div>

      {/* Daily chart */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm mb-4">Penjualan Harian — {MONTH_NAMES[month]} {year}</h3>
        <div className="flex items-end gap-1 h-48">
          {daily.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="w-full flex flex-col justify-end h-full gap-0.5">
                <div className="w-full bg-indigo-500 rounded-t-sm transition-all group-hover:bg-indigo-600" style={{ height: `${(d.sales / maxDaily) * 100}%` }} title={`Penjualan: ${fmt(d.sales)}`} />
              </div>
              {(i === 0 || (i + 1) % 5 === 0) && <span className="text-[8px] text-slate-300 font-bold">{i + 1}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* P&L summary */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-800 text-sm mb-4">Ringkasan Laba Rugi</h3>
        <div className="space-y-2.5">
          <PnLRow label="Penjualan Kotor" value={metrics.grossSales} />
          <PnLRow label="(−) Diskon" value={-metrics.totalDiscount} negative />
          <PnLRow label="(−) Refund" value={-metrics.totalRefund} negative />
          <PnLRow label="Penjualan Bersih" value={metrics.netSales} bold />
          <PnLRow label="(−) HPP" value={-metrics.cogs} negative />
          <PnLRow label="Laba Kotor" value={metrics.grossProfit} bold />
          <PnLRow label="(−) Pengeluaran Operasional" value={-metrics.totalExpense} negative />
          <div className="flex justify-between pt-2.5 border-t border-slate-100">
            <span className="text-sm font-extrabold text-slate-800">Laba Bersih Operasional</span>
            <span className={`text-sm font-extrabold ${metrics.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(metrics.netProfit)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, delta, color }: { icon: any; label: string; value: string; delta: number; color: string }) {
  const map: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  const up = delta >= 0;
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-3 ${map[color]}`}><Icon className="h-4.5 w-4.5" /></div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-extrabold text-slate-800 leading-tight mt-0.5">{value}</p>
      <div className={`inline-flex items-center gap-1 text-[10px] font-bold mt-1.5 ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(delta).toFixed(1)}% vs bulan lalu
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center"><Icon className="h-4 w-4" /></div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-extrabold text-slate-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}

function PnLRow({ label, value, bold, negative }: { label: string; value: number; bold?: boolean; negative?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className={bold ? 'font-extrabold text-slate-800' : 'font-semibold text-slate-500'}>{label}</span>
      <span className={bold ? 'font-extrabold text-slate-800' : negative ? 'font-semibold text-rose-500' : 'font-semibold text-slate-700'}>{fmt(value)}</span>
    </div>
  );
}
