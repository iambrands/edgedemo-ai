/**
 * Multi-Custodian Aggregation Dashboard.
 *
 * Tabs:
 *  1. Connections – connect custodians, view status, trigger sync
 *  2. Portfolio   – unified positions + asset allocation
 *  3. Accounts    – all custodian accounts with mapping
 *  4. Transactions – filterable transaction ledger
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  TrendingUp,
  TrendingDown,
  Briefcase,
  PieChart,
  ArrowRightLeft,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  getAvailableCustodians,
  listConnections,
  initiateConnection,
  disconnectCustodian,
  triggerSync,
  listAccounts,
  getPositions,
  getAllocation,
  getTransactions,
  type CustodianPlatform,
  type CustodianConnection,
  type CustodianAccount,
  type UnifiedPosition,
  type AssetAllocation,
  type CustodianTransaction,
} from '../../services/custodianApi';

// ============================================================================
// HELPERS
// ============================================================================

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtNumber(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const STATUS_CFG: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  connected: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  pending:   { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  expired:   { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
  revoked:   { bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertTriangle },
  error:     { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
};

const ALLOC_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#6366F1', '#14B8A6', '#F97316',
  '#06B6D4', '#EF4444', '#84CC16', '#A855F7',
];

type TabKey = 'connections' | 'portfolio' | 'accounts' | 'transactions';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Custodians() {
  const [tab, setTab] = useState<TabKey>('connections');
  const [error, setError] = useState<string | null>(null);

  // ── Connections state ─────────────────────────────────────
  const [platforms, setPlatforms] = useState<CustodianPlatform[]>([]);
  const [connections, setConnections] = useState<CustodianConnection[]>([]);
  const [loadingConn, setLoadingConn] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  // ── Accounts state ────────────────────────────────────────
  const [accounts, setAccounts] = useState<CustodianAccount[]>([]);
  const [totalMV, setTotalMV] = useState(0);
  const [totalCash, setTotalCash] = useState(0);
  const [loadingAccts, setLoadingAccts] = useState(false);

  // ── Portfolio state ───────────────────────────────────────
  const [positions, setPositions] = useState<UnifiedPosition[]>([]);
  const [posTotal, setPosTotal] = useState(0);
  const [allocation, setAllocation] = useState<AssetAllocation | null>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [posSearch, setPosSearch] = useState('');

  // ── Transactions state ────────────────────────────────────
  const [txns, setTxns] = useState<CustodianTransaction[]>([]);
  const [txnTotal, setTxnTotal] = useState(0);
  const [txnPage, setTxnPage] = useState(1);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const txnPageSize = 25;

  // ── Load connections + platforms ───────────────────────────
  const loadConnections = useCallback(async () => {
    setLoadingConn(true);
    setError(null);
    try {
      const [plats, conns] = await Promise.all([
        getAvailableCustodians(),
        listConnections(),
      ]);
      setPlatforms(plats);
      setConnections(conns);
    } catch (err) {
      console.error(err);
      setError('Failed to load custodian data');
    } finally {
      setLoadingConn(false);
    }
  }, []);

  useEffect(() => { loadConnections(); }, [loadConnections]);

  // ── Load accounts when tab activates ──────────────────────
  const loadAccounts = useCallback(async () => {
    setLoadingAccts(true);
    try {
      const data = await listAccounts();
      setAccounts(data?.accounts ?? []);
      setTotalMV(data?.total_market_value ?? 0);
      setTotalCash(data?.total_cash_balance ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAccts(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'accounts') loadAccounts();
  }, [tab, loadAccounts]);

  // ── Load portfolio when tab activates ─────────────────────
  const loadPortfolio = useCallback(async () => {
    setLoadingPortfolio(true);
    try {
      const [posData, allocData] = await Promise.all([
        getPositions(),
        getAllocation(),
      ]);
      setPositions(posData?.positions ?? []);
      setPosTotal(posData?.total_market_value ?? 0);
      setAllocation(allocData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPortfolio(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'portfolio') loadPortfolio();
  }, [tab, loadPortfolio]);

  // ── Load transactions when tab activates ──────────────────
  const loadTransactions = useCallback(async () => {
    setLoadingTxns(true);
    try {
      const data = await getTransactions({ page: txnPage, page_size: txnPageSize });
      setTxns(data?.transactions ?? []);
      setTxnTotal(data?.total ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTxns(false);
    }
  }, [txnPage]);

  useEffect(() => {
    if (tab === 'transactions') loadTransactions();
  }, [tab, loadTransactions]);

  // ── Actions ───────────────────────────────────────────────
  const handleConnect = async (type: string) => {
    try {
      localStorage.setItem('oauth_custodian_type', type);
      const resp = await initiateConnection(
        type as CustodianPlatform['custodian_type'],
        `${window.location.origin}/dashboard/custodians`,
      );
      window.location.href = resp.authorization_url;
    } catch (err) {
      console.error(err);
      setError('Failed to initiate connection');
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await disconnectCustodian(id);
      await loadConnections();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSync = async (id: string) => {
    setSyncing(id);
    try {
      await triggerSync(id);
      await loadConnections();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(null);
    }
  };

  // ── Computed ──────────────────────────────────────────────
  const connectedTypes = new Set(
    connections.filter(c => c.status === 'connected').map(c => c.custodian_type),
  );

  const filteredPositions = positions.filter(
    p =>
      p.symbol.toLowerCase().includes(posSearch.toLowerCase()) ||
      p.security_name.toLowerCase().includes(posSearch.toLowerCase()),
  );

  const txnPages = Math.ceil(txnTotal / txnPageSize);

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  const TABS: { key: TabKey; label: string; icon: typeof Link2 }[] = [
    { key: 'connections', label: 'Connections', icon: Link2 },
    { key: 'portfolio', label: 'Portfolio', icon: PieChart },
    { key: 'accounts', label: 'Accounts', icon: Briefcase },
    { key: 'transactions', label: 'Transactions', icon: ArrowRightLeft },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Multi-Custodian Aggregation
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Connect custodians, sync data, and view unified portfolio
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{connections.filter(c => c.status === 'connected').length} connected</span>
          <span className="text-gray-400">|</span>
          <span>{accounts.length || '—'} accounts</span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-semibold">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB: Connections ─────────────────────────────────── */}
      {tab === 'connections' && (
        <div className="space-y-6">
          {/* Active Connections */}
          {loadingConn ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              {connections.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    My Connections
                  </h2>
                  {connections.map(conn => {
                    const cfg = STATUS_CFG[conn.status] || STATUS_CFG.error;
                    const StatusIcon = cfg.icon;
                    return (
                      <div
                        key={conn.id}
                        className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between"
                      >
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {conn.custodian_name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
                            >
                              <StatusIcon size={12} />
                              {conn.status}
                            </span>
                            {conn.last_sync_at && (
                              <span className="text-xs text-gray-500">
                                Synced {timeAgo(conn.last_sync_at)}
                              </span>
                            )}
                          </div>
                          {conn.last_error && (
                            <p className="text-xs text-red-600 mt-1 max-w-md truncate">
                              {conn.last_error}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSync(conn.id)}
                            disabled={
                              conn.status !== 'connected' || syncing === conn.id
                            }
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Sync now"
                          >
                            <RefreshCw
                              size={16}
                              className={syncing === conn.id ? 'animate-spin' : ''}
                            />
                          </button>
                          <button
                            onClick={() => handleDisconnect(conn.id)}
                            className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                            title="Disconnect"
                          >
                            <Unlink size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Available Custodians */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Available Custodians
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {platforms.map(p => {
                    const connected = connectedTypes.has(p.custodian_type);
                    return (
                      <div
                        key={p.id}
                        className="bg-white border border-gray-200 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {p.display_name}
                            </h3>
                            <div className="flex gap-2 mt-1">
                              {p.supports_oauth && (
                                <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                  OAuth
                                </span>
                              )}
                              {p.supports_realtime && (
                                <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                  Real-time
                                </span>
                              )}
                            </div>
                            {p.maintenance_message && (
                              <p className="text-xs text-amber-600 mt-2">
                                {p.maintenance_message}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-4">
                          {connected ? (
                            <div className="flex items-center text-green-600 text-sm font-medium">
                              <CheckCircle size={16} className="mr-1.5" />
                              Connected
                            </div>
                          ) : (
                            <button
                              onClick={() => handleConnect(p.custodian_type)}
                              disabled={!p.is_active}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Link2 size={16} />
                              Connect
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Empty state */}
              {platforms.length === 0 && connections.length === 0 && (
                <div className="text-center py-16 text-gray-500">
                  <Link2 size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No custodians available</p>
                  <p className="text-sm">Custodian integrations are being configured.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: Portfolio ───────────────────────────────────── */}
      {tab === 'portfolio' && (
        <div className="space-y-6">
          {loadingPortfolio ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Market Value</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {fmtCurrency(posTotal)}
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl">
                      <TrendingUp className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Positions</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {positions.length}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <Briefcase className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Asset Classes</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {allocation?.allocation.length || 0}
                      </p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-xl">
                      <PieChart className="h-6 w-6 text-indigo-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Asset Allocation */}
              {allocation && allocation.allocation.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Asset Allocation
                  </h2>
                  {/* Horizontal stacked bar */}
                  <div className="h-8 rounded-full overflow-hidden flex mb-4">
                    {allocation.allocation.map((a, i) => (
                      <div
                        key={a.asset_class}
                        style={{
                          width: `${a.percentage}%`,
                          backgroundColor: ALLOC_COLORS[i % ALLOC_COLORS.length],
                        }}
                        title={`${a.asset_class.replace(/_/g, ' ')} — ${fmtPct(a.percentage)}`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {allocation.allocation.map((a, i) => (
                      <div key={a.asset_class} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: ALLOC_COLORS[i % ALLOC_COLORS.length],
                          }}
                        />
                        <span className="text-sm text-gray-700 capitalize truncate">
                          {a.asset_class.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-mono text-gray-500 ml-auto">
                          {fmtPct(a.percentage)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unified Positions Table */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Unified Holdings
                    </h2>
                    <p className="text-sm text-gray-500">
                      {positions.length} positions &middot; {fmtCurrency(posTotal)}
                    </p>
                  </div>
                  <div className="relative">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={posSearch}
                      onChange={e => setPosSearch(e.target.value)}
                      className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
                {filteredPositions.length === 0 ? (
                  <p className="text-center py-8 text-gray-500 text-sm">
                    {positions.length === 0
                      ? 'No positions synced yet. Connect a custodian and sync data.'
                      : 'No positions match your search.'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                          <th className="px-4 py-3">Symbol</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Asset Class</th>
                          <th className="px-4 py-3 text-right">Qty</th>
                          <th className="px-4 py-3 text-right">Market Value</th>
                          <th className="px-4 py-3 text-right">Gain/Loss</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredPositions.map(pos => {
                          const gl = pos.unrealized_gain_loss ?? 0;
                          const isGain = gl >= 0;
                          return (
                            <tr key={pos.symbol} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {pos.symbol}
                              </td>
                              <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">
                                {pos.security_name}
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs capitalize">
                                  {pos.asset_class.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-mono">
                                {fmtNumber(pos.total_quantity)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono">
                                {fmtCurrency(pos.total_market_value)}
                              </td>
                              <td
                                className={`px-4 py-3 text-right font-mono ${
                                  isGain ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                <span className="inline-flex items-center gap-1">
                                  {isGain ? (
                                    <TrendingUp size={14} />
                                  ) : (
                                    <TrendingDown size={14} />
                                  )}
                                  {fmtCurrency(Math.abs(gl))}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: Accounts ────────────────────────────────────── */}
      {tab === 'accounts' && (
        <div className="space-y-6">
          {loadingAccts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              {/* KPI */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Total Market Value</p>
                  <p className="text-2xl font-semibold">{fmtCurrency(totalMV)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Total Cash</p>
                  <p className="text-2xl font-semibold">{fmtCurrency(totalCash)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-sm text-gray-500">Accounts</p>
                  <p className="text-2xl font-semibold">{accounts.length}</p>
                </div>
              </div>

              {/* Account List */}
              {accounts.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
                  <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No accounts synced</p>
                  <p className="text-sm">
                    Connect a custodian and sync to see accounts.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map(a => (
                    <div
                      key={a.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {a.account_name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>{a.custodian_name}</span>
                          <span className="text-gray-400">|</span>
                          <span className="capitalize">
                            {a.account_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-gray-400">|</span>
                          <span className="capitalize">{a.tax_status.replace(/_/g, ' ')}</span>
                        </div>
                        {a.client_id && (
                          <span className="inline-block mt-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            Client mapped
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold text-gray-900">
                          {fmtCurrency(a.market_value)}
                        </p>
                        <p className="text-sm text-gray-500 font-mono">
                          {fmtCurrency(a.cash_balance)} cash
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: Transactions ────────────────────────────────── */}
      {tab === 'transactions' && (
        <div className="space-y-4">
          {loadingTxns ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : txns.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
              <ArrowRightLeft size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No transactions</p>
              <p className="text-sm">
                Sync a custodian connection to see transaction history.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-slate-50 border-b border-gray-200 sticky top-0">
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Symbol</th>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3">Custodian</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {txns.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(t.trade_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              t.transaction_type === 'buy'
                                ? 'bg-green-50 text-green-700'
                                : t.transaction_type === 'sell'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {t.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {t.symbol || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 truncate max-w-[140px]">
                          {t.account_name}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{t.custodian}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {t.quantity != null ? fmtNumber(t.quantity) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {fmtCurrency(t.net_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {txnPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Page {txnPage} of {txnPages} &middot; {txnTotal} transactions
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTxnPage(p => Math.max(1, p - 1))}
                      disabled={txnPage <= 1}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setTxnPage(p => Math.min(txnPages, p + 1))}
                      disabled={txnPage >= txnPages}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
