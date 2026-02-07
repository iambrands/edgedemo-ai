import { useState, useEffect } from 'react';
import { PieChart, DollarSign, Users, Bell } from 'lucide-react';
import {
  listModels,
  listSignals,
  browseMarketplace,
  listAssignments,
  validateHoldings,
  checkDrift,
  approveSignal,
  rejectSignal,
  subscribe,
} from '../../services/modelPortfolioApi';
import type {
  ModelPortfolio,
  AccountAssignment,
  RebalanceSignal,
  HoldingsValidation,
  RebalanceSignalStatus,
} from '../../services/modelPortfolioApi';

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_OPTIONS = [
  { value: 'aggressive_growth', label: 'Aggressive Growth' },
  { value: 'growth', label: 'Growth' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'conservative', label: 'Conservative' },
  { value: 'income', label: 'Income' },
];

const ASSET_CLASS_COLORS: Record<string, string> = {
  us_equity: 'bg-blue-500',
  intl_equity: 'bg-indigo-500',
  emerging_markets: 'bg-purple-500',
  us_fixed_income: 'bg-green-500',
  intl_fixed_income: 'bg-teal-500',
  real_estate: 'bg-orange-500',
  commodities: 'bg-yellow-500',
  alternatives: 'bg-pink-500',
  cash: 'bg-gray-400',
};

const ASSET_CLASS_LABELS: Record<string, string> = {
  us_equity: 'US Equity',
  intl_equity: 'Intl Equity',
  emerging_markets: 'EM',
  us_fixed_income: 'US Fixed Inc.',
  intl_fixed_income: 'Intl Fixed Inc.',
  real_estate: 'Real Estate',
  commodities: 'Commodities',
  alternatives: 'Alternatives',
  cash: 'Cash',
};

// ============================================================================
// FORMAT HELPERS
// ============================================================================

const fmtCurrency = (value?: number) =>
  value != null
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value)
    : '-';

const fmtPercent = (value?: number) =>
  value != null ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%` : '-';

// ============================================================================
// COMPONENT
// ============================================================================

type Tab = 'models' | 'marketplace' | 'rebalance' | 'detail';

export default function ModelPortfolios() {
  // ── state ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('models');
  const [models, setModels] = useState<ModelPortfolio[]>([]);
  const [marketplaceModels, setMarketplaceModels] = useState<ModelPortfolio[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelPortfolio | null>(null);
  const [assignments, setAssignments] = useState<AccountAssignment[]>([]);
  const [signals, setSignals] = useState<RebalanceSignal[]>([]);
  const [validation, setValidation] = useState<HoldingsValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mpSearch, setMpSearch] = useState('');
  const [mpCategory, setMpCategory] = useState('');

  // ── data loading ─────────────────────────────────────────

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'marketplace') {
      loadMarketplace();
    }
  }, [activeTab, mpSearch, mpCategory]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [modelsRes, signalsRes] = await Promise.all([
        listModels(),
        listSignals(),
      ]);
      setModels(modelsRes.models || []);
      setSignals(signalsRes.signals || []);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    }
    setLoading(false);
  };

  const loadMarketplace = async () => {
    try {
      const params: Record<string, any> = {};
      if (mpSearch) params.search = mpSearch;
      if (mpCategory) params.category = mpCategory;
      const res = await browseMarketplace(
        Object.keys(params).length ? params : undefined,
      );
      setMarketplaceModels(res.models || []);
    } catch (err) {
      console.error('Failed to load marketplace:', err);
    }
  };

  const loadModelDetail = async (model: ModelPortfolio) => {
    setSelectedModel(model);
    setActiveTab('detail');
    try {
      const [aRes, vRes] = await Promise.all([
        listAssignments(model.id),
        validateHoldings(model.id),
      ]);
      setAssignments(aRes.assignments || []);
      setValidation(vRes);
    } catch (err) {
      console.error('Failed to load model details:', err);
    }
  };

  // ── actions ──────────────────────────────────────────────

  const handleCheckDrift = async () => {
    try {
      const result = await checkDrift();
      if (result.signals?.length) {
        setSignals((prev) => [...result.signals, ...prev]);
      }
      window.alert(`Generated ${result.signals_generated} rebalance signal(s)`);
    } catch (err) {
      console.error('Failed to check drift:', err);
    }
  };

  const handleApproveSignal = async (signalId: string) => {
    try {
      await approveSignal(signalId);
      setSignals((prev) =>
        prev.map((s) =>
          s.id === signalId ? { ...s, status: 'approved' as RebalanceSignalStatus } : s,
        ),
      );
    } catch (err) {
      console.error('Failed to approve signal:', err);
    }
  };

  const handleRejectSignal = async (signalId: string) => {
    const reason = window.prompt('Rejection reason:');
    if (!reason) return;
    try {
      await rejectSignal(signalId, reason);
      setSignals((prev) =>
        prev.map((s) =>
          s.id === signalId ? { ...s, status: 'rejected' as RebalanceSignalStatus } : s,
        ),
      );
    } catch (err) {
      console.error('Failed to reject signal:', err);
    }
  };

  const handleSubscribe = async (modelId: string) => {
    try {
      await subscribe(modelId);
      window.alert('Subscribed successfully!');
      loadData();
    } catch (err: any) {
      window.alert(err.message || 'Failed to subscribe');
    }
  };

  // ── status badge helper ──────────────────────────────────

  const statusBadge = (status: string, map: Record<string, string>) => {
    const cls = map[status] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded ${cls}`}>
        {status}
      </span>
    );
  };

  const modelStatusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
    paused: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-red-100 text-red-800',
  };

  const signalStatusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    executing: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800',
    failed: 'bg-red-100 text-red-800',
  };

  // ========================================================================
  // TAB: Models
  // ========================================================================

  const renderModels = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">My Model Portfolios</h2>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Models',
            value: models.length,
            sub: `${models.filter((m) => m.status === 'active').length} active`,
            icon: PieChart,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
          },
          {
            label: 'Total AUM',
            value: fmtCurrency(models.reduce((s, m) => s + (m.total_aum || 0), 0)),
            sub: 'across all models',
            icon: DollarSign,
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
          },
          {
            label: 'Subscribers',
            value: models.reduce((s, m) => s + (m.total_subscribers || 0), 0),
            sub: 'total subscribers',
            icon: Users,
            iconBg: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
          },
          {
            label: 'Pending Signals',
            value: signals.filter((s) => s.status === 'pending').length,
            sub: 'require review',
            icon: Bell,
            iconBg: 'bg-purple-50',
            iconColor: 'text-purple-600',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
              </div>
              <div className={`p-3 ${stat.iconBg} rounded-xl`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => (
          <div
            key={model.id}
            onClick={() => loadModelDetail(model)}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 truncate">{model.name}</h3>
              {statusBadge(model.status, modelStatusColors)}
            </div>
            {model.ticker && (
              <p className="text-sm text-gray-500 mt-0.5">{model.ticker}</p>
            )}

            {/* Allocation bar */}
            {(model.holdings ?? []).length > 0 && (
              <div className="mt-3 h-3 rounded-full overflow-hidden flex bg-gray-200">
                {(model.holdings ?? []).map((h) => (
                  <div
                    key={h.id}
                    className={ASSET_CLASS_COLORS[h.asset_class] || 'bg-gray-400'}
                    style={{ width: `${h.target_weight_pct ?? 0}%` }}
                    title={`${h.symbol}: ${(h.target_weight_pct ?? 0).toFixed(1)}%`}
                  />
                ))}
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-500">YTD Return</p>
                <p
                  className={`font-medium ${
                    (model.ytd_return || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {fmtPercent(model.ytd_return)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Risk Level</p>
                <p className="font-medium text-gray-900">{model.risk_level ?? '—'}/10</p>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>{(model.holdings ?? []).length} holdings</span>
              <span>
                {model.total_subscribers}{' '}
                {model.total_subscribers === 1 ? 'subscriber' : 'subscribers'}
              </span>
            </div>
          </div>
        ))}

        {models.length === 0 && (
          <p className="col-span-3 text-center text-gray-500 py-12">
            No models yet. Create your first model portfolio to get started.
          </p>
        )}
      </div>
    </div>
  );

  // ========================================================================
  // TAB: Marketplace
  // ========================================================================

  const renderMarketplace = () => (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Model Marketplace</h2>
        <div className="flex gap-2">
          <select
            value={mpCategory}
            onChange={(e) => setMpCategory(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search models..."
            value={mpSearch}
            onChange={(e) => setMpSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-56 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {marketplaceModels.map((model) => (
          <div
            key={model.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 truncate">{model.name}</h3>
              <span className="text-xs text-gray-500">
                {model.total_subscribers}{' '}
                {model.total_subscribers === 1 ? 'sub' : 'subs'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {model.description || 'No description available'}
            </p>

            {/* Allocation bar */}
            {(model.holdings ?? []).length > 0 && (
              <div className="mt-3 h-3 rounded-full overflow-hidden flex bg-gray-200">
                {(model.holdings ?? []).map((h) => (
                  <div
                    key={h.id}
                    className={ASSET_CLASS_COLORS[h.asset_class] || 'bg-gray-400'}
                    style={{ width: `${h.target_weight_pct ?? 0}%` }}
                    title={`${h.symbol}: ${(h.target_weight_pct ?? 0).toFixed(1)}%`}
                  />
                ))}
              </div>
            )}

            {/* Holdings legend */}
            {(model.holdings ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {(model.holdings ?? []).slice(0, 4).map((h) => (
                  <span key={h.id} className="flex items-center text-xs text-gray-500">
                    <span
                      className={`inline-block w-2 h-2 rounded-full mr-1 ${
                        ASSET_CLASS_COLORS[h.asset_class] || 'bg-gray-400'
                      }`}
                    />
                    {h.symbol} {(h.target_weight_pct ?? 0).toFixed(0)}%
                  </span>
                ))}
                {(model.holdings ?? []).length > 4 && (
                  <span className="text-xs text-gray-500">
                    +{(model.holdings ?? []).length - 4} more
                  </span>
                )}
              </div>
            )}

            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-gray-500">YTD</p>
                <p
                  className={`font-medium ${
                    (model.ytd_return || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {fmtPercent(model.ytd_return)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">1 Year</p>
                <p className="font-medium text-gray-900">
                  {fmtPercent(model.one_year_return)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Risk</p>
                <p className="font-medium text-gray-900">{model.risk_level}/10</p>
              </div>
            </div>

            {/* Fee info */}
            {(model.subscription_fee_monthly || model.subscription_fee_annual) && (
              <p className="mt-2 text-xs text-gray-500">
                {model.subscription_fee_monthly
                  ? `$${model.subscription_fee_monthly}/mo`
                  : ''}
                {model.subscription_fee_monthly && model.subscription_fee_annual
                  ? ' | '
                  : ''}
                {model.subscription_fee_annual
                  ? `$${model.subscription_fee_annual}/yr`
                  : ''}
              </p>
            )}

            <button
              onClick={() => handleSubscribe(model.id)}
              className="mt-3 w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Subscribe
            </button>
          </div>
        ))}

        {marketplaceModels.length === 0 && (
          <p className="col-span-3 text-center text-gray-500 py-12">
            No models available in the marketplace
          </p>
        )}
      </div>
    </div>
  );

  // ========================================================================
  // TAB: Rebalance
  // ========================================================================

  const renderRebalance = () => {
    const pending = signals.filter((s) => s.status === 'pending');
    const other = signals.filter((s) => s.status !== 'pending');

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Rebalancing Signals
            {pending.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                {pending.length} pending
              </span>
            )}
          </h2>
          <button
            onClick={handleCheckDrift}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Check All for Drift
          </button>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Pending', value: pending.length, color: 'text-yellow-600' },
            {
              label: 'Approved',
              value: signals.filter((s) => s.status === 'approved').length,
              color: 'text-blue-600',
            },
            {
              label: 'Completed',
              value: signals.filter((s) => s.status === 'completed').length,
              color: 'text-green-600',
            },
            {
              label: 'Rejected',
              value: signals.filter((s) => s.status === 'rejected').length,
              color: 'text-red-600',
            },
          ].map((st) => (
            <div
              key={st.label}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 text-center"
            >
              <p className="text-sm text-gray-500">{st.label}</p>
              <p className={`text-xl font-bold ${st.color}`}>{st.value}</p>
            </div>
          ))}
        </div>

        {/* Signal cards */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="divide-y divide-gray-100">
            {[...pending, ...other].map((signal) => (
              <div key={signal.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {statusBadge(signal.status, signalStatusColors)}
                      <span className="font-medium text-gray-900">
                        Drift: {(signal.total_drift_pct ?? 0).toFixed(2)}%
                      </span>
                      <span className="text-xs text-gray-500">
                        {signal.trigger_type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Account Value: {fmtCurrency(signal.account_value)} &middot;{' '}
                      {signal.estimated_trades_count} trades required
                    </p>
                    {signal.created_at && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Created: {new Date(signal.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {signal.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleRejectSignal(signal.id)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveSignal(signal.id)}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </div>

                {/* Trades preview */}
                {signal.trades_required && signal.trades_required.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-red-600">
                        Sells: {fmtCurrency(signal.estimated_sell_value)}
                      </p>
                      <div className="mt-1 space-y-1">
                        {signal.trades_required
                          .filter((t) => t.action === 'sell')
                          .map((t, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-gray-600"
                            >
                              <span>{t.symbol || '-'}</span>
                              <span>{fmtCurrency(t.value)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-green-600">
                        Buys: {fmtCurrency(signal.estimated_buy_value)}
                      </p>
                      <div className="mt-1 space-y-1">
                        {signal.trades_required
                          .filter((t) => t.action === 'buy')
                          .map((t, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-gray-600"
                            >
                              <span>{t.symbol || '-'}</span>
                              <span>{fmtCurrency(t.value)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {signal.rejection_reason && (
                  <p className="mt-2 text-sm text-red-600">
                    Reason: {signal.rejection_reason}
                  </p>
                )}
              </div>
            ))}

            {signals.length === 0 && (
              <p className="p-8 text-center text-gray-500">
                No rebalance signals. Click &quot;Check All for Drift&quot; to scan
                portfolios.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ========================================================================
  // TAB: Detail
  // ========================================================================

  const renderDetail = () => {
    if (!selectedModel) return null;

    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setSelectedModel(null);
            setActiveTab('models');
          }}
          className="text-blue-600 hover:underline text-sm"
        >
          &larr; Back to Models
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedModel.name}
              </h2>
              {selectedModel.ticker && (
                <p className="text-gray-500">{selectedModel.ticker}</p>
              )}
              <p className="mt-2 text-gray-600">
                {selectedModel.description || 'No description'}
              </p>
              {selectedModel.tags && selectedModel.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedModel.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {statusBadge(selectedModel.status, modelStatusColors)}
              <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                {selectedModel.visibility}
              </span>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              {
                label: 'YTD Return',
                value: fmtPercent(selectedModel.ytd_return),
                color:
                  (selectedModel.ytd_return || 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600',
              },
              {
                label: 'Risk Level',
                value: `${selectedModel.risk_level}/10`,
                color: 'text-gray-900',
              },
              {
                label: 'Drift Threshold',
                value: `${selectedModel.drift_threshold_pct ?? 5}%`,
                color: 'text-gray-900',
              },
              {
                label: 'Total AUM',
                value: fmtCurrency(selectedModel.total_aum),
                color: 'text-gray-900',
              },
            ].map((m) => (
              <div key={m.label} className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">{m.label}</p>
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Extra performance metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {[
              { label: '1 Year', value: fmtPercent(selectedModel.one_year_return) },
              { label: '3 Year', value: fmtPercent(selectedModel.three_year_return) },
              {
                label: 'Rebalance Freq.',
                value: selectedModel.rebalance_frequency,
              },
              {
                label: 'Subscribers',
                value: String(selectedModel.total_subscribers),
              },
            ].map((m) => (
              <div key={m.label} className="text-center p-2 text-sm">
                <p className="text-gray-500">{m.label}</p>
                <p className="font-medium text-gray-900">{m.value || '-'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Holdings Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">
              Holdings ({(selectedModel.holdings ?? []).length})
            </h3>
            {validation && (
              <span
                className={`text-sm font-medium ${
                  validation.is_valid ? 'text-green-600' : 'text-red-600'
                }`}
              >
                Total: {(validation.total_weight ?? 0).toFixed(2)}%{' '}
                {validation.is_valid
                  ? '[valid]'
                  : `(${(validation.difference ?? 0) > 0 ? '+' : ''}${(validation.difference ?? 0).toFixed(2)}%)`}
              </span>
            )}
          </div>

          {/* Allocation bar */}
          {(selectedModel.holdings ?? []).length > 0 && (
            <div className="mb-4">
              <div className="h-4 rounded-full overflow-hidden flex bg-gray-200">
                {(selectedModel.holdings ?? []).map((h) => (
                  <div
                    key={h.id}
                    className={ASSET_CLASS_COLORS[h.asset_class] || 'bg-gray-400'}
                    style={{ width: `${h.target_weight_pct ?? 0}%` }}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {(selectedModel.holdings ?? []).map((h) => (
                  <span
                    key={h.id}
                    className="flex items-center text-xs text-gray-600"
                  >
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full mr-1.5 ${
                        ASSET_CLASS_COLORS[h.asset_class] || 'bg-gray-400'
                      }`}
                    />
                    {h.symbol} ({(h.target_weight_pct ?? 0).toFixed(1)}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="pb-2 font-medium">Symbol</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Asset Class</th>
                  <th className="pb-2 font-medium text-right">Target %</th>
                  <th className="pb-2 font-medium text-right">Expense Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(selectedModel.holdings ?? []).map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-900">{h.symbol}</td>
                    <td className="py-2.5 text-gray-600">{h.security_name}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 text-xs rounded text-white ${
                          ASSET_CLASS_COLORS[h.asset_class] || 'bg-gray-400'
                        }`}
                      >
                        {ASSET_CLASS_LABELS[h.asset_class] || (h.asset_class ?? '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-gray-900">
                      {(h.target_weight_pct ?? 0).toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-right text-gray-500">
                      {h.expense_ratio != null ? `${h.expense_ratio}%` : '-'}
                    </td>
                  </tr>
                ))}
                {(selectedModel.holdings ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      No holdings in this model
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Account Assignments */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            Account Assignments ({assignments.length})
          </h3>
          <div className="space-y-2">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    Account: {a.account_id.slice(0, 8)}...
                  </p>
                  <p className="text-sm text-gray-500">
                    Value: {fmtCurrency(a.account_value)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-medium ${
                      (a.current_drift_pct || 0) > (selectedModel.drift_threshold_pct ?? 5)
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    Drift: {a.current_drift_pct?.toFixed(2) || '0.00'}%
                  </p>
                  <p className="text-sm text-gray-500">
                    {a.last_rebalanced_at
                      ? `Last rebalanced: ${new Date(a.last_rebalanced_at).toLocaleDateString()}`
                      : 'Never rebalanced'}
                  </p>
                </div>
              </div>
            ))}
            {assignments.length === 0 && (
              <p className="text-center text-gray-500 py-6">
                No accounts assigned to this model
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ========================================================================
  // MAIN RENDER
  // ========================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Loading model portfolios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading data</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={loadData}
            className="mt-2 px-3 py-1 text-sm bg-red-100 rounded hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Model Portfolios</h1>
          <p className="text-gray-500">
            Create, manage, and subscribe to model portfolios
          </p>
        </div>
        {activeTab !== 'detail' && (
          <div className="flex gap-2">
            {(
              [
                { key: 'models', label: 'Models' },
                { key: 'marketplace', label: 'Marketplace' },
                { key: 'rebalance', label: 'Rebalance' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                {tab.key === 'rebalance' &&
                  signals.filter((s) => s.status === 'pending').length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {signals.filter((s) => s.status === 'pending').length}
                    </span>
                  )}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'models' && renderModels()}
      {activeTab === 'marketplace' && renderMarketplace()}
      {activeTab === 'rebalance' && renderRebalance()}
      {activeTab === 'detail' && renderDetail()}
    </div>
  );
}
