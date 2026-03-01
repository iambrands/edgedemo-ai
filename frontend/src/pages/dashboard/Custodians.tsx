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
import { formatCurrency, formatNumber, formatPercent, formatDate } from '../../utils/format';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import { SearchInput } from '../../components/ui/SearchInput';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../contexts/ToastContext';
import { CHART_COLORS } from '../../constants/chartTheme';

// ============================================================================
// HELPERS
// ============================================================================

const STATUS_CFG: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  connected: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  pending:   { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  expired:   { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
  revoked:   { bg: 'bg-slate-100', text: 'text-slate-700', icon: AlertTriangle },
  error:     { bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle },
};


type TabKey = 'connections' | 'portfolio' | 'accounts' | 'transactions';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Custodians() {
  const { success: toastSuccess, error: toastError } = useToast();
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
      setPlatforms(Array.isArray(plats) ? plats : []);
      setConnections(Array.isArray(conns) ? conns : []);
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
      toastSuccess('Custodian disconnected');
    } catch (err) {
      console.error(err);
      toastError('Failed to disconnect custodian');
    }
  };

  const handleSync = async (id: string) => {
    setSyncing(id);
    try {
      await triggerSync(id);
      await loadConnections();
      toastSuccess('Sync completed');
    } catch (err) {
      console.error(err);
      toastError('Sync failed');
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
      <PageHeader
        title="Multi-Custodian Aggregation"
        subtitle="Connect custodians, sync data, and view unified portfolio"
        actions={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>{connections.filter(c => c.status === 'connected').length} connected</span>
            <span className="text-slate-400">|</span>
            <span>{accounts.length || '—'} accounts</span>
          </div>
        }
      />

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-semibold">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
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
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
          ) : (
            <>
              {connections.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                    My Connections
                  </h2>
                  {connections.map(conn => {
                    const cfg = STATUS_CFG[conn.status] || STATUS_CFG.error;
                    const StatusIcon = cfg.icon;
                    return (
                      <div
                        key={conn.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between"
                      >
                        <div>
                          <h3 className="font-semibold text-slate-900">
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
                              <span className="text-xs text-slate-500">
                                Synced {formatDate(conn.last_sync_at, 'relative')}
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
                            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  Available Custodians
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {platforms.map(p => {
                    const connected = connectedTypes.has(p.custodian_type);
                    return (
                      <div
                        key={p.id}
                        className="bg-white border border-slate-200 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {p.display_name}
                            </h3>
                            <div className="flex gap-2 mt-1">
                              {p.supports_oauth && (
                                <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
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
                            <div className="flex items-center text-emerald-600 text-sm font-medium">
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
                <div className="text-center py-16 text-slate-500">
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
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  label="Total Market Value"
                  value={formatCurrency(posTotal)}
                  icon={<TrendingUp size={18} />}
                  color="amber"
                />
                <MetricCard
                  label="Positions"
                  value={String(positions.length)}
                  icon={<Briefcase size={18} />}
                  color="blue"
                />
                <MetricCard
                  label="Asset Classes"
                  value={String(allocation?.allocation.length || 0)}
                  icon={<PieChart size={18} />}
                  color="indigo"
                />
              </div>

              {/* Asset Allocation */}
              {allocation && allocation.allocation.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">
                    Asset Allocation
                  </h2>
                  {/* Horizontal stacked bar */}
                  <div className="h-8 rounded-full overflow-hidden flex mb-4">
                    {allocation.allocation.map((a, i) => (
                      <div
                        key={a.asset_class}
                        style={{
                          width: `${a.percentage}%`,
                          backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                        title={`${a.asset_class.replace(/_/g, ' ')} — ${formatPercent(a.percentage, { decimals: 1, showSign: false })}`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {allocation.allocation.map((a, i) => (
                      <div key={a.asset_class} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                        <span className="text-sm text-slate-700 capitalize truncate">
                          {a.asset_class.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-mono text-slate-500 ml-auto">
                          {formatPercent(a.percentage, { decimals: 1, showSign: false })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unified Positions Table */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Unified Holdings
                    </h2>
                    <p className="text-sm text-slate-500">
                      {positions.length} positions &middot; {formatCurrency(posTotal)}
                    </p>
                  </div>
                  <SearchInput
                    placeholder="Search..."
                    value={posSearch}
                    onChange={e => setPosSearch(e.target.value)}
                    className="w-48"
                    inputSize="sm"
                  />
                </div>
                {filteredPositions.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 text-sm">
                    {positions.length === 0
                      ? 'No positions synced yet. Connect a custodian and sync data.'
                      : 'No positions match your search.'}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Asset Class</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Market Value</TableHead>
                        <TableHead className="text-right">Gain/Loss</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPositions.map(pos => {
                        const gl = pos.unrealized_gain_loss ?? 0;
                        const isGain = gl >= 0;
                        return (
                          <TableRow key={pos.symbol}>
                            <TableCell className="font-medium text-slate-900">
                              {pos.symbol}
                            </TableCell>
                            <TableCell className="text-slate-600 truncate max-w-[200px]">
                              {pos.security_name}
                            </TableCell>
                            <TableCell>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs capitalize">
                                {pos.asset_class.replace(/_/g, ' ')}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatNumber(pos.total_quantity, 2)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(pos.total_market_value)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono ${
                                isGain ? 'text-emerald-600' : 'text-red-600'
                              }`}
                            >
                              <span className="inline-flex items-center gap-1">
                                {isGain ? (
                                  <TrendingUp size={14} />
                                ) : (
                                  <TrendingDown size={14} />
                                )}
                                {formatCurrency(Math.abs(gl))}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
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
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
          ) : (
            <>
              {/* KPI */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  label="Total Market Value"
                  value={formatCurrency(totalMV)}
                  icon={<TrendingUp size={18} />}
                  color="amber"
                />
                <MetricCard
                  label="Total Cash"
                  value={formatCurrency(totalCash)}
                  icon={<Briefcase size={18} />}
                  color="emerald"
                />
                <MetricCard
                  label="Accounts"
                  value={String(accounts.length)}
                  icon={<Briefcase size={18} />}
                  color="blue"
                />
              </div>

              {/* Account List */}
              {accounts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
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
                      className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {a.account_name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          <span>{a.custodian_name}</span>
                          <span className="text-slate-400">|</span>
                          <span className="capitalize">
                            {a.account_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-slate-400">|</span>
                          <span className="capitalize">{a.tax_status.replace(/_/g, ' ')}</span>
                        </div>
                        {a.client_id && (
                          <span className="inline-block mt-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            Client mapped
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold text-slate-900">
                          {formatCurrency(a.market_value)}
                        </p>
                        <p className="text-sm text-slate-500 font-mono">
                          {formatCurrency(a.cash_balance)} cash
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
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
          ) : txns.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              <ArrowRightLeft size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No transactions</p>
              <p className="text-sm">
                Sync a custodian connection to see transaction history.
              </p>
            </div>
          ) : (
            <>
              <Card size="sm" className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Custodian</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {txns.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(t.trade_date)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                              t.transaction_type === 'buy'
                                ? 'bg-emerald-50 text-emerald-700'
                                : t.transaction_type === 'sell'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.transaction_type}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {t.symbol || '—'}
                        </TableCell>
                        <TableCell className="text-slate-600 truncate max-w-[140px]">
                          {t.account_name}
                        </TableCell>
                        <TableCell className="text-slate-500">{t.custodian}</TableCell>
                        <TableCell className="text-right font-mono">
                          {t.quantity != null ? formatNumber(t.quantity, 2) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(t.net_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Pagination */}
              {txnPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    Page {txnPage} of {txnPages} &middot; {txnTotal} transactions
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTxnPage(p => Math.max(1, p - 1))}
                      disabled={txnPage <= 1}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setTxnPage(p => Math.min(txnPages, p + 1))}
                      disabled={txnPage >= txnPages}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
