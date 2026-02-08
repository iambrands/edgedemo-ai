/**
 * Tax-Loss Harvesting Dashboard.
 *
 * Layout:
 *  - Summary cards (opportunities count, harvestable loss, estimated savings, scan button)
 *  - Opportunities list with approve/reject inline actions
 *  - Detail slide-out with replacement recommendations
 *  - Wash sale windows tab
 */

import { useCallback, useEffect, useState } from 'react';
import {
  TrendingDown,
  DollarSign,
  Percent,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  Clock,
  Loader2,
  ChevronRight,
  Shield,
} from 'lucide-react';
import {
  scanPortfolio,
  getOpportunities,
  getSummary,
  getRecommendations,
  approveOpportunity,
  rejectOpportunity,
  getWashSales,
  type HarvestOpportunity,
  type ReplacementRecommendation,
  type OpportunitySummary,
  type WashSaleWindow,
  type HarvestStatus,
} from '../../services/taxHarvestApi';

// ============================================================================
// HELPERS
// ============================================================================

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  identified: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Identified' },
  recommended: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Recommended' },
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approved' },
  executing: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Executing' },
  executed: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Executed' },
  expired: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Expired' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
  wash_sale_risk: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Wash Sale Risk' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] || STATUS_BADGE.identified;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// ============================================================================
// TABS
// ============================================================================

type TabKey = 'opportunities' | 'wash_sales';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TaxHarvest() {
  const [tab, setTab] = useState<TabKey>('opportunities');
  const [error, setError] = useState<string | null>(null);

  // Summary
  const [summary, setSummary] = useState<OpportunitySummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Opportunities
  const [opportunities, setOpportunities] = useState<HarvestOpportunity[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [statusFilter, setStatusFilter] = useState<HarvestStatus | ''>('');

  // Detail
  const [selected, setSelected] = useState<HarvestOpportunity | null>(null);
  const [recommendations, setRecommendations] = useState<ReplacementRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedReplacement, setSelectedReplacement] = useState<string | null>(null);

  // Scanning
  const [scanning, setScanning] = useState(false);

  // Wash sales
  const [washSales, setWashSales] = useState<WashSaleWindow[]>([]);
  const [loadingWash, setLoadingWash] = useState(false);

  // Action loading
  const [actionLoading, setActionLoading] = useState(false);

  // ────────────────────────────────────────────────────────────
  // Loaders
  // ────────────────────────────────────────────────────────────

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      setSummary(await getSummary());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load summary');
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const loadOpportunities = useCallback(async () => {
    setLoadingOpps(true);
    try {
      const opps = await getOpportunities(undefined, statusFilter || undefined);
      setOpportunities(opps);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load opportunities');
    } finally {
      setLoadingOpps(false);
    }
  }, [statusFilter]);

  const loadWashSales = useCallback(async () => {
    setLoadingWash(true);
    try {
      setWashSales(await getWashSales());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load wash sales');
    } finally {
      setLoadingWash(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    loadOpportunities();
  }, [loadSummary, loadOpportunities]);

  useEffect(() => {
    if (tab === 'wash_sales') loadWashSales();
  }, [tab, loadWashSales]);

  // ────────────────────────────────────────────────────────────
  // Actions
  // ────────────────────────────────────────────────────────────

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const newOpps = await scanPortfolio();
      if (newOpps.length > 0) {
        await loadOpportunities();
        await loadSummary();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handleSelectOpportunity = async (opp: HarvestOpportunity) => {
    setSelected(opp);
    setSelectedReplacement(null);
    setRecommendations([]);
    setLoadingRecs(true);
    try {
      const recs = await getRecommendations(opp.id);
      setRecommendations(recs);
    } catch {
      // recommendations may not exist yet — not critical
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleApprove = async (id: string, replacement?: string) => {
    setActionLoading(true);
    setError(null);
    try {
      await approveOpportunity(id, replacement || undefined);
      setSelected(null);
      await loadOpportunities();
      await loadSummary();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(true);
    setError(null);
    try {
      await rejectOpportunity(id, 'Declined by advisor');
      setSelected(null);
      await loadOpportunities();
      await loadSummary();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // UI
  // ────────────────────────────────────────────────────────────

  const canApprove = (s: string) => s === 'identified' || s === 'recommended';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tax-Loss Harvesting</h1>
        <p className="text-slate-500 mt-1">Identify and execute tax-saving opportunities</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Opportunities</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {loadingSummary ? '—' : summary?.total_opportunities ?? 0}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <TrendingDown className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Harvestable Loss</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {loadingSummary ? '—' : fmtCurrency(summary?.total_harvestable_loss ?? 0)}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Est. Tax Savings</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {loadingSummary ? '—' : fmtCurrency(summary?.total_estimated_savings ?? 0)}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <Percent className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-center">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning…' : 'Scan Portfolio'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-4">
        {([
          { key: 'opportunities' as TabKey, label: 'Opportunities', icon: TrendingDown },
          { key: 'wash_sales' as TabKey, label: 'Wash Sales', icon: Shield },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelected(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════ OPPORTUNITIES TAB ════════════════════ */}
      {tab === 'opportunities' && !selected && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as HarvestStatus | '')}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="identified">Identified</option>
              <option value="recommended">Recommended</option>
              <option value="approved">Approved</option>
              <option value="executing">Executing</option>
              <option value="executed">Executed</option>
              <option value="wash_sale_risk">Wash Sale Risk</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
            <button
              onClick={loadOpportunities}
              disabled={loadingOpps}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingOpps ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* List */}
          {loadingOpps ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : opportunities.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <TrendingDown className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No harvesting opportunities found</p>
              <p className="text-sm text-slate-500 mt-1">Run a scan to identify tax-loss opportunities</p>
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map(opp => (
                <div
                  key={opp.id}
                  onClick={() => handleSelectOpportunity(opp)}
                  className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-lg font-semibold text-slate-900">{opp.symbol}</span>
                        <StatusBadge status={opp.status} />
                        {opp.wash_sale_status === 'in_window' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            <AlertTriangle className="h-3 w-3" />
                            Wash Sale Risk
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1 truncate">{opp.security_name}</p>
                      <div className="flex items-center gap-6 mt-3 text-sm flex-wrap">
                        <div>
                          <span className="text-slate-500">Loss:</span>
                          <span className="ml-1 font-mono text-red-600">{fmtCurrency(opp.unrealized_loss)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Tax Savings:</span>
                          <span className="ml-1 font-mono text-emerald-600">{fmtCurrency(opp.estimated_tax_savings)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">ST / LT:</span>
                          <span className="ml-1 font-mono">
                            {opp.short_term_loss != null ? fmtCurrency(opp.short_term_loss) : '—'} / {opp.long_term_loss != null ? fmtCurrency(opp.long_term_loss) : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Inline actions */}
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      {canApprove(opp.status) && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); handleReject(opp.id); }}
                            disabled={actionLoading}
                            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleApprove(opp.id); }}
                            disabled={actionLoading || opp.wash_sale_status === 'in_window'}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            <Check className="h-4 w-4" />
                            Approve
                          </button>
                        </>
                      )}
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ DETAIL VIEW ════════════════════ */}
      {tab === 'opportunities' && selected && (
        <div className="space-y-6">
          {/* Back */}
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← Back to list
          </button>

          {/* Header card */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selected.symbol}</h2>
                <p className="text-slate-500">{selected.security_name}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-slate-500">Unrealized Loss</p>
                <p className="text-2xl font-bold text-red-600">{fmtCurrency(selected.unrealized_loss)}</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm text-slate-500">Est. Tax Savings</p>
                <p className="text-2xl font-bold text-emerald-600">{fmtCurrency(selected.estimated_tax_savings)}</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500">Quantity</p>
                <p className="text-2xl font-bold">{selected.quantity_to_harvest.toLocaleString()}</p>
              </div>
            </div>

            {/* Details grid */}
            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div><span className="text-slate-500">Cost Basis:</span> <span className="font-mono">{fmtCurrency(selected.cost_basis)}</span></div>
              <div><span className="text-slate-500">Market Value:</span> <span className="font-mono">{fmtCurrency(selected.market_value)}</span></div>
              <div><span className="text-slate-500">Short-Term Loss:</span> <span className="font-mono">{selected.short_term_loss != null ? fmtCurrency(selected.short_term_loss) : '—'}</span></div>
              <div><span className="text-slate-500">Long-Term Loss:</span> <span className="font-mono">{selected.long_term_loss != null ? fmtCurrency(selected.long_term_loss) : '—'}</span></div>
              <div><span className="text-slate-500">Identified:</span> {fmtDate(selected.identified_at)}</div>
              <div><span className="text-slate-500">Expires:</span> {fmtDate(selected.expires_at)}</div>
            </div>

            {/* Wash sale warning */}
            {selected.wash_sale_status === 'in_window' && (
              <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-800">Wash Sale Risk</p>
                  <p className="text-sm text-orange-600">
                    Recent purchases detected. Window: {fmtDate(selected.wash_sale_window_start)} –{' '}
                    {fmtDate(selected.wash_sale_window_end)}
                    {selected.wash_sale_risk_amount
                      ? ` (${fmtCurrency(selected.wash_sale_risk_amount)} at risk)`
                      : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Replacement recommendations */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Replacement Recommendations</h3>
            {loadingRecs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                <span className="ml-2 text-sm text-slate-500">Generating recommendations…</span>
              </div>
            ) : recommendations.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No replacement recommendations available</p>
            ) : (
              <div className="space-y-3">
                {recommendations.map(rec => (
                  <div
                    key={rec.symbol}
                    onClick={() => setSelectedReplacement(selectedReplacement === rec.symbol ? null : rec.symbol)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedReplacement === rec.symbol
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{rec.symbol}</span>
                          {rec.name && <span className="text-sm text-slate-500">– {rec.name}</span>}
                          {rec.wash_sale_safe && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              Safe
                            </span>
                          )}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 capitalize">
                            {rec.source}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{rec.reason}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-xs text-slate-500">Correlation</p>
                        <p className="text-lg font-mono font-semibold">{(rec.correlation * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {canApprove(selected.status) && (
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleReject(selected.id)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => handleApprove(selected.id, selectedReplacement || undefined)}
                disabled={actionLoading || selected.wash_sale_status === 'in_window'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                <Check className="h-4 w-4" />
                Approve Harvest
                {selectedReplacement && (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <span>{selectedReplacement}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ WASH SALES TAB ════════════════════ */}
      {tab === 'wash_sales' && (
        <div className="space-y-4">
          {loadingWash ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : washSales.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <Shield className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No active wash sale windows</p>
              <p className="text-sm text-slate-500 mt-1">Executed harvests will create 61-day monitoring windows</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Symbol</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Sale Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Window</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Loss</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Watch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {washSales.map(ws => (
                    <tr key={ws.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{ws.symbol}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{fmtDate(ws.sale_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {fmtDate(ws.window_start)} – {fmtDate(ws.window_end)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-red-600">
                        {fmtCurrency(ws.loss_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {(ws.watch_symbols || []).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {ws.status === 'in_window' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                            <Clock className="h-3 w-3" />
                            Active
                          </span>
                        )}
                        {ws.status === 'clear' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <Check className="h-3 w-3" />
                            Clear
                          </span>
                        )}
                        {ws.status === 'violated' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <AlertTriangle className="h-3 w-3" />
                            Violated
                          </span>
                        )}
                        {ws.status === 'adjusted' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Adjusted
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
