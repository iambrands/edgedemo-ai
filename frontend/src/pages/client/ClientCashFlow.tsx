import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Download, DollarSign, Briefcase, ArrowUpRight, PieChart } from 'lucide-react';
import { b2cApi } from '../../services/b2cApi';

type IncomeSource = {
  id: string; source: string; category: string; monthly_amount: number;
  ytd_amount: number; frequency: string; account: string; last_received: string;
};
type MonthlyPoint = { month: string; income: number; expenses: number; savings: number };

const CAT_COLORS: Record<string, string> = {
  salary: 'bg-blue-100 text-blue-700',
  freelance: 'bg-violet-100 text-violet-700',
  dividends: 'bg-emerald-100 text-emerald-700',
  interest: 'bg-cyan-100 text-cyan-700',
  rental: 'bg-amber-100 text-amber-700',
};
const CAT_LABELS: Record<string, string> = {
  salary: 'Salary', freelance: 'Freelance', dividends: 'Dividends', interest: 'Interest', rental: 'Rental',
};

const FREQ_LABELS: Record<string, string> = {
  'bi-weekly': 'Every 2 weeks', monthly: 'Monthly', quarterly: 'Quarterly',
  annual: 'Annual', irregular: 'Irregular',
};

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

function downloadCSV(sources: IncomeSource[]) {
  const header = 'Source,Category,Monthly Amount,YTD Amount,Frequency,Account\n';
  const rows = sources
    .map((s) => `"${s.source}","${s.category}",${s.monthly_amount},${s.ytd_amount},"${s.frequency}","${s.account}"`)
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'income-sources.csv';
  a.click();
  URL.revokeObjectURL(url);
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: {value: number; name: string; color: string}[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-800 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-600 capitalize">{p.name}:</span>
          <span className="font-semibold text-slate-900 tabular-nums">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function ClientCashFlow() {
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [history, setHistory] = useState<MonthlyPoint[]>([]);
  const [totalMonthly, setTotalMonthly] = useState(0);
  const [totalYtd, setTotalYtd] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  const load = useCallback(() => {
    setLoading(true);
    b2cApi.getIncome()
      .then((data) => {
        setSources(data.sources);
        setHistory(data.monthly_history);
        setTotalMonthly(data.total_monthly);
        setTotalYtd(data.total_ytd);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentMonth = history[history.length - 1];
  const savingsRate = currentMonth
    ? Math.round((currentMonth.savings / currentMonth.income) * 100)
    : 0;
  const avgSavings = history.length
    ? Math.round(history.reduce((s, m) => s + m.savings, 0) / history.length)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Cash Flow</h1>
            <p className="text-xs text-slate-500">Income sources · monthly snapshot · savings rate</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => downloadCSV(sources)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Monthly income', value: fmt(totalMonthly), icon: DollarSign, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'YTD income', value: fmt(totalYtd), icon: TrendingUp, color: 'bg-blue-50 text-blue-700' },
              { label: 'Savings rate (Aug)', value: `${savingsRate}%`, icon: PieChart, color: savingsRate >= 20 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700' },
              { label: 'Avg monthly savings', value: fmt(avgSavings), icon: Briefcase, color: 'bg-violet-50 text-violet-700' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon size={14} />
                </div>
                <p className="text-base font-bold text-slate-900 tabular-nums">{value}</p>
                <p className="text-[11px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 text-sm">Monthly Income vs. Expenses</h2>
              <div className="flex gap-1.5">
                {(['bar', 'area'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setChartType(t)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${chartType === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {t === 'bar' ? 'Bar' : 'Area'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={history} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
                    <Bar dataKey="expenses" fill="#F87171" radius={[4, 4, 0, 0]} name="Expenses" />
                    <Bar dataKey="savings" fill="#60A5FA" radius={[4, 4, 0, 0]} name="Savings" />
                  </BarChart>
                ) : (
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F87171" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#F87171" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fill="url(#incG)" name="Income" />
                    <Area type="monotone" dataKey="expenses" stroke="#F87171" strokeWidth={2} fill="url(#expG)" name="Expenses" />
                    <Area type="monotone" dataKey="savings" stroke="#60A5FA" strokeWidth={2} fill="none" name="Savings" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Income sources table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 text-sm">Income Sources</h2>
              <span className="text-xs text-slate-400">{sources.length} sources</span>
            </div>
            <div className="divide-y divide-slate-50">
              {sources.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <ArrowUpRight size={14} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{s.source}</p>
                    <p className="text-xs text-slate-400">{s.account} · {FREQ_LABELS[s.frequency] ?? s.frequency}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-700 tabular-nums">{fmt(s.monthly_amount)}<span className="text-xs font-normal text-slate-400">/mo</span></p>
                    <p className="text-xs text-slate-400 tabular-nums">{fmt(s.ytd_amount)} YTD</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${CAT_COLORS[s.category] ?? 'bg-slate-100 text-slate-600'}`}>
                    {CAT_LABELS[s.category] ?? s.category}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Total monthly income</span>
              <span className="text-base font-bold text-emerald-700 tabular-nums">{fmt(totalMonthly)}</span>
            </div>
          </div>

          {/* Savings rate insight */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex gap-3">
            <TrendingUp size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-700">
              Your <strong>current savings rate is {savingsRate}%</strong> of income — 
              {savingsRate >= 20
                ? ' above the 20% benchmark. Keep it up!'
                : savingsRate >= 15
                ? ' just below the recommended 20%. Small increases add up over time.'
                : ' below the recommended 20%. Consider reducing variable expenses or automating savings.'}
              {' '}Your average monthly surplus is <strong>{fmt(avgSavings)}</strong>.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
