import { useEffect, useMemo, useState } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Car,
  Coffee,
  Heart,
  HelpCircle,
  Monitor,
  Music,
  Package,
  Receipt,
  ShoppingCart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { b2cApi, type B2CTransaction } from '../../services/b2cApi';

/* ── category config ──────────────────────────────────────────────────────── */

interface CatCfg {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  Icon: LucideIcon;
}

const CAT_CFG: Record<string, CatCfg> = {
  groceries:    { label: 'Groceries',    color: '#10B981', bgClass: 'bg-emerald-100', textClass: 'text-emerald-700', Icon: ShoppingCart },
  dining:       { label: 'Dining',       color: '#F97316', bgClass: 'bg-orange-100',  textClass: 'text-orange-700',  Icon: Coffee },
  transport:    { label: 'Transport',    color: '#3B82F6', bgClass: 'bg-blue-100',    textClass: 'text-blue-700',    Icon: Car },
  entertainment:{ label: 'Entertainment',color: '#8B5CF6', bgClass: 'bg-purple-100',  textClass: 'text-purple-700',  Icon: Music },
  shopping:     { label: 'Shopping',     color: '#F43F5E', bgClass: 'bg-rose-100',    textClass: 'text-rose-700',    Icon: Package },
  utilities:    { label: 'Utilities',    color: '#64748B', bgClass: 'bg-slate-100',   textClass: 'text-slate-600',   Icon: Monitor },
  health:       { label: 'Health',       color: '#14B8A6', bgClass: 'bg-teal-100',    textClass: 'text-teal-700',    Icon: Heart },
  other:        { label: 'Other',        color: '#94A3B8', bgClass: 'bg-slate-100',   textClass: 'text-slate-500',   Icon: HelpCircle },
};

function getCfg(cat: string): CatCfg {
  return CAT_CFG[cat] ?? CAT_CFG.other;
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── breakdown computation ────────────────────────────────────────────────── */

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
      category: cat,
      label: getCfg(cat).label,
      total,
      color: getCfg(cat).color,
      pct: grand > 0 ? (total / grand) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/* ── pie tooltip ──────────────────────────────────────────────────────────── */

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: BreakdownRow }> }) {
  if (!active || !payload?.length) return null;
  const { label, total, pct } = payload[0].payload;
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-slate-800">{label}</p>
      <p className="text-slate-600">
        {fmt(total)} · {pct.toFixed(1)}%
      </p>
    </div>
  );
}

/* ── category badge ───────────────────────────────────────────────────────── */

function CatBadge({ cat }: { cat: string }) {
  const { label, bgClass, textClass, Icon } = getCfg(cat);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bgClass} ${textClass}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

/* ── main component ───────────────────────────────────────────────────────── */

export default function ClientSpending() {
  const [transactions, setTransactions] = useState<B2CTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    b2cApi
      .getTransactions(30)
      .then((data) => setTransactions(data.transactions))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load transactions'))
      .finally(() => setIsLoading(false));
  }, []);

  const breakdown = useMemo(() => computeBreakdown(transactions), [transactions]);
  const totalSpend = useMemo(
    () => transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    [transactions],
  );

  const filtered = useMemo(
    () =>
      activeCategory
        ? transactions.filter((t) => t.category === activeCategory && t.amount > 0)
        : transactions.filter((t) => t.amount > 0),
    [transactions, activeCategory],
  );

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
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{fmt(totalSpend)}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* ── breakdown + pie ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Spending by category</h2>
            <div className="flex flex-col md:flex-row gap-6">
              {/* pie chart */}
              <div className="w-full md:w-48 h-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdown}
                      dataKey="total"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {breakdown.map((row) => (
                        <Cell
                          key={row.category}
                          fill={row.color}
                          opacity={!activeCategory || activeCategory === row.category ? 1 : 0.3}
                          style={{ cursor: 'pointer' }}
                          onClick={() =>
                            setActiveCategory((c) => (c === row.category ? null : row.category))
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* legend list */}
              <div className="flex-1 space-y-1.5 min-w-0">
                {breakdown.map((row) => (
                  <button
                    key={row.category}
                    type="button"
                    onClick={() =>
                      setActiveCategory((c) => (c === row.category ? null : row.category))
                    }
                    className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                      activeCategory === row.category
                        ? 'bg-slate-100'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="text-sm text-slate-700 flex-1 truncate">{row.label}</span>
                    <span className="text-xs text-slate-400 tabular-nums">{row.pct.toFixed(1)}%</span>
                    <span className="text-sm font-medium text-slate-800 tabular-nums">{fmt(row.total)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── transaction list ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">
                {activeCategory ? getCfg(activeCategory).label : 'All transactions'}
                <span className="ml-2 text-slate-400 font-normal">({filtered.length})</span>
              </h2>
              {activeCategory && (
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Clear filter
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">No transactions found.</div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {filtered.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: getCfg(t.category).color + '20' }}>
                      {(() => {
                        const { Icon } = getCfg(t.category);
                        return <Icon className="h-4 w-4" style={{ color: getCfg(t.category).color }} />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{t.merchant}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <CatBadge cat={t.category} />
                        {t.pending && (
                          <span className="text-xs text-amber-600 font-medium">Pending</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">
                        {t.amount > 0 ? `-${fmt(t.amount)}` : `+${fmt(Math.abs(t.amount))}`}
                      </p>
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
