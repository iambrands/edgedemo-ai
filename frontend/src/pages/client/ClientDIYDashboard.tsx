import { useEffect, useState } from 'react';
import { BarChart3, Bell, Receipt, Sparkles } from 'lucide-react';
import { AppLink } from '../../components/brand/AppLink';
import { ClientPageShell } from './ClientPageShell';
import { b2cApi, type B2CDashboardResponse } from '../../services/b2cApi';

function formatCurrency(value: string | number): string {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ClientDIYDashboard() {
  const [dashboard, setDashboard] = useState<B2CDashboardResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [statementId, setStatementId] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setError('');
      setIsLoading(true);
      try {
        const response = await b2cApi.getDashboard();
        if (isMounted) setDashboard(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load dashboard';
        if (isMounted) setError(message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const stats = [
    { label: 'Total value', value: formatCurrency(dashboard?.total_aum ?? '0') },
    { label: 'Accounts linked', value: String(dashboard?.accounts.length ?? 0) },
    { label: 'Alerts', value: String(dashboard?.alerts.length ?? 0) },
  ];
  const feeSummary = dashboard?.fee_impact_summary;

  const handleConfirmStatement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmMessage('');
    setError('');
    if (!statementId.trim()) {
      setError('Enter a statement ID to confirm.');
      return;
    }
    setIsConfirming(true);
    try {
      const response = await b2cApi.confirmStatement(statementId.trim());
      setConfirmMessage(
        `Confirmed ${response.statementId}: ${response.positionsCreated} positions persisted.`,
      );
      setStatementId('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to confirm statement';
      setError(message);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <ClientPageShell
      title="My Firmum"
      subtitle="Your DIY dashboard — holdings, fees, and AI suggestions in one place."
      badge="DIY mode"
      backTo="/client/onboarding"
      backLabel="Onboarding"
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{isLoading ? '...' : s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

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
                ? `${formatCurrency(feeSummary.annual_cost)} estimated annual cost`
                : 'Fee analysis appears after accounts are linked.'}
            </p>
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

        {dashboard?.accounts.length === 0 && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <h2 className="font-semibold text-blue-950">Next step: upload a statement</h2>
            <p className="mt-1 text-sm text-blue-900">
              Statement upload and account persistence are a G2 task. This dashboard is ready to populate
              once accounts exist.
            </p>
          </div>
        )}

        <form onSubmit={handleConfirmStatement} className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900 text-sm">Confirm parsed statement</h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter a parsed statement ID (for example, <code>stmt-001</code>) to trigger persistence.
          </p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={statementId}
              onChange={(event) => setStatementId(event.target.value)}
              placeholder="Statement ID"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="submit"
              disabled={isConfirming}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isConfirming ? 'Confirming...' : 'Confirm'}
            </button>
          </div>
          {confirmMessage && <p className="mt-2 text-xs text-emerald-700">{confirmMessage}</p>}
        </form>

        <div className="flex flex-col sm:flex-row gap-3">
          <AppLink
            to="/client/connect-advisor"
            className="flex-1 text-center py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Connect an advisor
          </AppLink>
          <AppLink
            to="/client/accountability"
            className="flex-1 text-center py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
          >
            Advisor transparency
          </AppLink>
        </div>
      </div>
    </ClientPageShell>
  );
}
