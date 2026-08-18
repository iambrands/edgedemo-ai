import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Bell, Receipt, Sparkles } from 'lucide-react';
import { AppLink } from '../../components/brand/AppLink';
import { ClientPageShell } from './ClientPageShell';
import { b2cApi, getB2CToken, type B2CDashboardResponse } from '../../services/b2cApi';
import AIChatWidget from '../../components/chat/AIChatWidget';
import { StatementUploadZone } from '../../components/client/StatementUploadZone';

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
  const [uploadSuccess, setUploadSuccess] = useState('');

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

  const stats = [
    { label: 'Total value', value: formatCurrency(dashboard?.total_aum ?? '0') },
    { label: 'Accounts linked', value: String(dashboard?.accounts.length ?? 0) },
    { label: 'Alerts', value: String(dashboard?.alerts.length ?? 0) },
  ];
  const feeSummary = dashboard?.fee_impact_summary;

  return (
    <ClientPageShell
      title="My Firmum"
      subtitle="Your DIY dashboard — holdings, fees, and AI suggestions in one place."
      badge="DIY mode"
      backTo="/"
      backLabel="Home"
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

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900 text-sm mb-1">
            {dashboard?.accounts.length ? 'Upload another statement' : 'Add your first account'}
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            {dashboard?.accounts.length
              ? 'PDF · Schwab, Fidelity, E*Trade, Robinhood, NW Mutual supported'
              : 'Drop your brokerage PDF below to import holdings automatically.'}
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
