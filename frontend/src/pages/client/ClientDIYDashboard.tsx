import { useCallback, useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle,
  Landmark,
  Link2,
  Receipt,
  Shield,
  Sparkles,
  TrendingUp,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AppLink } from '../../components/brand/AppLink';
import {
  b2cApi,
  type B2CDashboardResponse,
  type PlaidExchangeResponse,
} from '../../services/b2cApi';
import { StatementUploadZone } from '../../components/client/StatementUploadZone';
import { PlaidLinkButton } from '../../components/client/PlaidLinkButton';
import {
  FeeAnalyzerChart,
  feeBenchmarksToChartProps,
} from '../../components/client/FeeAnalyzerChart';

/* ── helpers ──────────────────────────────────────────────────────────── */

function formatCurrency(value: string | number): string {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short' });
}

/* ── sub-components ───────────────────────────────────────────────────── */

function AccountTypeIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t.includes('checking') || t.includes('saving') || t.includes('depository') || t.includes('cash')) {
    return <Building2 className="h-4 w-4" />;
  }
  if (t.includes('401') || t.includes('ira') || t.includes('pension') || t.includes('retirement')) {
    return <Landmark className="h-4 w-4" />;
  }
  return <TrendingUp className="h-4 w-4" />;
}

function RiskBadge({ number, label }: { number: number; label: string }) {
  let cls = 'bg-emerald-100 text-emerald-800';
  if (number < 40) cls = 'bg-blue-100 text-blue-800';
  else if (number >= 75) cls = 'bg-amber-100 text-amber-800';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      <Shield className="h-3 w-3 flex-shrink-0" />
      {label} · {number}
    </span>
  );
}

/* Custom recharts tooltip */
function NetWorthTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { date: string } }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="text-xs text-slate-500 mb-0.5">{payload[0]?.payload?.date}</p>
      <p className="font-semibold text-slate-900">{formatCurrency(payload[0]?.value ?? 0)}</p>
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────────── */

export default function ClientDIYDashboard() {
  const [dashboard, setDashboard] = useState<B2CDashboardResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [plaidSuccess, setPlaidSuccess] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const subscriptionParam = searchParams.get('subscription');

  const loadDashboard = useCallback(async () => {
    setError('');
    setIsLoading(true);
    try {
      setDashboard(await b2cApi.getDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  // Auto-dismiss subscription banner
  useEffect(() => {
    if (!subscriptionParam) return;
    const t = setTimeout(() => {
      searchParams.delete('subscription');
      setSearchParams(searchParams, { replace: true });
    }, 6000);
    return () => clearTimeout(t);
  }, [subscriptionParam, searchParams, setSearchParams]);

  const handlePlaidLinked = (result: PlaidExchangeResponse) => {
    const n = result.accounts.length;
    setPlaidSuccess(`${result.institution_name} linked — ${n} account${n !== 1 ? 's' : ''} connected.`);
    loadDashboard();
  };

  /* derived data */
  const accounts = dashboard?.accounts ?? [];
  const feeSummary = dashboard?.fee_impact_summary;
  const riskProfile = dashboard?.risk_profile;
  const feeBenchmarks = dashboard?.fee_benchmarks ?? [];
  const feeChartProps =
    dashboard && feeBenchmarks.length > 0
      ? feeBenchmarksToChartProps(feeBenchmarks, dashboard.total_aum)
      : null;

  const chartData = (dashboard?.net_worth_history ?? []).map((p) => ({
    date: p.date,
    month: fmtMonth(p.date),
    value: Number(p.value),
  }));

  const firstVal = chartData[0]?.value ?? 0;
  const lastVal = chartData[chartData.length - 1]?.value ?? 0;
  const change = lastVal - firstVal;
  const changePct = firstVal > 0 ? (change / firstVal) * 100 : 0;
  const isPositive = change >= 0;

  return (
    <div className="space-y-5">

      {/* ── notification banners ─────────────────────────────────────── */}
      {subscriptionParam === 'success' && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          Your plan has been upgraded. Features are now active.
        </div>
      )}
      {subscriptionParam === 'canceled' && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          Checkout canceled — no changes made.
        </div>
      )}
      {plaidSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {plaidSuccess}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── hero: net worth + chart ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* top content */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Net Worth</p>
              {isLoading ? (
                <div className="mt-2 h-12 w-48 rounded-lg bg-slate-100 animate-pulse" />
              ) : (
                <p className="mt-1 text-5xl font-extrabold text-slate-900 tabular-nums tracking-tight leading-none">
                  {formatCurrency(dashboard?.total_aum ?? '0')}
                </p>
              )}
              {!isLoading && chartData.length >= 2 && (
                <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isPositive
                    ? <ArrowUpRight className="h-4 w-4 flex-shrink-0" />
                    : <ArrowDownRight className="h-4 w-4 flex-shrink-0" />}
                  <span>
                    {formatCurrency(Math.abs(change))}&nbsp;
                    <span className="font-normal text-slate-500">
                      ({Math.abs(changePct).toFixed(1)}%) past 12 months
                    </span>
                  </span>
                </div>
              )}
            </div>
            {!isLoading && riskProfile && (
              <div className="flex-shrink-0 mt-1">
                <RiskBadge number={riskProfile.risk_number} label={riskProfile.label} />
              </div>
            )}
          </div>
        </div>

        {/* area chart */}
        {isLoading && (
          <div className="h-40 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          </div>
        )}
        {!isLoading && chartData.length >= 2 && (
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  dy={2}
                  padding={{ left: 12, right: 12 }}
                />
                <Tooltip content={<NetWorthTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  fill="url(#nwGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {!isLoading && chartData.length < 2 && (
          <div className="h-24 flex flex-col items-center justify-center gap-2 text-slate-400 pb-4">
            <TrendingUp className="h-6 w-6 opacity-40" />
            <p className="text-xs">Link an account to see your 12-month trend</p>
          </div>
        )}
      </div>

      {/* ── account summary cards ────────────────────────────────────── */}
      {!isLoading && accounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
                <AccountTypeIcon type={acc.account_type} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">{acc.custodian}</p>
                <p className="text-xs text-slate-500 truncate">{acc.account_type}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(acc.total_value)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── quick actions ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <PlaidLinkButton onLinked={handlePlaidLinked} />
        <AppLink
          to="/client/connect-advisor"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Find advisor
        </AppLink>
        <AppLink
          to="/client/upgrade"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Upgrade plan
        </AppLink>
      </div>

      {/* ── allocation + fee analyzer ────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Allocation</h2>
          </div>
          {dashboard?.allocation.length ? (
            <div className="space-y-2.5">
              {dashboard.allocation.map((item) => {
                const pct = Number(item.pct);
                return (
                  <div key={item.asset_class}>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>{item.asset_class}</span>
                      <span className="font-medium">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 mt-1">Upload a statement to see your asset mix.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Receipt className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Fee analyzer</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {feeSummary
              ? `${formatCurrency(feeSummary.annual_cost)}/yr estimated${feeSummary.effective_fee_rate_pct
                  ? ` (${Number(feeSummary.effective_fee_rate_pct).toFixed(2)}% effective)`
                  : ''}`
              : 'Fee analysis appears after accounts are linked.'}
          </p>
          {feeChartProps ? (
            <FeeAnalyzerChart {...feeChartProps} />
          ) : feeBenchmarks.length > 0 ? (
            <div className="space-y-1.5">
              {feeBenchmarks.map((b) => (
                <div key={b.label} className="flex justify-between text-xs text-slate-600">
                  <span>{b.label}</span>
                  <span>{Number(b.rate_pct).toFixed(2)}% · {formatCurrency(b.annual_cost_at_aum)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── alerts + AI suggestions ──────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Alerts</h2>
          </div>
          <div className="space-y-2">
            {dashboard?.alerts.length ? (
              dashboard.alerts.map((alert) => (
                <p
                  key={`${alert.type}-${alert.action}`}
                  className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600"
                >
                  {alert.message}
                </p>
              ))
            ) : (
              <p className="text-xs text-slate-500">No active alerts yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900 text-sm">AI insights</h2>
          </div>
          <p className="text-xs text-slate-500">
            {dashboard
              ? `${dashboard.ai_chat_remaining} AI chats remaining on ${dashboard.subscription_tier} plan.`
              : 'Personalized insights — not investment advice.'}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Ask the AI assistant (bottom-right) anything about your portfolio.
          </p>
        </div>
      </div>

      {/* ── retirement planner CTA ───────────────────────────────────── */}
      <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">Retirement planner</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Monte Carlo projections across 1,000 scenarios — basic on Free, full simulation on Pro.
            </p>
          </div>
        </div>
        <AppLink
          to="/client/planning"
          className="sm:flex-shrink-0 text-center py-2 px-5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Open planner
        </AppLink>
      </div>

      {/* ── connect accounts / upload ────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="h-4 w-4 text-emerald-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Connect accounts</h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Link your brokerage via Plaid — balances and history sync automatically.
          </p>
          <PlaidLinkButton onLinked={handlePlaidLinked} />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h2 className="font-semibold text-slate-900 text-sm mb-1">
            {accounts.length ? 'Upload another statement' : 'Or upload a PDF statement'}
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Schwab, Fidelity, E*Trade, Robinhood, NW Mutual supported
          </p>
          {uploadSuccess && (
            <p className="mb-3 text-xs text-emerald-700">{uploadSuccess}</p>
          )}
          <StatementUploadZone
            onConfirmed={(_id, count) => {
              setUploadSuccess(`${count} position${count !== 1 ? 's' : ''} imported.`);
              loadDashboard();
            }}
          />
        </div>
      </div>

      {/* ── compliance footnote ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Shield className="h-3.5 w-3.5 flex-shrink-0" />
        Fee benchmarks compare your portfolio to industry averages — not personalized investment advice.
      </div>

    </div>
  );
}
