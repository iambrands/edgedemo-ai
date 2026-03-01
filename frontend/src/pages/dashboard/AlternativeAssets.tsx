import { useState, useEffect } from 'react';
import { Landmark, DollarSign, ArrowDownRight, TrendingUp, AlertCircle, BarChart3, Layers } from 'lucide-react';
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
import { formatCurrency, formatPercent, formatDate } from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabList, Tab } from '../../components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';

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
  other: { label: 'Other', color: 'bg-slate-500', icon: '📁' },
};

const STATUS_BADGE_VARIANT: Record<InvestmentStatus, 'blue' | 'green' | 'amber' | 'gray' | 'red'> = {
  committed: 'blue',
  active: 'green',
  harvesting: 'amber',
  fully_realized: 'gray',
  written_off: 'red',
  pending: 'blue',
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

/** Format currency with 2 decimals (for transaction amounts, K-1 boxes, etc.) */
function formatCurrencyFull(value?: number | null): string {
  return formatCurrency(value, { decimals: 2 });
}

/** Format IRR/return values stored as decimals (0.12 -> "12.0%") */
function formatPercentDecimal(value?: number | null): string {
  if (value == null) return '--';
  return formatPercent(value * 100, { decimals: 1, showSign: false });
}

function formatMultiple(value?: number | null): string {
  if (value == null) return '--';
  return `${value.toFixed(2)}x`;
}

function getAssetConfig(type: AlternativeAssetType) {
  return ASSET_TYPE_CONFIG[type] || ASSET_TYPE_CONFIG.other;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function AlternativeAssets() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'investments' | 'calls' | 'detail' | 'analytics' | 'waterfall'
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
      toast.success('Capital call marked as paid');
      await loadData();
    } catch (err) {
      console.error('Failed to pay capital call:', err);
      toast.error('Failed to pay capital call');
    }
  };

  const handleRecalculate = async (investmentId: string) => {
    try {
      const updated = await recalculatePerformance(investmentId);
      setSelectedInvestment(updated);
      // Also refresh list
      const investRes = await listInvestments();
      setInvestments(investRes.investments || []);
      toast.success('Performance recalculated successfully');
    } catch (err) {
      console.error('Failed to recalculate:', err);
      toast.error('Failed to recalculate performance');
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
        <MetricCard
          label="Total NAV"
          value={formatCurrency(summaryData.totalNav)}
          sublabel={`${investments.length} investments`}
          icon={<Landmark className="h-5 w-5" />}
          color="blue"
        />
        <MetricCard
          label="Total Commitment"
          value={formatCurrency(summaryData.totalCommitment)}
          icon={<DollarSign className="h-5 w-5" />}
          color="amber"
        />
        <MetricCard
          label="Called / Uncalled"
          value={formatCurrency(summaryData.totalCalled)}
          sublabel={`${formatCurrency(summaryData.totalUncalled)} uncalled`}
          icon={<ArrowDownRight className="h-5 w-5" />}
          color="indigo"
        />
        <MetricCard
          label="Distributions"
          value={formatCurrency(summaryData.totalDistributions)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="emerald"
        />
        <MetricCard
          label="Pending Calls"
          value={String(pendingCalls.length)}
          sublabel={formatCurrency(pendingTotalAmount)}
          icon={<AlertCircle className="h-5 w-5" />}
          color="amber"
        />
      </div>

      {/* Allocation by type */}
      {Object.keys(navByType).length > 0 && (
        <Card size="lg">
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
                      <p className="text-xs text-slate-500">{pct.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* Recent investments */}
      <Card size="sm" className="!p-0">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Investments</h3>
          <Button variant="ghost" size="sm" onClick={() => setActiveTab('investments')}>
            View all
          </Button>
        </div>
        <div className="divide-y divide-slate-100">
          {investments.slice(0, 6).map((inv) => {
            const cfg = getAssetConfig(inv.asset_type);
            return (
              <div
                key={inv.id}
                onClick={() => loadInvestmentDetail(inv)}
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg ${cfg.color} flex items-center justify-center text-lg text-white shrink-0`}>
                      {cfg.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{inv.name}</p>
                      <p className="text-sm text-slate-500 truncate">
                        {inv.fund_name || inv.sponsor_name || cfg.label}
                        {inv.vintage_year ? ` · ${inv.vintage_year}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-medium">{formatCurrency(inv.current_nav)}</p>
                    <div className="flex items-center gap-2 justify-end mt-0.5">
                      <Badge variant={STATUS_BADGE_VARIANT[inv.status] || 'gray'}>
                        {STATUS_LABELS[inv.status] || inv.status}
                      </Badge>
                      {inv.irr != null && (
                        <span className={`text-xs font-medium ${inv.irr >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          IRR {formatPercentDecimal(inv.irr)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {investments.length === 0 && (
            <p className="p-8 text-center text-slate-500">No investments yet</p>
          )}
        </div>
      </Card>

      {/* Upcoming capital calls */}
      {pendingCalls.length > 0 && (
        <Card size="sm" className="!p-0">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upcoming Capital Calls</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('calls')}>
              View all
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingCalls.slice(0, 3).map((call) => {
              const inv = investments.find((i) => i.id === call.investment_id);
              const isOverdue = new Date(call.due_date) < new Date();
              return (
                <div key={call.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{inv?.name || 'Unknown'}</p>
                    <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                      Due {formatDate(call.due_date)}
                      {isOverdue && ' (OVERDUE)'}
                    </p>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(call.call_amount)}</p>
                </div>
              );
            })}
          </div>
        </Card>
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
        <Select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-48"
        >
          <option value="">All Types</option>
          {Object.entries(ASSET_TYPE_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.icon} {cfg.label}
            </option>
          ))}
        </Select>
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-44"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
        <span className="text-sm text-slate-500 ml-2">
          {filteredInvestments.length} investment{filteredInvestments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <Card size="sm" className="!p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Investment</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Commitment</TableHead>
              <TableHead className="text-right">Called</TableHead>
              <TableHead className="text-right">NAV</TableHead>
              <TableHead className="text-right">IRR</TableHead>
              <TableHead className="text-right">TVPI</TableHead>
              <TableHead className="text-right">DPI</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvestments.map((inv) => {
              const cfg = getAssetConfig(inv.asset_type);
              return (
                <TableRow
                  key={inv.id}
                  onClick={() => loadInvestmentDetail(inv)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cfg.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{inv.name}</p>
                        <p className="text-xs text-slate-500">{inv.vintage_year || ''}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{cfg.label}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(inv.total_commitment)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(inv.called_capital)}</TableCell>
                  <TableCell className="text-right font-mono font-medium">{formatCurrency(inv.current_nav)}</TableCell>
                  <TableCell className="text-right">
                    {inv.irr != null ? (
                      <span className={inv.irr >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {formatPercentDecimal(inv.irr)}
                      </span>
                    ) : (
                      <span className="text-slate-500">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatMultiple(inv.tvpi)}</TableCell>
                  <TableCell className="text-right">{formatMultiple(inv.dpi)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={STATUS_BADGE_VARIANT[inv.status] || 'gray'}>
                      {STATUS_LABELS[inv.status] || inv.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredInvestments.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-12 text-center text-slate-500">
                  No investments match the current filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
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
            <span className="ml-2 text-base font-normal text-slate-500">
              ({formatCurrency(pendingTotalAmount)} total)
            </span>
          )}
        </h2>
      </div>

      <Card size="sm" className="!p-0">
        <div className="divide-y divide-slate-100">
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
                      <p className="text-sm text-slate-500">Call #{call.call_number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatCurrency(call.call_amount)}</p>
                    <p className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                      Due {formatDate(call.due_date)}
                      {isOverdue && ' (OVERDUE)'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span>Notice: {formatDate(call.notice_date)}</span>
                    <span>Cumulative: {formatCurrency(call.cumulative_called)}</span>
                    <span>Remaining: {formatCurrency(call.remaining_commitment)}</span>
                    {call.percentage_called != null && (
                      <span>{call.percentage_called.toFixed(1)}% called</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handlePayCall(call.id)}
                    className="shrink-0 ml-4 !bg-emerald-600 hover:!bg-emerald-700"
                  >
                    Mark as Paid
                  </Button>
                </div>
              </div>
            );
          })}
          {pendingCalls.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-slate-500 text-lg">No pending capital calls</p>
              <p className="text-slate-400 text-sm mt-1">All capital calls are up to date</p>
            </div>
          )}
        </div>
      </Card>
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
        <Card size="lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl ${cfg.color} flex items-center justify-center text-3xl text-white`}>
                {cfg.icon}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{inv.name}</h2>
                <p className="text-slate-500">
                  {inv.fund_name || inv.sponsor_name || cfg.label}
                  {inv.vintage_year ? ` · Vintage ${inv.vintage_year}` : ''}
                  {inv.geography ? ` · ${inv.geography}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => handleRecalculate(inv.id)}>
                Recalculate
              </Button>
              <Badge variant={STATUS_BADGE_VARIANT[inv.status] || 'gray'}>
                {STATUS_LABELS[inv.status] || inv.status}
              </Badge>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 uppercase tracking-wide">NAV</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(inv.current_nav)}</p>
              {inv.nav_date && <p className="text-xs text-slate-500">as of {formatDate(inv.nav_date)}</p>}
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Commitment</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(inv.total_commitment)}</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Called</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(inv.called_capital)}</p>
              <p className="text-xs text-slate-500">{formatCurrency(inv.uncalled_capital)} uncalled</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Distributions</p>
              <p className="text-xl font-bold text-emerald-600 mt-1">
                {formatCurrency(inv.distributions_received)}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 uppercase tracking-wide">IRR</p>
              <p className={`text-xl font-bold mt-1 ${(inv.irr ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatPercentDecimal(inv.irr)}
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 uppercase tracking-wide">TVPI / MOIC</p>
              <p className="text-xl font-bold mt-1">{formatMultiple(inv.tvpi)}</p>
              <p className="text-xs text-slate-500">DPI {formatMultiple(inv.dpi)}</p>
            </div>
          </div>

          {/* Additional info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
            {inv.investment_strategy && (
              <div>
                <span className="text-slate-500">Strategy:</span>{' '}
                <span className="font-medium">{inv.investment_strategy}</span>
              </div>
            )}
            {inv.sector_focus && (
              <div>
                <span className="text-slate-500">Sector:</span>{' '}
                <span className="font-medium">{inv.sector_focus}</span>
              </div>
            )}
            {inv.management_fee_rate != null && (
              <div>
                <span className="text-slate-500">Mgmt Fee:</span>{' '}
                <span className="font-medium">{(inv.management_fee_rate * 100).toFixed(2)}%</span>
              </div>
            )}
            {inv.carried_interest_rate != null && (
              <div>
                <span className="text-slate-500">Carry:</span>{' '}
                <span className="font-medium">{(inv.carried_interest_rate * 100).toFixed(0)}%</span>
              </div>
            )}
            {inv.tax_entity_type && (
              <div>
                <span className="text-slate-500">Entity:</span>{' '}
                <span className="font-medium capitalize">{inv.tax_entity_type}</span>
              </div>
            )}
            {inv.property_address && (
              <div className="col-span-2">
                <span className="text-slate-500">Property:</span>{' '}
                <span className="font-medium">{inv.property_address}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Capital Calls */}
        {calls.length > 0 && (
          <Card size="lg">
            <h3 className="text-lg font-semibold mb-4">Capital Calls</h3>
            <div className="space-y-3">
              {calls.map((call) => (
                <div key={call.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">Call #{call.call_number} &mdash; {formatCurrency(call.call_amount)}</p>
                    <p className="text-sm text-slate-500">Due {formatDate(call.due_date)}</p>
                  </div>
                  <div className="text-right">
                    {call.status === 'paid' ? (
                      <Badge variant="green">Paid {formatDate(call.paid_date)}</Badge>
                    ) : call.status === 'pending' ? (
                      <Button
                        size="sm"
                        onClick={() => handlePayCall(call.id)}
                        className="!bg-emerald-600 hover:!bg-emerald-700"
                      >
                        Mark Paid
                      </Button>
                    ) : (
                      <Badge variant="gray" className="capitalize">{call.status}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Transactions */}
        {txns.length > 0 && (
          <Card size="lg">
            <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
            <div className="space-y-2">
              {txns.map((txn) => (
                <div key={txn.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium capitalize text-sm">
                      {txn.transaction_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(txn.transaction_date)}</p>
                  </div>
                  <p className={`font-mono font-medium text-sm ${txn.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {txn.amount > 0 ? '+' : ''}
                    {formatCurrencyFull(txn.amount)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Valuation History */}
        {vals.length > 0 && (
          <Card size="lg">
            <h3 className="text-lg font-semibold mb-4">Valuation History</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">NAV</TableHead>
                  <TableHead className="text-right">Period Return</TableHead>
                  <TableHead className="text-right">YTD Return</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vals.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{formatDate(v.valuation_date)}</TableCell>
                    <TableCell className="text-right font-mono font-medium">{formatCurrency(v.nav)}</TableCell>
                    <TableCell className="text-right">
                      {v.period_return != null ? (
                        <span className={v.period_return >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {formatPercentDecimal(v.period_return)}
                        </span>
                      ) : '--'}
                    </TableCell>
                    <TableCell className="text-right">
                      {v.ytd_return != null ? (
                        <span className={v.ytd_return >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {formatPercentDecimal(v.ytd_return)}
                        </span>
                      ) : '--'}
                    </TableCell>
                    <TableCell className="capitalize text-slate-500">{v.source.replace(/_/g, ' ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* K-1 Documents */}
        {k1Docs.length > 0 && (
          <Card size="lg">
            <h3 className="text-lg font-semibold mb-4">K-1 Documents</h3>
            <div className="space-y-3">
              {k1Docs.map((doc) => (
                <div key={doc.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-slate-500">Tax Year {doc.tax_year}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {doc.is_processed && (
                        <Badge variant="green">Processed</Badge>
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
                        <div><span className="text-slate-500">Box 1:</span> {formatCurrencyFull(doc.k1_box_1)}</div>
                      )}
                      {doc.k1_box_5 != null && (
                        <div><span className="text-slate-500">Box 5:</span> {formatCurrencyFull(doc.k1_box_5)}</div>
                      )}
                      {doc.k1_box_6a != null && (
                        <div><span className="text-slate-500">Box 6a:</span> {formatCurrencyFull(doc.k1_box_6a)}</div>
                      )}
                      {doc.k1_box_6b != null && (
                        <div><span className="text-slate-500">Box 6b:</span> {formatCurrencyFull(doc.k1_box_6b)}</div>
                      )}
                      {doc.k1_box_8 != null && (
                        <div><span className="text-slate-500">Box 8 (ST):</span> {formatCurrencyFull(doc.k1_box_8)}</div>
                      )}
                      {doc.k1_box_9a != null && (
                        <div><span className="text-slate-500">Box 9a (LT):</span> {formatCurrencyFull(doc.k1_box_9a)}</div>
                      )}
                      {doc.k1_box_11 != null && (
                        <div><span className="text-slate-500">Box 11:</span> {formatCurrencyFull(doc.k1_box_11)}</div>
                      )}
                      {doc.k1_box_19 != null && (
                        <div><span className="text-slate-500">Box 19:</span> {formatCurrencyFull(doc.k1_box_19)}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Other Documents */}
        {otherDocs.length > 0 && (
          <Card size="lg">
            <h3 className="text-lg font-semibold mb-4">Documents</h3>
            <div className="space-y-2">
              {otherDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{doc.name}</p>
                    <p className="text-xs text-slate-500 capitalize">
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
          </Card>
        )}
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // Main Render
  // --------------------------------------------------------------------------

  // --------------------------------------------------------------------------
  // Analytics Tab - J-Curve, Vintage Cohorts, Commitment Pacing
  // --------------------------------------------------------------------------

  const renderAnalytics = () => {
    // Build vintage cohort data
    const vintageMap: Record<number, { count: number; nav: number; commitment: number; irr: number; tvpi: number }> = {};
    investments.forEach((inv) => {
      const yr = inv.vintage_year || 2024;
      if (!vintageMap[yr]) vintageMap[yr] = { count: 0, nav: 0, commitment: 0, irr: 0, tvpi: 0 };
      vintageMap[yr].count++;
      vintageMap[yr].nav += inv.current_nav || 0;
      vintageMap[yr].commitment += inv.total_commitment || 0;
      vintageMap[yr].irr += inv.irr || 0;
      vintageMap[yr].tvpi += inv.tvpi || 0;
    });
    const vintages = Object.entries(vintageMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([yr, d]) => ({ year: Number(yr), ...d, avgIrr: d.count > 0 ? d.irr / d.count : 0, avgTvpi: d.count > 0 ? d.tvpi / d.count : 0 }));

    // J-curve mock data points (years since inception vs cumulative return)
    const jCurveData = [
      { year: 0, value: -5 }, { year: 1, value: -12 }, { year: 2, value: -8 },
      { year: 3, value: -3 }, { year: 4, value: 5 }, { year: 5, value: 15 },
      { year: 6, value: 28 }, { year: 7, value: 38 }, { year: 8, value: 45 },
      { year: 9, value: 52 }, { year: 10, value: 58 },
    ];

    // Commitment pacing
    const totalCommitment = summaryData.totalCommitment;
    const totalCalled = summaryData.totalCalled;
    const totalUncalled = summaryData.totalUncalled;
    const calledPct = totalCommitment > 0 ? (totalCalled / totalCommitment) * 100 : 0;

    const pacingSchedule = [
      { period: 'Q1 2026', expected: totalUncalled * 0.15, actual: 0, status: 'upcoming' },
      { period: 'Q2 2026', expected: totalUncalled * 0.20, actual: 0, status: 'upcoming' },
      { period: 'Q3 2026', expected: totalUncalled * 0.25, actual: 0, status: 'upcoming' },
      { period: 'Q4 2026', expected: totalUncalled * 0.15, actual: 0, status: 'upcoming' },
      { period: 'Q1 2027', expected: totalUncalled * 0.10, actual: 0, status: 'projected' },
      { period: 'Q2 2027', expected: totalUncalled * 0.10, actual: 0, status: 'projected' },
      { period: 'Q3 2027+', expected: totalUncalled * 0.05, actual: 0, status: 'projected' },
    ];

    const jMin = Math.min(...jCurveData.map(d => d.value));
    const jMax = Math.max(...jCurveData.map(d => d.value));
    const jRange = jMax - jMin;

    return (
      <div className="space-y-6">
        {/* J-Curve Visualization */}
        <Card size="lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg"><BarChart3 className="h-5 w-5 text-blue-600" /></div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">J-Curve Analysis</h3>
              <p className="text-sm text-slate-500">Typical cumulative return profile across fund lifecycle</p>
            </div>
          </div>
          <div className="relative h-64 border border-slate-100 rounded-lg bg-slate-50 p-4">
            {/* Y-axis labels */}
            <div className="absolute left-1 top-4 bottom-8 flex flex-col justify-between text-xs text-slate-400">
              <span>{jMax}%</span>
              <span>0%</span>
              <span>{jMin}%</span>
            </div>
            {/* Zero line */}
            <div className="absolute left-10 right-4 border-t border-dashed border-slate-300" style={{ top: `${((jMax) / jRange) * 80 + 10}%` }} />
            {/* Curve points */}
            <div className="ml-10 mr-4 h-full flex items-end gap-1">
              {jCurveData.map((point, i) => {
                const normalizedHeight = ((point.value - jMin) / jRange) * 80 + 10;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative">
                    <div
                      className={`w-3 h-3 rounded-full ${point.value >= 0 ? 'bg-emerald-500' : 'bg-red-400'} relative z-10`}
                      style={{ position: 'absolute', bottom: `${normalizedHeight}%` }}
                      title={`Year ${point.year}: ${point.value}%`}
                    />
                    <span className="text-[10px] text-slate-400 absolute bottom-0">Yr {point.year}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-6 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Capital deployment (negative returns)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Value creation (positive returns)</span>
          </div>
        </Card>

        {/* Vintage Year Cohort Analysis */}
        <Card size="lg">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Vintage Year Cohort Analysis</h3>
          {vintages.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vintage</TableHead>
                  <TableHead className="text-right">Funds</TableHead>
                  <TableHead className="text-right">Commitment</TableHead>
                  <TableHead className="text-right">Current NAV</TableHead>
                  <TableHead className="text-right">Avg IRR</TableHead>
                  <TableHead className="text-right">Avg TVPI</TableHead>
                  <TableHead className="text-right">NAV Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vintages.map((v) => {
                  const navPct = summaryData.totalNav > 0 ? (v.nav / summaryData.totalNav) * 100 : 0;
                  return (
                    <TableRow key={v.year}>
                      <TableCell className="font-medium text-slate-900">{v.year}</TableCell>
                      <TableCell className="text-right">{v.count}</TableCell>
                      <TableCell className="text-right">{formatCurrency(v.commitment)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(v.nav)}</TableCell>
                      <TableCell className="text-right">
                        <span className={v.avgIrr >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {formatPercentDecimal(v.avgIrr)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatMultiple(v.avgTvpi)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${navPct}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 w-10 text-right">{navPct.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-slate-500 text-center py-8">No vintage data available</p>
          )}
        </Card>

        {/* Commitment Pacing */}
        <Card size="lg">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Commitment Pacing</h3>
          <p className="text-sm text-slate-500 mb-4">
            {formatCurrency(totalCalled)} called of {formatCurrency(totalCommitment)} total commitment ({calledPct.toFixed(1)}%)
          </p>
          {/* Progress bar */}
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${calledPct}%` }} />
          </div>
          {/* Pacing schedule */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Expected Calls</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pacingSchedule.map((p) => (
                <TableRow key={p.period}>
                  <TableCell className="font-medium text-slate-900">{p.period}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.expected)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={p.status === 'upcoming' ? 'blue' : 'gray'}>
                      {p.status === 'upcoming' ? 'Upcoming' : 'Projected'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // Waterfall Tab - Distribution Waterfall Modeling
  // --------------------------------------------------------------------------

  const renderWaterfall = () => {
    const totalDistributed = summaryData.totalDistributions;
    const totalCalled2 = summaryData.totalCalled;

    // Waterfall tiers
    const waterfallTiers = [
      { tier: 'Return of Capital', description: 'Return of invested capital to LPs', amount: Math.min(totalCalled2, totalDistributed), pctOfDistributed: totalDistributed > 0 ? Math.min(totalCalled2 / totalDistributed * 100, 100) : 0 },
      { tier: 'Preferred Return (8%)', description: '8% annualized preferred return to LPs', amount: totalCalled2 * 0.08 * 3, pctOfDistributed: totalDistributed > 0 ? (totalCalled2 * 0.08 * 3) / Math.max(totalDistributed, 1) * 100 : 0 },
      { tier: 'GP Catch-Up (20%)', description: 'GP catch-up to 20% of profits', amount: totalCalled2 * 0.08 * 3 * 0.25, pctOfDistributed: totalDistributed > 0 ? (totalCalled2 * 0.08 * 3 * 0.25) / Math.max(totalDistributed, 1) * 100 : 0 },
      { tier: 'Carried Interest (80/20)', description: '80% LP / 20% GP split on remaining profits', amount: Math.max(0, totalDistributed - totalCalled2 - totalCalled2 * 0.08 * 3) * 0.80, pctOfDistributed: totalDistributed > 0 ? Math.max(0, totalDistributed - totalCalled2 - totalCalled2 * 0.08 * 3) * 0.80 / Math.max(totalDistributed, 1) * 100 : 0 },
    ];

    const lpShare = waterfallTiers[0].amount + waterfallTiers[1].amount + waterfallTiers[3].amount;
    const gpShare = waterfallTiers[2].amount + (Math.max(0, totalDistributed - totalCalled2 - totalCalled2 * 0.08 * 3) * 0.20);

    // Per-fund waterfall table
    const fundWaterfalls = investments.slice(0, 8).map((inv) => ({
      name: inv.name,
      type: inv.asset_type,
      commitment: inv.total_commitment || 0,
      called: inv.called_capital || 0,
      distributed: inv.distributions_received || 0,
      nav: inv.current_nav || 0,
      tvpi: inv.tvpi || 0,
      dpi: (inv.distributions_received || 0) / Math.max(inv.called_capital || 1, 1),
      rvpi: (inv.current_nav || 0) / Math.max(inv.called_capital || 1, 1),
    }));

    const maxTierAmount = Math.max(...waterfallTiers.map(t => t.amount), 1);

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <MetricCard label="Total Distributions" value={formatCurrency(totalDistributed)} color="blue" />
          <MetricCard label="LP Share" value={formatCurrency(lpShare)} color="emerald" />
          <MetricCard label="GP Share (Carry)" value={formatCurrency(gpShare)} color="indigo" />
          <MetricCard label="Overall DPI" value={totalCalled2 > 0 ? formatMultiple(totalDistributed / totalCalled2) : '--'} color="slate" />
        </div>

        {/* Waterfall Tiers */}
        <Card size="lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg"><Layers className="h-5 w-5 text-purple-600" /></div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Distribution Waterfall</h3>
              <p className="text-sm text-slate-500">Standard American waterfall (deal-by-deal) structure</p>
            </div>
          </div>
          <div className="space-y-4">
            {waterfallTiers.map((tier, i) => (
              <div key={tier.tier} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{tier.tier}</p>
                      <p className="text-xs text-slate-500">{tier.description}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(tier.amount)}</p>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-emerald-500' : i === 2 ? 'bg-amber-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${Math.min((tier.amount / maxTierAmount) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Per-Fund Performance */}
        <Card size="lg">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Fund-Level Distribution Metrics</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fund</TableHead>
                <TableHead className="text-right">Commitment</TableHead>
                <TableHead className="text-right">Called</TableHead>
                <TableHead className="text-right">Distributed</TableHead>
                <TableHead className="text-right">NAV</TableHead>
                <TableHead className="text-right">TVPI</TableHead>
                <TableHead className="text-right">DPI</TableHead>
                <TableHead className="text-right">RVPI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fundWaterfalls.map((f) => (
                <TableRow key={f.name}>
                  <TableCell>
                    <p className="font-medium text-slate-900">{f.name}</p>
                    <p className="text-xs text-slate-500">{getAssetConfig(f.type as AlternativeAssetType).label}</p>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(f.commitment)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(f.called)}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">{formatCurrency(f.distributed)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(f.nav)}</TableCell>
                  <TableCell className="text-right font-bold">{formatMultiple(f.tvpi)}</TableCell>
                  <TableCell className="text-right">{formatMultiple(f.dpi)}</TableCell>
                  <TableCell className="text-right">{formatMultiple(f.rvpi)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-slate-500">Loading alternative assets...</p>
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
          <Button
            onClick={loadData}
            size="sm"
            className="mt-4 !bg-red-600 hover:!bg-red-700"
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
        title="Alternative Assets"
        subtitle="Track private equity, real estate, hedge funds, venture capital, and more"
        className="mb-6"
      />

      {activeTab !== 'detail' && (
        <Tabs value={activeTab} onChange={(v) => setActiveTab(v as typeof activeTab)} variant="pills">
          <TabList className="mb-6">
            <Tab value="overview">Overview</Tab>
            <Tab value="investments">Investments</Tab>
            <Tab value="calls">
              Capital Calls
              {pendingCalls.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {pendingCalls.length}
                </span>
              )}
            </Tab>
            <Tab value="analytics">Analytics</Tab>
            <Tab value="waterfall">Waterfall</Tab>
          </TabList>
        </Tabs>
      )}

      {/* Tab content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'investments' && renderInvestments()}
      {activeTab === 'calls' && renderCalls()}
      {activeTab === 'analytics' && renderAnalytics()}
      {activeTab === 'waterfall' && renderWaterfall()}
      {activeTab === 'detail' && renderDetail()}
    </div>
  );
}
