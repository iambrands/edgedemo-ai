import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  DollarSign,
  RefreshCw,
  Shield,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  b2cApi,
  type B2CAdvisorTransparency,
} from '../../services/b2cApi';

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtPct(v: number) {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function activityIcon(type: string) {
  if (type === 'trade') return TrendingUp;
  if (type === 'rebalance') return RefreshCw;
  return Activity;
}

export default function AdvisorTransparency() {
  const [data, setData] = useState<B2CAdvisorTransparency | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    b2cApi
      .getAdvisorTransparency()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error || 'Advisor transparency data unavailable.'}
      </div>
    );
  }

  const chartData = data.performance.time_series.map((p) => ({
    date: p.date.slice(5),
    portfolio: p.portfolio,
    benchmark: p.benchmark,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Advisor activity</h1>
        <p className="text-sm text-slate-500 mt-1">
          Transparency from {data.advisor.name} · {data.advisor.firm}
        </p>
      </div>

      {/* Fee disclosure */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Fee disclosure</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">AUM fee rate</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
              {data.fees.fee_rate_pct.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">YTD fees paid</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
              {fmtCurrency(data.fees.ytd_fees_paid)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Billing period</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">{data.fees.billing_period}</p>
            <p className="text-xs text-slate-500">
              Next bill: {fmtDate(data.fees.next_billing_date)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">AUM basis</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
              {fmtCurrency(data.fees.aum_basis)}
            </p>
            <p className="text-xs text-slate-500">
              Est. annual: {fmtCurrency(data.fees.annual_fee_estimate)}
            </p>
          </div>
        </div>
      </div>

      {/* Performance vs benchmark */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-slate-900 text-sm">
                Performance vs {data.performance.benchmark_name}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">Indexed to 100 — trailing 12 months</p>
          </div>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-slate-500">Portfolio YTD </span>
              <span className="font-semibold text-emerald-700 tabular-nums">
                {fmtPct(data.performance.portfolio_return_ytd)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Benchmark YTD </span>
              <span className="font-semibold text-slate-700 tabular-nums">
                {fmtPct(data.performance.benchmark_return_ytd)}
              </span>
            </div>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="portfolio"
                name="Your portfolio"
                stroke="#2563EB"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                name={data.performance.benchmark_name}
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity log */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Recent activity</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {data.activity.map((item) => {
            const Icon = activityIcon(item.type);
            return (
              <div key={item.id} className="px-5 py-4 flex gap-4">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <span className="text-xs text-slate-400 flex-shrink-0 tabular-nums">
                      {fmtDate(item.date)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{item.description}</p>
                  <span className="inline-block mt-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {item.type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Shield className="h-3.5 w-3.5 flex-shrink-0" />
        Advisor activity and performance are informational — not personalized investment advice.
        <ArrowUpRight className="h-3 w-3" />
      </p>
    </div>
  );
}
