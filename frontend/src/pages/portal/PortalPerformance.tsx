import { useState, useEffect } from 'react';
import {
  TrendingUp, PieChart as PieChartIcon, BarChart3,
  ArrowUpRight, ArrowDownRight, Loader2, Info,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell,
  PieChart, Pie,
} from 'recharts';
import { getPerformance } from '../../services/portalApi';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Summary {
  total_value: number;
  total_cost_basis: number;
  total_gain_loss: number;
  total_gain_loss_pct: number;
  ytd_return: number;
  mtd_return: number;
  inception_return: number;
  inception_date: string;
}

interface TimePoint { date: string; value: number; benchmark: number }
interface AllocItem { category: string; value?: number; pct: number }
interface MonthlyReturn { month: string; return: number; benchmark: number }

interface PerfData {
  summary: Summary;
  time_series: Record<string, TimePoint[]>;
  asset_allocation: { current: AllocItem[]; target: AllocItem[] };
  monthly_returns: MonthlyReturn[];
  benchmark_name: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PERIODS = [
  { key: '1M', label: '1M' },
  { key: '3M', label: '3M' },
  { key: 'YTD', label: 'YTD' },
  { key: '1Y', label: '1Y' },
  { key: 'ALL', label: 'All' },
];

const ALLOC_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

const fmtCur = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PortalPerformance() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PerfData | null>(null);
  const [period, setPeriod] = useState('YTD');
  const [tab, setTab] = useState<'overview' | 'allocation' | 'monthly'>('overview');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPerformance()
      .then((d) => {
        // Validate the response has expected structure
        if (d && typeof d === 'object' && d.summary && d.time_series) {
          setData(d);
        } else {
          setError('Performance data is unavailable');
        }
      })
      .catch((e) => {
        console.error('perf load failed', e);
        setError('Failed to load performance data');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Performance</h1>
          <p className="text-slate-500 text-sm">Track your portfolio performance over time</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-medium text-slate-900">{error || 'No performance data available'}</h3>
          <p className="text-sm text-slate-500 mt-1">Check back later or contact your advisor.</p>
        </div>
      </div>
    );
  }

  const s = data.summary ?? { total_value: 0, total_cost_basis: 0, total_gain_loss: 0, total_gain_loss_pct: 0, ytd_return: 0, mtd_return: 0, inception_return: 0, inception_date: '' };
  const positive = s.total_gain_loss >= 0;
  const chartData = (data.time_series?.[period] ?? []).map((p) => ({ ...p, date: fmtDate(p.date) }));

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Performance</h1>
          <p className="text-slate-500 text-sm">Track your portfolio performance over time</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card label="Total Value" main={fmtCur(s.total_value)} sub={`Cost basis: ${fmtCur(s.total_cost_basis)}`} />
          <Card
            label="Total Gain / Loss"
            main={fmtCur(s.total_gain_loss)}
            sub={fmtPct(s.total_gain_loss_pct)}
            positive={positive}
            icon={positive ? <ArrowUpRight className="h-5 w-5 text-emerald-600" /> : <ArrowDownRight className="h-5 w-5 text-red-600" />}
          />
          <Card label="YTD Return" main={fmtPct(s.ytd_return)} sub={`MTD: ${fmtPct(s.mtd_return)}`} positive={s.ytd_return >= 0} />
          <Card
            label="Since Inception"
            main={fmtPct(s.inception_return)}
            sub={`Since ${new Date(s.inception_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`}
            positive={s.inception_return >= 0}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {([
            { key: 'overview', label: 'Performance Chart', Icon: TrendingUp },
            { key: 'allocation', label: 'Asset Allocation', Icon: PieChartIcon },
            { key: 'monthly', label: 'Monthly Returns', Icon: BarChart3 },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <t.Icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ────────────────────────────── */}
        {tab === 'overview' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Portfolio vs {data.benchmark_name}</h2>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      period === p.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8 }} formatter={(v: any) => [fmtCur(v as number), '']} />
                  <Legend />
                  <Line type="monotone" dataKey="value" name="Your Portfolio" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="benchmark" name={data.benchmark_name} stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Allocation Tab ──────────────────────────── */}
        {tab === 'allocation' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Current Allocation</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.asset_allocation?.current ?? []} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="pct" nameKey="category" label={({ pct }: any) => `${pct}%`}>
                      {(data.asset_allocation?.current ?? []).map((_, i) => (
                        <Cell key={i} fill={ALLOC_COLORS[i % ALLOC_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${v}%`, 'Allocation']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {(data.asset_allocation?.current ?? []).map((item, i) => (
                  <div key={item.category} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ALLOC_COLORS[i] }} />
                    <span className="text-sm text-slate-600">{item.category}</span>
                    <span className="text-sm font-medium text-slate-900 ml-auto">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Current vs Target */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Current vs Target</h2>
              <div className="space-y-5">
                {(data.asset_allocation?.current ?? []).map((item, i) => {
                  const tgt = data.asset_allocation?.target?.[i] ?? { pct: 0 };
                  const diff = item.pct - tgt.pct;
                  return (
                    <div key={item.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{item.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-500">Target: {tgt.pct}%</span>
                          <span className={`text-sm font-medium ${diff > 0 ? 'text-amber-600' : diff < 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                            {diff > 0 ? '+' : ''}{diff}%
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="absolute h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: ALLOC_COLORS[i] }} />
                        <div className="absolute h-full w-0.5 bg-slate-500" style={{ left: `${tgt.pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700">The vertical line shows your target allocation. Speak with your advisor about rebalancing if drift exceeds 5%.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Monthly Tab ─────────────────────────────── */}
        {tab === 'monthly' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Monthly Returns (Last 12 Months)</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly_returns ?? []} barGap={0}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8 }} formatter={(v: any) => [`${(v as number).toFixed(2)}%`, '']} />
                  <Legend />
                  <Bar dataKey="return" name="Your Return" radius={[4, 4, 0, 0]}>
                    {(data.monthly_returns ?? []).map((entry, i) => (
                      <Cell key={i} fill={entry.return >= 0 ? '#10B981' : '#EF4444'} />
                    ))}
                  </Bar>
                  <Bar dataKey="benchmark" name={data.benchmark_name} fill="#94A3B8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
    </div>
  );
}

/* ── Helper Card ──────────────────────────────────────────────────── */

function Card({ label, main, sub, positive, icon }: {
  label: string; main: string; sub: string;
  positive?: boolean; icon?: React.ReactNode;
}) {
  const color = positive === undefined ? 'text-slate-900' : positive ? 'text-emerald-600' : 'text-red-600';
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <p className="text-sm text-slate-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`text-2xl font-bold ${color}`}>{main}</p>
        {icon}
      </div>
      <p className={`text-sm mt-1 ${positive === undefined ? 'text-slate-400' : color}`}>{sub}</p>
    </div>
  );
}
