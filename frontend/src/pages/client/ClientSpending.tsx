import { useEffect, useMemo, useState, useRef } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDown,
  ArrowUp,
  Car,
  Coffee,
  Download,
  Heart,
  HelpCircle,
  Monitor,
  Music,
  Package,
  Receipt,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { b2cApi, type B2CTransaction } from '../../services/b2cApi';

/* ── category config ─────────────────────────────────────────────────────── */

interface CatCfg {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  Icon: LucideIcon;
}

const CAT_CFG: Record<string, CatCfg> = {
  groceries:    { label: 'Groceries',     color: '#10B981', bgClass: 'bg-emerald-100', textClass: 'text-emerald-700', Icon: ShoppingCart },
  dining:       { label: 'Dining',        color: '#F97316', bgClass: 'bg-orange-100',  textClass: 'text-orange-700',  Icon: Coffee },
  transport:    { label: 'Transport',     color: '#3B82F6', bgClass: 'bg-blue-100',    textClass: 'text-blue-700',    Icon: Car },
  entertainment:{ label: 'Entertainment', color: '#8B5CF6', bgClass: 'bg-purple-100',  textClass: 'text-purple-700',  Icon: Music },
  shopping:     { label: 'Shopping',      color: '#F43F5E', bgClass: 'bg-rose-100',    textClass: 'text-rose-700',    Icon: Package },
  utilities:    { label: 'Utilities',     color: '#64748B', bgClass: 'bg-slate-100',   textClass: 'text-slate-600',   Icon: Monitor },
  health:       { label: 'Health',        color: '#14B8A6', bgClass: 'bg-teal-100',    textClass: 'text-teal-700',    Icon: Heart },
  other:        { label: 'Other',         color: '#94A3B8', bgClass: 'bg-slate-100',   textClass: 'text-slate-500',   Icon: HelpCircle },
};

function getCfg(cat: string): CatCfg { return CAT_CFG[cat] ?? CAT_CFG.other; }

/* ── helpers ─────────────────────────────────────────────────────────────── */

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}
function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── mock "last month" data derived from current (simulate −20% to +30% per cat) ── */
function derivePriorMonth(breakdown: BreakdownRow[]): Record<string, number> {
  const factors: Record<string, number> = {
    groceries: 0.95, dining: 0.78, transport: 1.12,
    entertainment: 1.25, shopping: 0.88, utilities: 1.02, health: 0.90, other: 1.05,
  };
  const result: Record<string, number> = {};
  for (const row of breakdown) {
    result[row.category] = row.total * (factors[row.category] ?? 1.0);
  }
  return result;
}

/* ── breakdown computation ───────────────────────────────────────────────── */

interface BreakdownRow {
  category: string;
  label: string;
  total: number;
  color: string;
  pct: number;
}

function computeBreakdown(txns: B2CTransaction[]): BreakdownRow[] {
  const totals: Record<string, number> = {};
  let grand = 0;
  for (const t of txns) {
    if (t.amount <= 0) continue;
    const cat = t.category || 'other';
    totals[cat] = (totals[cat] ?? 0) + t.amount;
    grand += t.amount;
  }
  return Object.entries(totals)
    .map(([cat, total]) => ({
      category: cat, label: getCfg(cat).label, total,
      color: getCfg(cat).color, pct: grand > 0 ? (total / grand) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/* ── daily cumulative spend ──────────────────────────────────────────────── */

function computeDailyTrend(txns: B2CTransaction[]) {
  const byDate: Record<string, number> = {};
  for (const t of txns) {
    if (t.amount <= 0) continue;
    byDate[t.date] = (byDate[t.date] ?? 0) + t.amount;
  }
  const sorted = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
  let running = 0;
  return sorted.map(([date, amt]) => {
    running += amt;
    const [, m, d] = date.split('-');
    return { label: `${parseInt(m)}/${parseInt(d)}`, daily: amt, cumulative: running };
  });
}

/* ── top merchants ───────────────────────────────────────────────────────── */

function computeTopMerchants(txns: B2CTransaction[], n = 5) {
  const totals: Record<string, { total: number; count: number; category: string }> = {};
  for (const t of txns) {
    if (t.amount <= 0) continue;
    if (!totals[t.merchant]) totals[t.merchant] = { total: 0, count: 0, category: t.category };
    totals[t.merchant].total += t.amount;
    totals[t.merchant].count += 1;
  }
  return Object.entries(totals)
    .map(([merchant, d]) => ({ merchant, ...d }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

/* ── Tooltips ────────────────────────────────────────────────────────────── */

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: BreakdownRow }> }) {
  if (!active || !payload?.length) return null;
  const { label, total, pct } = payload[0].payload;
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="text-slate-600">{fmt(total)} · {pct.toFixed(1)}%</p>
    </div>
  );
}

function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-lg px-3 py-2 text-sm">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className={p.dataKey === 'cumulative' ? 'font-semibold text-blue-700' : 'text-slate-500 text-xs'}>
          {p.dataKey === 'cumulative' ? `Total: ${fmt(p.value)}` : `Daily: ${fmt(p.value)}`}
        </p>
      ))}
    </div>
  );
}

/* ── category badge ──────────────────────────────────────────────────────── */

function CatBadge({ cat }: { cat: string }) {
  const { label, bgClass, textClass, Icon } = getCfg(cat);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bgClass} ${textClass}`}>
      <Icon className="h-3 w-3" />{label}
    </span>
  );
}

/* ── category picker dropdown ────────────────────────────────────────────── */

function CatPicker({ current, onSelect }: { current: string; onSelect: (cat: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const categories = Object.keys(CAT_CFG);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border border-transparent hover:border-slate-300 transition-colors"
        style={{ background: getCfg(current).bgClass.replace('bg-', ''), color: 'inherit' }}
      >
        <CatBadge cat={current} />
        <span className="text-[9px] text-slate-400 ml-0.5">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-20 bg-white rounded-xl border border-slate-200 shadow-lg p-1 w-40 space-y-0.5">
          {categories.map((cat) => {
            const { label, bgClass, textClass, Icon } = getCfg(cat);
            return (
              <button key={cat} type="button"
                onClick={() => { onSelect(cat); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-slate-50 transition-colors ${cat === current ? 'bg-slate-50 font-semibold' : ''}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${bgClass}`}><Icon className={`h-3 w-3 ${textClass}`} /></span>
                <span className="text-slate-700">{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── CSV export ──────────────────────────────────────────────────────────── */

function downloadTransactionsCSV(txns: B2CTransaction[], catOverrides: Record<string, string>) {
  const header = 'Date,Merchant,Category,Amount,Account,Pending\n';
  const rows = txns.map((t) => {
    const cat = catOverrides[t.id] ?? t.category;
    return `"${t.date}","${t.merchant}","${cat}",${t.amount},"${t.account}",${t.pending}`;
  }).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ── main component ──────────────────────────────────────────────────────── */

export default function ClientSpending() {
  const [transactions, setTransactions] = useState<B2CTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  // category overrides: txn id → category
  const [catOverrides, setCatOverrides] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('firmum_cat_overrides') ?? '{}'); }
    catch { return {}; }
  });

  useEffect(() => {
    setIsLoading(true);
    b2cApi.getTransactions(30)
      .then((data) => setTransactions(data.transactions))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load transactions'))
      .finally(() => setIsLoading(false));
  }, []);

  const setCatOverride = (txnId: string, cat: string) => {
    setCatOverrides((prev) => {
      const next = { ...prev, [txnId]: cat };
      localStorage.setItem('firmum_cat_overrides', JSON.stringify(next));
      return next;
    });
  };

  // Apply overrides to transactions before computing derived data
  const txnsWithOverrides = useMemo(
    () => transactions.map((t) => ({ ...t, category: catOverrides[t.id] ?? t.category })),
    [transactions, catOverrides],
  );

  const breakdown = useMemo(() => computeBreakdown(txnsWithOverrides), [txnsWithOverrides]);
  const priorMonth = useMemo(() => derivePriorMonth(breakdown), [breakdown]);
  const dailyTrend = useMemo(() => computeDailyTrend(txnsWithOverrides), [txnsWithOverrides]);
  const topMerchants = useMemo(() => computeTopMerchants(txnsWithOverrides), [txnsWithOverrides]);

  const totalSpend = useMemo(
    () => transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    [transactions],
  );
  const priorTotal = useMemo(
    () => Object.values(priorMonth).reduce((s, v) => s + v, 0),
    [priorMonth],
  );
  const spendDelta = totalSpend - priorTotal;
  const spendDeltaPct = priorTotal > 0 ? (spendDelta / priorTotal) * 100 : 0;

  const filtered = useMemo(
    () => activeCategory
      ? txnsWithOverrides.filter((t) => t.category === activeCategory && t.amount > 0)
      : txnsWithOverrides.filter((t) => t.amount > 0),
    [txnsWithOverrides, activeCategory],
  );

  /* AI insight for spending */
  const topOverspend = useMemo(() => {
    return breakdown.find((row) => {
      const prior = priorMonth[row.category] ?? row.total;
      return row.total > prior * 1.1;
    });
  }, [breakdown, priorMonth]);

  return (
    <div className="space-y-5">

      {/* ── header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Receipt className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Spending</h1>
          <p className="text-xs text-slate-500">Last 30 days · {transactions.filter(t => t.amount > 0).length} transactions</p>
        </div>
        {!isLoading && (
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Total spent</p>
            <div className="flex items-baseline gap-1.5 justify-end">
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{fmt(totalSpend)}</p>
              <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${spendDelta <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {spendDelta <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {Math.abs(spendDeltaPct).toFixed(1)}% vs last mo
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* ── AI spending insight ──────────────────────────────────────── */}
          {topOverspend && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <strong>{topOverspend.label}</strong> spending is up{' '}
                {(((topOverspend.total - (priorMonth[topOverspend.category] ?? topOverspend.total)) /
                  (priorMonth[topOverspend.category] ?? topOverspend.total)) * 100).toFixed(0)}%
                vs last month ({fmt(priorMonth[topOverspend.category] ?? 0)} → {fmt(topOverspend.total)}).
                Consider reviewing your {topOverspend.label.toLowerCase()} habits to stay on budget.
              </p>
            </div>
          )}

          {/* ── 30-day cumulative trend ──────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">30-Day Spending Trend</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cumulativeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} width={36} />
                  <Tooltip content={<TrendTooltip />} />
                  <Bar dataKey="daily" fill="#E2E8F0" radius={[2, 2, 0, 0]} maxBarSize={12} />
                  <Area type="monotone" dataKey="cumulative" stroke="#3B82F6" strokeWidth={2.5} fill="url(#cumulativeGrad)" dot={false} activeDot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-400 mt-2">Blue line = running total · Gray bars = daily spend</p>
          </div>

          {/* ── breakdown + pie ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Spending by Category</h2>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-48 h-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={breakdown} dataKey="total" nameKey="label" cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
                      {breakdown.map((row) => (
                        <Cell key={row.category} fill={row.color} opacity={!activeCategory || activeCategory === row.category ? 1 : 0.25} style={{ cursor: 'pointer' }} onClick={() => setActiveCategory((c) => (c === row.category ? null : row.category))} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 space-y-1 min-w-0">
                {breakdown.map((row) => {
                  const prior = priorMonth[row.category] ?? row.total;
                  const delta = row.total - prior;
                  const deltaPct = prior > 0 ? (delta / prior) * 100 : 0;
                  return (
                    <button key={row.category} type="button"
                      onClick={() => setActiveCategory((c) => (c === row.category ? null : row.category))}
                      className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${activeCategory === row.category ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                      <span className="text-sm text-slate-700 flex-1 truncate">{row.label}</span>
                      <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium flex-shrink-0 ${delta > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {delta > 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                        {Math.abs(deltaPct).toFixed(0)}%
                      </span>
                      <span className="text-xs text-slate-400 tabular-nums w-10 text-right">{row.pct.toFixed(1)}%</span>
                      <span className="text-sm font-medium text-slate-800 tabular-nums w-16 text-right">{fmt(row.total)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── top merchants ────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Merchants This Month</h2>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topMerchants} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="merchant" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip formatter={(v: string | number | undefined) => [v != null ? fmt(Number(v)) : '$0', 'Spent']} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {topMerchants.map((m) => (
                      <Cell key={m.merchant} fill={getCfg(m.category).color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── transaction list ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">
                {activeCategory ? getCfg(activeCategory).label : 'All transactions'}
                <span className="ml-2 text-slate-400 font-normal">({filtered.length})</span>
              </h2>
              <div className="flex items-center gap-2">
                {activeCategory && (
                  <button type="button" onClick={() => setActiveCategory(null)} className="text-xs text-blue-600 hover:text-blue-700">
                    Clear filter
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => downloadTransactionsCSV(filtered, catOverrides)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Download size={12} />
                  CSV
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">No transactions found.</div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {filtered.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: getCfg(t.category).color + '20' }}>
                      {(() => { const { Icon } = getCfg(t.category); return <Icon className="h-4 w-4" style={{ color: getCfg(t.category).color }} />; })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{t.merchant}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <CatPicker current={t.category} onSelect={(cat) => setCatOverride(t.id, cat)} />
                        {catOverrides[t.id] && <span className="text-[9px] text-blue-500 font-medium">edited</span>}
                        {t.pending && <span className="text-xs text-amber-600 font-medium">Pending</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">{t.amount > 0 ? `-${fmt(t.amount)}` : `+${fmt(Math.abs(t.amount))}`}</p>
                      <p className="text-xs text-slate-400">{fmtDate(t.date)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
