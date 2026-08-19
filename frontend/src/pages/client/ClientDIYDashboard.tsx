import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Bell,
  Building2,
  CheckCircle,
  CreditCard,
  Landmark,
  Link2,
  Receipt,
  Shield,
  Sparkles,
  TrendingUp,
  UserPlus,
  Wallet,
  XCircle,
} from 'lucide-react';
import NetWorthChart from '../../components/client/NetWorthChart';
import type { NetWorthDataPoint } from '../../components/client/NetWorthChart';
import { useSearchParams } from 'react-router-dom';
import { AppLink } from '../../components/brand/AppLink';
import {
  b2cApi,
  type B2CDashboardAccount,
  type B2CDashboardResponse,
  type B2CTaxSummary,
  type B2CGoal,
  type PlaidExchangeResponse,
} from '../../services/b2cApi';
import { TaxSummaryCard } from '../../components/client/TaxSummaryCard';
import { StatementUploadZone } from '../../components/client/StatementUploadZone';
import { PlaidLinkButton } from '../../components/client/PlaidLinkButton';
import {
  FeeAnalyzerChart,
  feeBenchmarksToChartProps,
} from '../../components/client/FeeAnalyzerChart';
import { InsightCards } from '../../components/client/InsightCards';
import { AllocationDonut } from '../../components/client/AllocationDonut';
import { KPIStrip } from '../../components/client/KPIStrip';
import { AINarrativeBanner } from '../../components/client/AINarrativeBanner';
import { GoalRings } from '../../components/client/GoalRings';
import { HoldingsTable } from '../../components/client/HoldingsTable';
import { AnimatedNumber } from '../../components/client/AnimatedNumber';

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

type AccountGroupKey = 'depository' | 'investment' | 'credit' | 'loan';

const ACCOUNT_GROUP_LABELS: Record<AccountGroupKey, string> = {
  depository: 'Cash & banking',
  investment: 'Investments',
  credit: 'Credit cards',
  loan: 'Loans',
};

function inferAccountCategory(acc: B2CDashboardAccount): AccountGroupKey {
  if (acc.account_category) return acc.account_category;
  if (acc.is_liability) {
    const t = acc.account_type.toLowerCase();
    if (t.includes('credit') || t.includes('card')) return 'credit';
    return 'loan';
  }
  const t = acc.account_type.toLowerCase();
  if (t.includes('checking') || t.includes('saving') || t.includes('cash')) return 'depository';
  if (t.includes('credit') || t.includes('card')) return 'credit';
  if (t.includes('mortgage') || t.includes('loan')) return 'loan';
  return 'investment';
}

function isLiabilityAccount(acc: B2CDashboardAccount): boolean {
  if (acc.is_liability != null) return acc.is_liability;
  const cat = inferAccountCategory(acc);
  return cat === 'credit' || cat === 'loan';
}

function accountValue(acc: B2CDashboardAccount): number {
  const n = Number(acc.total_value);
  return Number.isFinite(n) ? n : 0;
}

function groupAccounts(accounts: B2CDashboardAccount[]) {
  const groups: Record<AccountGroupKey, B2CDashboardAccount[]> = {
    depository: [],
    investment: [],
    credit: [],
    loan: [],
  };
  for (const acc of accounts) {
    groups[inferAccountCategory(acc)].push(acc);
  }
  return groups;
}

function sumAccounts(accounts: B2CDashboardAccount[]): number {
  return accounts.reduce((sum, acc) => sum + accountValue(acc), 0);
}

/* ── sub-components ───────────────────────────────────────────────────── */

function AccountTypeIcon({ type, category }: { type: string; category?: AccountGroupKey }) {
  const t = type.toLowerCase();
  const cat = category ?? inferAccountCategory({ id: '', custodian: '', account_type: type, total_value: '0' });
  if (cat === 'credit') return <CreditCard className="h-4 w-4" />;
  if (cat === 'loan') return <Landmark className="h-4 w-4" />;
  if (cat === 'depository' || t.includes('checking') || t.includes('saving') || t.includes('cash')) {
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

function AccountRow({ acc }: { acc: B2CDashboardAccount }) {
  const category = inferAccountCategory(acc);
  const liability = isLiabilityAccount(acc);
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          liability ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
        }`}
      >
        <AccountTypeIcon type={acc.account_type} category={category} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 truncate">{acc.custodian}</p>
        <p className="text-xs text-slate-500 truncate">{acc.account_type}</p>
      </div>
      <p className={`text-sm font-bold tabular-nums flex-shrink-0 ${liability ? 'text-rose-700' : 'text-slate-900'}`}>
        {liability ? '−' : ''}{formatCurrency(acc.total_value)}
      </p>
    </div>
  );
}

function AccountGroupSection({
  title,
  icon: Icon,
  groups,
  groupKeys,
  totalLabel,
  totalAmount,
  tone,
}: {
  title: string;
  icon: typeof Wallet;
  groups: Record<AccountGroupKey, B2CDashboardAccount[]>;
  groupKeys: AccountGroupKey[];
  totalLabel: string;
  totalAmount: number;
  tone: 'asset' | 'liability';
}) {
  const visibleGroups = groupKeys.filter((key) => groups[key].length > 0);
  if (visibleGroups.length === 0) return null;

  const borderCls = tone === 'asset' ? 'border-emerald-100' : 'border-rose-100';
  const headerCls = tone === 'asset' ? 'text-emerald-800' : 'text-rose-800';
  const totalCls = tone === 'asset' ? 'text-emerald-700' : 'text-rose-700';

  return (
    <div className={`bg-white rounded-xl border ${borderCls} p-5 space-y-4`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${headerCls}`} />
        <h2 className={`font-semibold text-sm ${headerCls}`}>{title}</h2>
      </div>

      {visibleGroups.map((key) => {
        const items = groups[key];
        const subtotal = sumAccounts(items);
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {ACCOUNT_GROUP_LABELS[key]}
              </p>
              <p className="text-xs font-medium text-slate-600 tabular-nums">
                {tone === 'liability' ? '−' : ''}{formatCurrency(subtotal)}
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((acc) => (
                <AccountRow key={acc.id} acc={acc} />
              ))}
            </div>
          </div>
        );
      })}

      <div className={`flex items-center justify-between pt-3 border-t border-slate-100 text-sm font-semibold ${totalCls}`}>
        <span>{totalLabel}</span>
        <span className="tabular-nums">
          {tone === 'liability' ? '−' : ''}{formatCurrency(totalAmount)}
        </span>
      </div>
    </div>
  );
}

function AccountBreakdown({
  accounts,
  totalAssets,
  totalLiabilities,
}: {
  accounts: B2CDashboardAccount[];
  totalAssets: number;
  totalLiabilities: number;
}) {
  const groups = groupAccounts(accounts);
  const assetAccounts = accounts.filter((acc) => !isLiabilityAccount(acc));
  const liabilityAccounts = accounts.filter((acc) => isLiabilityAccount(acc));
  const computedAssets = sumAccounts(assetAccounts);
  const computedLiabilities = sumAccounts(liabilityAccounts);

  return (
    <div className="space-y-4">
      <AccountGroupSection
        title="Assets"
        icon={Wallet}
        groups={groups}
        groupKeys={['depository', 'investment']}
        totalLabel="Total assets"
        totalAmount={totalAssets || computedAssets}
        tone="asset"
      />
      <AccountGroupSection
        title="Liabilities"
        icon={CreditCard}
        groups={groups}
        groupKeys={['credit', 'loan']}
        totalLabel="Total liabilities"
        totalAmount={totalLiabilities || computedLiabilities}
        tone="liability"
      />
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────────── */

export default function ClientDIYDashboard() {
  const [dashboard, setDashboard] = useState<B2CDashboardResponse | null>(null);
  const [taxSummary, setTaxSummary] = useState<B2CTaxSummary | null>(null);
  const [goals, setGoals] = useState<B2CGoal[]>([]);
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

  useEffect(() => {
    b2cApi.getTaxSummary().then(setTaxSummary).catch(console.error);
    b2cApi.getGoals().then((res) => setGoals(res.goals)).catch(console.error);
  }, []);

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

  const chartData: NetWorthDataPoint[] = (dashboard?.net_worth_history ?? []).map((p) => ({
    date: p.date,
    value: Number(p.value),
  }));

  const assetAccounts = accounts.filter((acc) => !isLiabilityAccount(acc));
  const liabilityAccounts = accounts.filter((acc) => isLiabilityAccount(acc));
  const totalAssets = dashboard?.total_assets
    ? Number(dashboard.total_assets)
    : sumAccounts(assetAccounts);
  const totalLiabilities = dashboard?.total_liabilities
    ? Number(dashboard.total_liabilities)
    : sumAccounts(liabilityAccounts);
  const netWorth = totalAssets - totalLiabilities;

  const nwFirst = chartData[0]?.value ?? 0;
  const nwLast = chartData[chartData.length - 1]?.value ?? 0;
  const netWorthChange = nwLast - nwFirst;
  const netWorthChangePct = nwFirst > 0 ? (netWorthChange / nwFirst) * 100 : 0;

  const investedTotal = accounts
    .filter((a) => inferAccountCategory(a) === 'investment')
    .reduce((s, a) => s + accountValue(a), 0);
  const cashTotal = accounts
    .filter((a) => inferAccountCategory(a) === 'depository')
    .reduce((s, a) => s + accountValue(a), 0);
  const annualFees = feeSummary ? Number(feeSummary.annual_cost) : undefined;

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
                <>
                  <AnimatedNumber
                    value={Number(dashboard?.total_aum ?? netWorth)}
                    duration={900}
                    formatter={(v) =>
                      new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0,
                      }).format(v)
                    }
                    className="mt-1 text-5xl font-extrabold text-slate-900 tabular-nums tracking-tight leading-none block"
                  />
                  {accounts.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500 tabular-nums">
                      {formatCurrency(totalAssets)} assets − {formatCurrency(totalLiabilities)} liabilities
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-slate-400 flex items-center gap-1">
                    <Shield className="h-2.5 w-2.5" />
                    Synced {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · Read-only access
                  </p>
                </>
              )}
            </div>
            {!isLoading && riskProfile && (
              <div className="flex-shrink-0 mt-1">
                <RiskBadge number={riskProfile.risk_number} label={riskProfile.label} />
              </div>
            )}
          </div>
        </div>

        {/* net worth chart with period selector */}
        {isLoading && (
          <div className="h-40 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          </div>
        )}
        {!isLoading && chartData.length >= 2 && (
          <NetWorthChart data={chartData} height={160} />
        )}
        {!isLoading && chartData.length < 2 && (
          <div className="h-24 flex flex-col items-center justify-center gap-2 text-slate-400 pb-4">
            <TrendingUp className="h-6 w-6 opacity-40" />
            <p className="text-xs">Link an account to see your 12-month trend</p>
          </div>
        )}
      </div>

      {/* ── KPI metric strip ─────────────────────────────────────────── */}
      {!isLoading && accounts.length > 0 && (
        <KPIStrip
          totalInvested={investedTotal}
          cashReserves={cashTotal}
          annualFees={annualFees}
          netWorthChange={netWorthChange}
          netWorthChangePct={netWorthChangePct}
        />
      )}

      {/* ── AI narrative summary ──────────────────────────────────────── */}
      {!isLoading && dashboard && (
        <AINarrativeBanner
          dashboard={dashboard}
          taxSummary={taxSummary}
          goals={goals}
          netWorthChange={netWorthChange}
          netWorthChangePct={netWorthChangePct}
        />
      )}

      {/* ── proactive insights ───────────────────────────────────────── */}
      {!isLoading && <InsightCards />}

      {/* ── allocation donut + goal rings ─────────────────────────────── */}
      {!isLoading && (
        <div className="grid sm:grid-cols-2 gap-4">
          {dashboard?.allocation.length ? (
            <AllocationDonut
              allocation={dashboard.allocation}
              totalAum={Number(dashboard.total_aum)}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <h2 className="font-semibold text-slate-900 text-sm">Allocation</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">Upload a statement to see your asset mix.</p>
            </div>
          )}
          <GoalRings />
        </div>
      )}

      {/* ── holdings table ────────────────────────────────────────────── */}
      {!isLoading && <HoldingsTable />}

      {/* ── account breakdown by type ────────────────────────────────── */}
      {!isLoading && accounts.length > 0 && (
        <AccountBreakdown
          accounts={accounts}
          totalAssets={totalAssets}
          totalLiabilities={totalLiabilities}
        />
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

      {/* ── fee analyzer ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Fee analyzer</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          {feeSummary
            ? `${formatCurrency(feeSummary.annual_cost)}/yr estimated${feeSummary.effective_fee_rate_pct
                ? ` (${Number(feeSummary.effective_fee_rate_pct).toFixed(2)}% effective)`
                : ''} — you could save ${formatCurrency(feeSummary.potential_savings || '0')}/yr vs a traditional 1% advisor.`
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

      {/* ── tax summary ──────────────────────────────────────────────── */}
      {taxSummary && <TaxSummaryCard data={taxSummary} />}

      {/* ── alerts ─────────────────────────────────────────────────────── */}
      {dashboard?.alerts && dashboard.alerts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Alerts</h2>
          </div>
          <div className="space-y-2">
            {dashboard.alerts.map((alert) => (
              <p
                key={`${alert.type}-${alert.action}`}
                className="rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600"
              >
                {alert.message}
              </p>
            ))}
          </div>
        </div>
      )}

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
      <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
        <Shield className="h-3.5 w-3.5 flex-shrink-0" />
        <span>Fee benchmarks compare your portfolio to industry averages — not personalized investment advice.</span>
        <span className="text-slate-300">·</span>
        <span className="flex items-center gap-1">
          <Shield className="h-3 w-3" />Bank-level 256-bit encryption
        </span>
        <span className="text-slate-300">·</span>
        <span>Read-only Plaid connection</span>
      </div>

    </div>
  );
}
