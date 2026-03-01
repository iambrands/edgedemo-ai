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
import { formatCurrency, formatPercent, formatDate } from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabList, Tab } from '../../components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Card } from '../../components/ui/Card';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';

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
  cash: 'bg-slate-400',
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
// COMPONENT
// ============================================================================

type Tab = 'models' | 'marketplace' | 'rebalance' | 'detail';

export default function ModelPortfolios() {
  const toast = useToast();
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
      toast.success(`Generated ${result.signals_generated} rebalance signal(s)`);
    } catch (err) {
      console.error('Failed to check drift:', err);
      toast.error('Failed to check drift');
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
      toast.success('Signal approved');
    } catch (err) {
      console.error('Failed to approve signal:', err);
      toast.error('Failed to approve signal');
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
      toast.success('Signal rejected');
    } catch (err) {
      console.error('Failed to reject signal:', err);
      toast.error('Failed to reject signal');
    }
  };

  const handleSubscribe = async (modelId: string) => {
    try {
      await subscribe(modelId);
      toast.success('Subscribed successfully!');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to subscribe');
    }
  };

  // ── status badge helper ──────────────────────────────────

  const MODEL_STATUS_VARIANT: Record<string, 'green' | 'gray' | 'amber' | 'red' | 'blue'> = {
    active: 'green',
    draft: 'gray',
    paused: 'amber',
    archived: 'red',
  };

  const SIGNAL_STATUS_VARIANT: Record<string, 'green' | 'gray' | 'amber' | 'red' | 'blue'> = {
    pending: 'amber',
    approved: 'blue',
    executing: 'blue',
    completed: 'green',
    rejected: 'red',
    expired: 'gray',
    failed: 'red',
  };

  // ========================================================================
  // TAB: Models
  // ========================================================================

  const renderModels = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900">My Model Portfolios</h2>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Models"
          value={String(models.length)}
          sublabel={`${models.filter((m) => m.status === 'active').length} active`}
          icon={<PieChart className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          label="Total AUM"
          value={formatCurrency(models.reduce((s, m) => s + (m.total_aum || 0), 0))}
          sublabel="across all models"
          icon={<DollarSign className="h-5 w-5" />}
          color="amber"
        />
        <MetricCard
          label="Subscribers"
          value={String(models.reduce((s, m) => s + (m.total_subscribers || 0), 0))}
          sublabel="total subscribers"
          icon={<Users className="h-5 w-5" />}
          color="indigo"
        />
        <MetricCard
          label="Pending Signals"
          value={String(signals.filter((s) => s.status === 'pending').length)}
          sublabel="require review"
          icon={<Bell className="h-5 w-5" />}
          color="purple"
        />
      </div>

      {/* Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => (
          <Card
            key={model.id}
            size="sm"
            hoverable
            onClick={() => loadModelDetail(model)}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 truncate">{model.name}</h3>
              <Badge variant={MODEL_STATUS_VARIANT[model.status] || 'gray'}>{model.status}</Badge>
            </div>
            {model.ticker && (
              <p className="text-sm text-slate-500 mt-0.5">{model.ticker}</p>
            )}

            {/* Allocation bar */}
            {(model.holdings ?? []).length > 0 && (
              <div className="mt-3 h-3 rounded-full overflow-hidden flex bg-slate-200">
                {(model.holdings ?? []).map((h) => (
                  <div
                    key={h.id}
                    className={ASSET_CLASS_COLORS[h.asset_class] || 'bg-slate-400'}
                    style={{ width: `${h.target_weight_pct ?? 0}%` }}
                    title={`${h.symbol}: ${(h.target_weight_pct ?? 0).toFixed(1)}%`}
                  />
                ))}
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-500">YTD Return</p>
                <p
                  className={`font-medium ${
                    (model.ytd_return || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {formatPercent(model.ytd_return)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Risk Level</p>
                <p className="font-medium text-slate-900">{model.risk_level ?? '—'}/10</p>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{(model.holdings ?? []).length} holdings</span>
              <span>
                {model.total_subscribers}{' '}
                {model.total_subscribers === 1 ? 'subscriber' : 'subscribers'}
              </span>
            </div>
          </Card>
        ))}

        {models.length === 0 && (
          <p className="col-span-3 text-center text-slate-500 py-12">
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
        <h2 className="text-lg font-semibold text-slate-900">Model Marketplace</h2>
        <div className="flex gap-2">
          <Select
            value={mpCategory}
            onChange={(e) => setMpCategory(e.target.value)}
            className="w-48"
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <SearchInput
            placeholder="Search models..."
            value={mpSearch}
            onChange={(e) => setMpSearch(e.target.value)}
            className="w-56"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {marketplaceModels.map((model) => (
          <Card key={model.id} size="sm">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 truncate">{model.name}</h3>
              <span className="text-xs text-slate-500">
                {model.total_subscribers}{' '}
                {model.total_subscribers === 1 ? 'sub' : 'subs'}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
              {model.description || 'No description available'}
            </p>

            {/* Allocation bar */}
            {(model.holdings ?? []).length > 0 && (
              <div className="mt-3 h-3 rounded-full overflow-hidden flex bg-slate-200">
                {(model.holdings ?? []).map((h) => (
                  <div
                    key={h.id}
                    className={ASSET_CLASS_COLORS[h.asset_class] || 'bg-slate-400'}
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
                  <span key={h.id} className="flex items-center text-xs text-slate-500">
                    <span
                      className={`inline-block w-2 h-2 rounded-full mr-1 ${
                        ASSET_CLASS_COLORS[h.asset_class] || 'bg-slate-400'
                      }`}
                    />
                    {h.symbol} {(h.target_weight_pct ?? 0).toFixed(0)}%
                  </span>
                ))}
                {(model.holdings ?? []).length > 4 && (
                  <span className="text-xs text-slate-500">
                    +{(model.holdings ?? []).length - 4} more
                  </span>
                )}
              </div>
            )}

            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-slate-500">YTD</p>
                <p
                  className={`font-medium ${
                    (model.ytd_return || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {formatPercent(model.ytd_return)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">1 Year</p>
                <p className="font-medium text-slate-900">
                  {formatPercent(model.one_year_return)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Risk</p>
                <p className="font-medium text-slate-900">{model.risk_level}/10</p>
              </div>
            </div>

            {/* Fee info */}
            {(model.subscription_fee_monthly || model.subscription_fee_annual) && (
              <p className="mt-2 text-xs text-slate-500">
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

            <Button
              onClick={() => handleSubscribe(model.id)}
              size="sm"
              className="mt-3 w-full"
            >
              Subscribe
            </Button>
          </Card>
        ))}

        {marketplaceModels.length === 0 && (
          <p className="col-span-3 text-center text-slate-500 py-12">
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
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            Rebalancing Signals
            {pending.length > 0 && (
              <Badge variant="amber">{pending.length} pending</Badge>
            )}
          </h2>
          <Button size="sm" onClick={handleCheckDrift}>
            Check All for Drift
          </Button>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard label="Pending" value={String(pending.length)} color="amber" />
          <MetricCard label="Approved" value={String(signals.filter((s) => s.status === 'approved').length)} color="blue" />
          <MetricCard label="Completed" value={String(signals.filter((s) => s.status === 'completed').length)} color="emerald" />
          <MetricCard label="Rejected" value={String(signals.filter((s) => s.status === 'rejected').length)} color="red" />
        </div>

        {/* Signal cards */}
        <Card size="sm" className="!p-0">
          <div className="divide-y divide-slate-100">
            {[...pending, ...other].map((signal) => (
              <div key={signal.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={SIGNAL_STATUS_VARIANT[signal.status] || 'gray'}>{signal.status}</Badge>
                      <span className="font-medium text-slate-900">
                        Drift: {(signal.total_drift_pct ?? 0).toFixed(2)}%
                      </span>
                      <span className="text-xs text-slate-500">
                        {signal.trigger_type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      Account Value: {formatCurrency(signal.account_value)} &middot;{' '}
                      {signal.estimated_trades_count} trades required
                    </p>
                    {signal.created_at && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Created: {formatDate(signal.created_at)}
                      </p>
                    )}
                  </div>

                  {signal.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="secondary" size="sm" onClick={() => handleRejectSignal(signal.id)}>
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => handleApproveSignal(signal.id)} className="!bg-emerald-600 hover:!bg-emerald-700">
                        Approve
                      </Button>
                    </div>
                  )}
                </div>

                {/* Trades preview */}
                {signal.trades_required && signal.trades_required.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-red-600">
                        Sells: {formatCurrency(signal.estimated_sell_value)}
                      </p>
                      <div className="mt-1 space-y-1">
                        {signal.trades_required
                          .filter((t) => t.action === 'sell')
                          .map((t, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-slate-600"
                            >
                              <span>{t.symbol || '-'}</span>
                              <span>{formatCurrency(t.value)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-emerald-600">
                        Buys: {formatCurrency(signal.estimated_buy_value)}
                      </p>
                      <div className="mt-1 space-y-1">
                        {signal.trades_required
                          .filter((t) => t.action === 'buy')
                          .map((t, i) => (
                            <div
                              key={i}
                              className="flex justify-between text-slate-600"
                            >
                              <span>{t.symbol || '-'}</span>
                              <span>{formatCurrency(t.value)}</span>
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
              <p className="p-8 text-center text-slate-500">
                No rebalance signals. Click &quot;Check All for Drift&quot; to scan
                portfolios.
              </p>
            )}
          </div>
        </Card>
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
        <Card size="lg">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {selectedModel.name}
              </h2>
              {selectedModel.ticker && (
                <p className="text-slate-500">{selectedModel.ticker}</p>
              )}
              <p className="mt-2 text-slate-600">
                {selectedModel.description || 'No description'}
              </p>
              {selectedModel.tags && selectedModel.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedModel.tags.map((tag) => (
                    <Badge key={tag} variant="gray">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Badge variant={MODEL_STATUS_VARIANT[selectedModel.status] || 'gray'}>{selectedModel.status}</Badge>
              <Badge variant="blue">{selectedModel.visibility}</Badge>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {[
              {
                label: 'YTD Return',
                value: formatPercent(selectedModel.ytd_return),
                color:
                  (selectedModel.ytd_return || 0) >= 0
                    ? 'text-emerald-600'
                    : 'text-red-600',
              },
              {
                label: 'Risk Level',
                value: `${selectedModel.risk_level}/10`,
                color: 'text-slate-900',
              },
              {
                label: 'Drift Threshold',
                value: `${selectedModel.drift_threshold_pct ?? 5}%`,
                color: 'text-slate-900',
              },
              {
                label: 'Total AUM',
                value: formatCurrency(selectedModel.total_aum),
                color: 'text-slate-900',
              },
            ].map((m) => (
              <div key={m.label} className="text-center p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">{m.label}</p>
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Extra performance metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {[
              { label: '1 Year', value: formatPercent(selectedModel.one_year_return) },
              { label: '3 Year', value: formatPercent(selectedModel.three_year_return) },
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
                <p className="text-slate-500">{m.label}</p>
                <p className="font-medium text-slate-900">{m.value || '-'}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Holdings Table */}
        <Card size="lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-900">
              Holdings ({(selectedModel.holdings ?? []).length})
            </h3>
            {validation && (
              <span
                className={`text-sm font-medium ${
                  validation.is_valid ? 'text-emerald-600' : 'text-red-600'
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
              <div className="h-4 rounded-full overflow-hidden flex bg-slate-200">
                {(selectedModel.holdings ?? []).map((h) => (
                  <div
                    key={h.id}
                    className={ASSET_CLASS_COLORS[h.asset_class] || 'bg-slate-400'}
                    style={{ width: `${h.target_weight_pct ?? 0}%` }}
                  />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {(selectedModel.holdings ?? []).map((h) => (
                  <span
                    key={h.id}
                    className="flex items-center text-xs text-slate-600"
                  >
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full mr-1.5 ${
                        ASSET_CLASS_COLORS[h.asset_class] || 'bg-slate-400'
                      }`}
                    />
                    {h.symbol} ({(h.target_weight_pct ?? 0).toFixed(1)}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Asset Class</TableHead>
                <TableHead className="text-right">Target %</TableHead>
                <TableHead className="text-right">Expense Ratio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(selectedModel.holdings ?? []).map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium text-slate-900">{h.symbol}</TableCell>
                  <TableCell className="text-slate-600">{h.security_name}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-0.5 text-xs rounded text-white ${
                        ASSET_CLASS_COLORS[h.asset_class] || 'bg-slate-400'
                      }`}
                    >
                      {ASSET_CLASS_LABELS[h.asset_class] || (h.asset_class ?? '').replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-900">
                    {(h.target_weight_pct ?? 0).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right text-slate-500">
                    {h.expense_ratio != null ? `${h.expense_ratio}%` : '--'}
                  </TableCell>
                </TableRow>
              ))}
              {(selectedModel.holdings ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-slate-500">
                    No holdings in this model
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Account Assignments */}
        <Card size="lg">
          <h3 className="font-semibold text-slate-900 mb-4">
            Account Assignments ({assignments.length})
          </h3>
          <div className="space-y-2">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    Account: {a.account_id.slice(0, 8)}...
                  </p>
                  <p className="text-sm text-slate-500">
                    Value: {formatCurrency(a.account_value)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-medium ${
                      (a.current_drift_pct || 0) > (selectedModel.drift_threshold_pct ?? 5)
                        ? 'text-red-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    Drift: {a.current_drift_pct?.toFixed(2) || '0.00'}%
                  </p>
                  <p className="text-sm text-slate-500">
                    {a.last_rebalanced_at
                      ? `Last rebalanced: ${formatDate(a.last_rebalanced_at)}`
                      : 'Never rebalanced'}
                  </p>
                </div>
              </div>
            ))}
            {assignments.length === 0 && (
              <p className="text-center text-slate-500 py-6">
                No accounts assigned to this model
              </p>
            )}
          </div>
        </Card>
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
          <p className="mt-2 text-sm text-slate-500">Loading model portfolios...</p>
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
          <Button
            onClick={loadData}
            size="sm"
            className="mt-2 !bg-red-600 hover:!bg-red-700 !text-white"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Model Portfolios"
        subtitle="Create, manage, and subscribe to model portfolios"
        className="mb-6"
      />

      {activeTab !== 'detail' && (
        <Tabs value={activeTab} onChange={(v) => setActiveTab(v as Tab)} variant="pills">
          <TabList className="mb-6">
            <Tab value="models">Models</Tab>
            <Tab value="marketplace">Marketplace</Tab>
            <Tab value="rebalance">
              Rebalance
              {signals.filter((s) => s.status === 'pending').length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {signals.filter((s) => s.status === 'pending').length}
                </span>
              )}
            </Tab>
          </TabList>
        </Tabs>
      )}

      {activeTab === 'models' && renderModels()}
      {activeTab === 'marketplace' && renderMarketplace()}
      {activeTab === 'rebalance' && renderRebalance()}
      {activeTab === 'detail' && renderDetail()}
    </div>
  );
}
