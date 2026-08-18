import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Bell, CheckCircle, LineChart, Link2, Receipt, Shield, Sparkles, TrendingUp, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AppLink } from '../../components/brand/AppLink';
import { ClientPageShell } from './ClientPageShell';
import { b2cApi, getB2CToken, type B2CDashboardResponse, type PlaidExchangeResponse } from '../../services/b2cApi';
import AIChatWidget from '../../components/chat/AIChatWidget';
import { StatementUploadZone } from '../../components/client/StatementUploadZone';
import { PlaidLinkButton } from '../../components/client/PlaidLinkButton';

function formatCurrency(value: string | number): string {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function NetWorthSparkline({ points }: { points: Array<{ date: string; value: string }> }) {
  if (points.length < 2) return null;
  const values = points.map((p) => Number(p.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return (
    <div className="mt-3 flex items-end gap-0.5 h-12">
      {values.map((v, i) => (
        <div
          key={points[i].date}
          className="flex-1 bg-blue-500/70 rounded-t-sm min-w-[4px]"
          style={{ height: `${Math.max(8, ((v - min) / range) * 100)}%` }}
          title={`${points[i].date}: ${formatCurrency(v)}`}
        />
      ))}
    </div>
  );
}

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
      const response = await b2cApi.getDashboard();
      setDashboard(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load dashboard';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Clear ?subscription= from URL after showing banner
  useEffect(() => {
    if (subscriptionParam) {
      const t = setTimeout(() => {
        searchParams.delete('subscription');
        setSearchParams(searchParams, { replace: true });
      }, 6000);
      return () => clearTimeout(t);
    }
  }, [subscriptionParam, searchParams, setSearchParams]);

  const handlePlaidLinked = (result: PlaidExchangeResponse) => {
    const count = result.accounts.length;
    setPlaidSuccess(
      `${result.institution_name} linked — ${count} account${count !== 1 ? 's' : ''} connected.`,
    );
    loadDashboard();
  };

  const feeSummary = dashboard?.fee_impact_summary;
  const riskProfile = dashboard?.risk_profile;
  const netWorthHistory = dashboard?.net_worth_history ?? [];
  const feeBenchmarks = dashboard?.fee_benchmarks ?? [];

  const stats = [
    { label: 'Total value', value: formatCurrency(dashboard?.total_aum ?? '0') },
    {
      label: 'Risk score',
      value: riskProfile ? String(riskProfile.risk_number) : '—',
      sub: riskProfile?.label,
    },
    { label: 'Accounts linked', value: String(dashboard?.accounts.length ?? 0) },
    { label: 'Alerts', value: String(dashboard?.alerts.length ?? 0) },
  ];

  return (
    <ClientPageShell
      title="My Firmum"
      subtitle="Your DIY dashboard — holdings, fees, and AI suggestions in one place."
      badge="DIY mode"
      backTo="/"
      backLabel="Home"
    >
      <div className="space-y-6">
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
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{isLoading ? '...' : s.value}</p>
              {'sub' in s && s.sub && (
                <p className="text-[10px] text-slate-400 truncate">{s.sub}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {netWorthHistory.length >= 2 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-1">
              <LineChart className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-slate-900 text-sm">Net worth trend</h2>
            </div>
            <p className="text-xs text-slate-500">From uploaded statement history</p>
            <NetWorthSparkline points={netWorthHistory} />
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <BarChart3 className="h-5 w-5 text-blue-600 mb-2" />
            <h2 className="font-semibold text-slate-900 text-sm">Allocation</h2>
            {dashboard?.allocation.length ? (
              <div className="mt-3 space-y-2">
                {dashboard.allocation.map((item) => (
                  <div key={item.asset_class} className="flex justify-between text-xs text-slate-600">
                    <span>{item.asset_class}</span>
                    <span>{Number(item.pct).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Upload a statement to see your asset mix.</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <Receipt className="h-5 w-5 text-blue-600 mb-2" />
            <h2 className="font-semibold text-slate-900 text-sm">Fee impact</h2>
            <p className="text-xs text-slate-500 mt-1">
              {feeSummary
                ? `${formatCurrency(feeSummary.annual_cost)} estimated annual cost${
                    feeSummary.effective_fee_rate_pct
                      ? ` (${Number(feeSummary.effective_fee_rate_pct).toFixed(2)}% effective)`
                      : ''
                  }`
                : 'Fee analysis appears after accounts are linked.'}
            </p>
            {feeBenchmarks.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {feeBenchmarks.map((b) => (
                  <div key={b.label} className="flex justify-between text-xs text-slate-600">
                    <span>{b.label}</span>
                    <span>
                      {Number(b.rate_pct).toFixed(2)}% · {formatCurrency(b.annual_cost_at_aum)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <Bell className="h-5 w-5 text-blue-600 mb-2" />
            <h2 className="font-semibold text-slate-900 text-sm">Alerts</h2>
            <div className="mt-3 space-y-2">
              {(dashboard?.alerts.length ? dashboard.alerts : []).map((alert) => (
                <p key={`${alert.type}-${alert.action}`} className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                  {alert.message}
                </p>
              ))}
              {!dashboard?.alerts.length && (
                <p className="text-xs text-slate-500">No active alerts yet.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <Sparkles className="h-5 w-5 text-blue-600 mb-2" />
            <h2 className="font-semibold text-slate-900 text-sm">AI suggestions</h2>
            <p className="text-xs text-slate-500 mt-1">
              {dashboard
                ? `${dashboard.ai_chat_remaining} monthly chats remaining on ${dashboard.subscription_tier}.`
                : 'Insights to explore — not investment advice.'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1">
            <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Retirement planner</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Monte Carlo projections — basic on Free, full simulation on Pro and above.
              </p>
            </div>
          </div>
          <AppLink
            to="/client/planning"
            className="text-center py-2 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
          >
            Open planner
          </AppLink>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="h-4 w-4 text-emerald-600" />
              <h2 className="font-semibold text-slate-900 text-sm">Connect accounts</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Link your brokerage directly via Plaid — balances sync automatically.
            </p>
            <PlaidLinkButton onLinked={handlePlaidLinked} />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h2 className="font-semibold text-slate-900 text-sm mb-1">
              {dashboard?.accounts.length ? 'Upload another statement' : 'Or upload a PDF statement'}
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

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Shield className="h-3.5 w-3.5" />
          Fee benchmarks compare your portfolio to industry averages — not personalized advice.
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <AppLink
            to="/client/connect-advisor"
            className="flex-1 text-center py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Connect an advisor
          </AppLink>
          <AppLink
            to="/client/statements"
            className="flex-1 text-center py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            Statement history
          </AppLink>
          <AppLink
            to="/client/planning"
            className="flex-1 text-center py-2.5 rounded-lg border border-emerald-200 text-emerald-700 text-sm font-medium hover:bg-emerald-50"
          >
            Retirement planner
          </AppLink>
          <AppLink
            to="/client/upgrade"
            className="flex-1 text-center py-2.5 rounded-lg border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-50"
          >
            Upgrade plan
          </AppLink>
          <AppLink
            to="/client/accountability"
            className="flex-1 text-center py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            Advisor transparency
          </AppLink>
        </div>
      </div>

      <AIChatWidget
        variant="client"
        apiEndpoint="/api/v1/b2c/chat"
        authToken={getB2CToken()}
        quotaRemaining={dashboard?.ai_chat_remaining ?? null}
      />
    </ClientPageShell>
  );
}
