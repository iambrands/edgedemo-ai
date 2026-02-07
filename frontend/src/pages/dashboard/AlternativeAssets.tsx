import { useState, useEffect } from 'react';
import { Landmark, DollarSign, ArrowDownRight, TrendingUp, AlertCircle } from 'lucide-react';
import {
  listInvestments,
  getInvestment,
  getPendingCalls,
  payCapitalCall,
  recalculatePerformance,
} from '../../services/alternativeApi';
import type {
  AlternativeInvestment,
  AlternativeTransaction,
  AlternativeValuation,
  AlternativeDocument,
  CapitalCall,
  AlternativeAssetType,
  InvestmentStatus,
} from '../../services/alternativeApi';

// ============================================================================
// CONSTANTS
// ============================================================================

const ASSET_TYPE_CONFIG: Record<
  AlternativeAssetType,
  { label: string; color: string; icon: string }
> = {
  private_equity: { label: 'Private Equity', color: 'bg-blue-500', icon: '🏢' },
  venture_capital: { label: 'Venture Capital', color: 'bg-purple-500', icon: '🚀' },
  hedge_fund: { label: 'Hedge Fund', color: 'bg-indigo-500', icon: '📊' },
  real_estate: { label: 'Real Estate', color: 'bg-green-500', icon: '🏠' },
  private_debt: { label: 'Private Debt', color: 'bg-yellow-600', icon: '💰' },
  commodities: { label: 'Commodities', color: 'bg-amber-500', icon: '🛢️' },
  collectibles: { label: 'Collectibles', color: 'bg-pink-500', icon: '🎨' },
  infrastructure: { label: 'Infrastructure', color: 'bg-orange-500', icon: '🏗️' },
  natural_resources: { label: 'Natural Resources', color: 'bg-emerald-600', icon: '🌲' },
  cryptocurrency: { label: 'Cryptocurrency', color: 'bg-cyan-500', icon: '₿' },
  other: { label: 'Other', color: 'bg-gray-500', icon: '📁' },
};

const STATUS_COLORS: Record<InvestmentStatus, string> = {
  committed: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  harvesting: 'bg-yellow-100 text-yellow-800',
  fully_realized: 'bg-gray-100 text-gray-800',
  written_off: 'bg-red-100 text-red-800',
  pending: 'bg-purple-100 text-purple-800',
};

const STATUS_LABELS: Record<InvestmentStatus, string> = {
  committed: 'Committed',
  active: 'Active',
  harvesting: 'Harvesting',
  fully_realized: 'Realized',
  written_off: 'Written Off',
  pending: 'Pending',
};

// ============================================================================
// HELPERS
// ============================================================================

function formatCurrency(value?: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyFull(value?: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value?: number | null): string {
  if (value == null) return '-';
  return `${(value * 100).toFixed(1)}%`;
}

function formatMultiple(value?: number | null): string {
  if (value == null) return '-';
  return `${value.toFixed(2)}x`;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getAssetConfig(type: AlternativeAssetType) {
  return ASSET_TYPE_CONFIG[type] || ASSET_TYPE_CONFIG.other;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AlternativeAssets() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'investments' | 'calls' | 'detail'
  >('overview');
  const [investments, setInvestments] = useState<AlternativeInvestment[]>([]);
  const [pendingCalls, setPendingCalls] = useState<CapitalCall[]>([]);
  const [selectedInvestment, setSelectedInvestment] =
    useState<AlternativeInvestment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [pendingTotalAmount, setPendingTotalAmount] = useState(0);

  // --------------------------------------------------------------------------
  // Data loading
  // --------------------------------------------------------------------------

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [investRes, callsRes] = await Promise.all([
        listInvestments(),
        getPendingCalls(90),
      ]);
      setInvestments(investRes.investments || []);
      setPendingCalls(callsRes.calls || []);
      setPendingTotalAmount(callsRes.total_amount || 0);
    } catch (err) {
      console.error('Failed to load alternative asset data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
    setLoading(false);
  };

  const loadInvestmentDetail = async (inv: AlternativeInvestment) => {
    try {
      const detail = await getInvestment(inv.id);
      setSelectedInvestment(detail);
      setActiveTab('detail');
    } catch (err) {
      console.error('Failed to load investment detail:', err);
    }
  };

  const handlePayCall = async (callId: string) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await payCapitalCall(callId, today);
      await loadData();
    } catch (err) {
      console.error('Failed to pay capital call:', err);
    }
  };

  const handleRecalculate = async (investmentId: string) => {
    try {
      const updated = await recalculatePerformance(investmentId);
      setSelectedInvestment(updated);
      // Also refresh list
      const investRes = await listInvestments();
      setInvestments(investRes.investments || []);
    } catch (err) {
      console.error('Failed to recalculate:', err);
    }
  };

  // --------------------------------------------------------------------------
  // Derived data
  // --------------------------------------------------------------------------

  const filteredInvestments = investments.filter((inv) => {
    if (filterType && inv.asset_type !== filterType) return false;
    if (filterStatus && inv.status !== filterStatus) return false;
    return true;
  });

  const summaryData = {
    totalNav: investments.reduce((s, i) => s + (i.current_nav || 0), 0),
    totalCommitment: investments.reduce((s, i) => s + (i.total_commitment || 0), 0),
    totalCalled: investments.reduce((s, i) => s + (i.called_capital || 0), 0),
    totalUncalled: investments.reduce((s, i) => s + (i.uncalled_capital || 0), 0),
    totalDistributions: investments.reduce(
      (s, i) => s + (i.distributions_received || 0),
      0,
    ),
  };

  const navByType: Record<string, number> = {};
  investments.forEach((inv) => {
    navByType[inv.asset_type] = (navByType[inv.asset_type] || 0) + (inv.current_nav || 0);
  });

  // --------------------------------------------------------------------------
  // Overview Tab
  // --------------------------------------------------------------------------

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Total NAV</p>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Landmark className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.totalNav)}</p>
          <p className="text-xs text-gray-500 mt-1">{investments.length} investments</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Total Commitment</p>
            <div className="p-2 bg-amber-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryData.totalCommitment)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Called / Uncalled</p>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <ArrowDownRight className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(summaryData.totalCalled)}</p>
          <p className="text-xs text-gray-500">{formatCurrency(summaryData.totalUncalled)} uncalled</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Distributions</p>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {formatCurrency(summaryData.totalDistributions)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-500">Pending Calls</p>
            <div className="p-2 bg-orange-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-orange-600">{pendingCalls.length}</p>
          <p className="text-xs text-orange-400">{formatCurrency(pendingTotalAmount)}</p>
        </div>
      </div>

      {/* Allocation by type */}
      {Object.keys(navByType).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Allocation by Asset Type</h3>
          {/* Bar */}
          <div className="flex h-6 rounded-full overflow-hidden mb-4">
            {Object.entries(navByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, nav]) => {
                const pct = summaryData.totalNav > 0 ? (nav / summaryData.totalNav) * 100 : 0;
                const cfg = getAssetConfig(type as AlternativeAssetType);
                return pct > 0 ? (
                  <div
                    key={type}
                    className={`${cfg.color} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${cfg.label}: ${pct.toFixed(1)}%`}
                  />
                ) : null;
              })}
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(navByType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, nav]) => {
                const cfg = getAssetConfig(type as AlternativeAssetType);
                const pct = summaryData.totalNav > 0 ? (nav / summaryData.totalNav) * 100 : 0;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${cfg.color} flex items-center justify-center text-lg text-white shrink-0`}>
                      {cfg.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{cfg.label}</p>
                      <p className="text-sm font-bold">{formatCurrency(nav)}</p>
                      <p className="text-xs text-gray-500">{pct.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Recent investments */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Investments</h3>
          <button
            onClick={() => setActiveTab('investments')}
            className="text-sm text-blue-600 hover:underline"
          >
            View all
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {investments.slice(0, 6).map((inv) => {
            const cfg = getAssetConfig(inv.asset_type);
            return (
              <div
                key={inv.id}
                onClick={() => loadInvestmentDetail(inv)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg ${cfg.color} flex items-center justify-center text-lg text-white shrink-0`}>
                      {cfg.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{inv.name}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {inv.fund_name || inv.sponsor_name || cfg.label}
                        {inv.vintage_year ? ` · ${inv.vintage_year}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-medium">{formatCurrency(inv.current_nav)}</p>
                    <div className="flex items-center gap-2 justify-end mt-0.5">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABELS[inv.status] || inv.status}
                      </span>
                      {inv.irr != null && (
                        <span className={`text-xs font-medium ${inv.irr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          IRR {formatPercent(inv.irr)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {investments.length === 0 && (
            <p className="p-8 text-center text-gray-500">No investments yet</p>
          )}
        </div>
      </div>

      {/* Upcoming capital calls */}
      {pendingCalls.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upcoming Capital Calls</h3>
            <button
              onClick={() => setActiveTab('calls')}
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingCalls.slice(0, 3).map((call) => {
              const inv = investments.find((i) => i.id === call.investment_id);
              const isOverdue = new Date(call.due_date) < new Date();
              return (
                <div key={call.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{inv?.name || 'Unknown'}</p>
                    <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      Due {formatDate(call.due_date)}
                      {isOverdue && ' (OVERDUE)'}
                    </p>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(call.call_amount)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // --------------------------------------------------------------------------
  // Investments Tab
  // --------------------------------------------------------------------------

  const renderInvestments = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Types</option>
          {Object.entries(ASSET_TYPE_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.icon} {cfg.label}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500 ml-2">
          {filteredInvestments.length} investment{filteredInvestments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Investment</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Commitment</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Called</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">NAV</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">IRR</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">TVPI</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">DPI</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredInvestments.map((inv) => {
              const cfg = getAssetConfig(inv.asset_type);
              return (
                <tr
                  key={inv.id}
                  onClick={() => loadInvestmentDetail(inv)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cfg.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{inv.name}</p>
                        <p className="text-xs text-gray-500">{inv.vintage_year || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{cfg.label}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm">{formatCurrency(inv.total_commitment)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm">{formatCurrency(inv.called_capital)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-medium">{formatCurrency(inv.current_nav)}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    {inv.irr != null ? (
                      <span className={inv.irr >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatPercent(inv.irr)}
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm">{formatMultiple(inv.tvpi)}</td>
                  <td className="px-4 py-3 text-right text-sm">{formatMultiple(inv.dpi)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[inv.status] || inv.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filteredInvestments.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-500">
                  No investments match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // Capital Calls Tab
  // --------------------------------------------------------------------------

  const renderCalls = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Pending Capital Calls
          {pendingCalls.length > 0 && (
            <span className="ml-2 text-base font-normal text-gray-500">
              ({formatCurrency(pendingTotalAmount)} total)
            </span>
          )}
        </h2>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="divide-y divide-gray-100">
          {pendingCalls.map((call) => {
            const inv = investments.find((i) => i.id === call.investment_id);
            const cfg = inv ? getAssetConfig(inv.asset_type) : null;
            const isOverdue = new Date(call.due_date) < new Date();
            return (
              <div key={call.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {cfg && (
                      <div className={`w-10 h-10 rounded-lg ${cfg.color} flex items-center justify-center text-lg text-white shrink-0`}>
                        {cfg.icon}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{inv?.name || 'Unknown Investment'}</p>
                      <p className="text-sm text-gray-500">Call #{call.call_number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatCurrency(call.call_amount)}</p>
                    <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                      Due {formatDate(call.due_date)}
                      {isOverdue && ' (OVERDUE)'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span>Notice: {formatDate(call.notice_date)}</span>
                    <span>Cumulative: {formatCurrency(call.cumulative_called)}</span>
                    <span>Remaining: {formatCurrency(call.remaining_commitment)}</span>
                    {call.percentage_called != null && (
                      <span>{call.percentage_called.toFixed(1)}% called</span>
                    )}
                  </div>
                  <button
                    onClick={() => handlePayCall(call.id)}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shrink-0 ml-4"
                  >
                    Mark as Paid
                  </button>
                </div>
              </div>
            );
          })}
          {pendingCalls.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-gray-500 text-lg">No pending capital calls</p>
              <p className="text-gray-400 text-sm mt-1">All capital calls are up to date</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // Detail View
  // --------------------------------------------------------------------------

  const renderDetail = () => {
    if (!selectedInvestment) return null;
    const inv = selectedInvestment;
    const cfg = getAssetConfig(inv.asset_type);
    const txns: AlternativeTransaction[] = inv.transactions || [];
    const vals: AlternativeValuation[] = inv.valuations || [];
    const calls: CapitalCall[] = inv.capital_calls || [];
    const docs: AlternativeDocument[] = inv.documents || [];
    const k1Docs = docs.filter((d) => d.document_type === 'k1');
    const otherDocs = docs.filter((d) => d.document_type !== 'k1');

    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => {
            setSelectedInvestment(null);
            setActiveTab('investments');
          }}
          className="text-blue-600 hover:underline text-sm"
        >
          &larr; Back to Investments
        </button>

        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl ${cfg.color} flex items-center justify-center text-3xl text-white`}>
                {cfg.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{inv.name}</h2>
                <p className="text-gray-500">
                  {inv.fund_name || inv.sponsor_name || cfg.label}
                  {inv.vintage_year ? ` · Vintage ${inv.vintage_year}` : ''}
                  {inv.geography ? ` · ${inv.geography}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleRecalculate(inv.id)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Recalculate
              </button>
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-700'}`}>
                {STATUS_LABELS[inv.status] || inv.status}
              </span>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide">NAV</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(inv.current_nav)}</p>
              {inv.nav_date && <p className="text-xs text-gray-500">as of {formatDate(inv.nav_date)}</p>}
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Commitment</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(inv.total_commitment)}</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Called</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(inv.called_capital)}</p>
              <p className="text-xs text-gray-500">{formatCurrency(inv.uncalled_capital)} uncalled</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Distributions</p>
              <p className="text-xl font-bold text-green-600 mt-1">
                {formatCurrency(inv.distributions_received)}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide">IRR</p>
              <p className={`text-xl font-bold mt-1 ${(inv.irr ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(inv.irr)}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide">TVPI / MOIC</p>
              <p className="text-xl font-bold mt-1">{formatMultiple(inv.tvpi)}</p>
              <p className="text-xs text-gray-500">DPI {formatMultiple(inv.dpi)}</p>
            </div>
          </div>

          {/* Additional info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
            {inv.investment_strategy && (
              <div>
                <span className="text-gray-500">Strategy:</span>{' '}
                <span className="font-medium">{inv.investment_strategy}</span>
              </div>
            )}
            {inv.sector_focus && (
              <div>
                <span className="text-gray-500">Sector:</span>{' '}
                <span className="font-medium">{inv.sector_focus}</span>
              </div>
            )}
            {inv.management_fee_rate != null && (
              <div>
                <span className="text-gray-500">Mgmt Fee:</span>{' '}
                <span className="font-medium">{(inv.management_fee_rate * 100).toFixed(2)}%</span>
              </div>
            )}
            {inv.carried_interest_rate != null && (
              <div>
                <span className="text-gray-500">Carry:</span>{' '}
                <span className="font-medium">{(inv.carried_interest_rate * 100).toFixed(0)}%</span>
              </div>
            )}
            {inv.tax_entity_type && (
              <div>
                <span className="text-gray-500">Entity:</span>{' '}
                <span className="font-medium capitalize">{inv.tax_entity_type}</span>
              </div>
            )}
            {inv.property_address && (
              <div className="col-span-2">
                <span className="text-gray-500">Property:</span>{' '}
                <span className="font-medium">{inv.property_address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Capital Calls */}
        {calls.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Capital Calls</h3>
            <div className="space-y-3">
              {calls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Call #{call.call_number} &mdash; {formatCurrency(call.call_amount)}</p>
                    <p className="text-sm text-gray-500">Due {formatDate(call.due_date)}</p>
                  </div>
                  <div className="text-right">
                    {call.status === 'paid' ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                        Paid {formatDate(call.paid_date)}
                      </span>
                    ) : call.status === 'pending' ? (
                      <button
                        onClick={() => handlePayCall(call.id)}
                        className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                      >
                        Mark Paid
                      </button>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 font-medium capitalize">
                        {call.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions */}
        {txns.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
            <div className="space-y-2">
              {txns.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium capitalize text-sm">
                      {txn.transaction_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(txn.transaction_date)}</p>
                  </div>
                  <p className={`font-mono font-medium text-sm ${txn.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {txn.amount > 0 ? '+' : ''}
                    {formatCurrencyFull(txn.amount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Valuation History */}
        {vals.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Valuation History</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="pb-2">Date</th>
                    <th className="pb-2 text-right">NAV</th>
                    <th className="pb-2 text-right">Period Return</th>
                    <th className="pb-2 text-right">YTD Return</th>
                    <th className="pb-2">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vals.map((v) => (
                    <tr key={v.id}>
                      <td className="py-2">{formatDate(v.valuation_date)}</td>
                      <td className="py-2 text-right font-mono font-medium">{formatCurrency(v.nav)}</td>
                      <td className="py-2 text-right">
                        {v.period_return != null ? (
                          <span className={v.period_return >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatPercent(v.period_return)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2 text-right">
                        {v.ytd_return != null ? (
                          <span className={v.ytd_return >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatPercent(v.ytd_return)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2 capitalize text-gray-500">{v.source.replace(/_/g, ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* K-1 Documents */}
        {k1Docs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">K-1 Documents</h3>
            <div className="space-y-3">
              {k1Docs.map((doc) => (
                <div key={doc.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-gray-500">Tax Year {doc.tax_year}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {doc.is_processed && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                          Processed
                        </span>
                      )}
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline text-sm font-medium"
                      >
                        View
                      </a>
                    </div>
                  </div>
                  {/* K-1 box data */}
                  {(doc.k1_box_1 != null || doc.k1_box_5 != null || doc.k1_box_9a != null || doc.k1_box_19 != null) && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      {doc.k1_box_1 != null && (
                        <div><span className="text-gray-500">Box 1:</span> {formatCurrencyFull(doc.k1_box_1)}</div>
                      )}
                      {doc.k1_box_5 != null && (
                        <div><span className="text-gray-500">Box 5:</span> {formatCurrencyFull(doc.k1_box_5)}</div>
                      )}
                      {doc.k1_box_6a != null && (
                        <div><span className="text-gray-500">Box 6a:</span> {formatCurrencyFull(doc.k1_box_6a)}</div>
                      )}
                      {doc.k1_box_6b != null && (
                        <div><span className="text-gray-500">Box 6b:</span> {formatCurrencyFull(doc.k1_box_6b)}</div>
                      )}
                      {doc.k1_box_8 != null && (
                        <div><span className="text-gray-500">Box 8 (ST):</span> {formatCurrencyFull(doc.k1_box_8)}</div>
                      )}
                      {doc.k1_box_9a != null && (
                        <div><span className="text-gray-500">Box 9a (LT):</span> {formatCurrencyFull(doc.k1_box_9a)}</div>
                      )}
                      {doc.k1_box_11 != null && (
                        <div><span className="text-gray-500">Box 11:</span> {formatCurrencyFull(doc.k1_box_11)}</div>
                      )}
                      {doc.k1_box_19 != null && (
                        <div><span className="text-gray-500">Box 19:</span> {formatCurrencyFull(doc.k1_box_19)}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Documents */}
        {otherDocs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Documents</h3>
            <div className="space-y-2">
              {otherDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{doc.name}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {doc.document_type.replace(/_/g, ' ')}
                      {doc.document_date ? ` · ${formatDate(doc.document_date)}` : ''}
                    </p>
                  </div>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // Main Render
  // --------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading alternative assets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700 font-medium">Failed to load data</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alternative Assets</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Track private equity, real estate, hedge funds, venture capital, and more
          </p>
        </div>
        {activeTab !== 'detail' && (
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(
              [
                { key: 'overview', label: 'Overview' },
                { key: 'investments', label: 'Investments' },
                { key: 'calls', label: 'Capital Calls' },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
                {key === 'calls' && pendingCalls.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {pendingCalls.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'investments' && renderInvestments()}
      {activeTab === 'calls' && renderCalls()}
      {activeTab === 'detail' && renderDetail()}
    </div>
  );
}
