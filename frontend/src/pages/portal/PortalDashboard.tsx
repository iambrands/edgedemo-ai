import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Target,
  FileText,
  BarChart3,
  Settings,
  TrendingUp,
  TrendingDown,
  Building2,
  ChevronRight,
  ChevronDown,
  X,
  Bell,
  DollarSign,
  PieChart,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import PortalNav from '../../components/portal/PortalNav';
import {
  getDashboard,
  getNudges,
  dismissNudge,
  getPortalClientName,
  getBranding,
  DashboardData,
  Nudge,
  BrandingConfig,
} from '../../services/portalApi';

interface Position {
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  value: number;
  cost_basis: number;
  gain_loss: number;
  gain_pct: number;
  asset_class: string;
}

export default function PortalDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, Position[]>>({});
  const [loadingPositions, setLoadingPositions] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardData, nudgesData, brandingData] = await Promise.all([
        getDashboard(),
        getNudges(),
        getBranding().catch(() => null),
      ]);
      setData(dashboardData);
      setNudges(nudgesData);
      if (brandingData) setBranding(brandingData);
      // Sync client name to localStorage so PortalNav and other pages show correct name
      if (dashboardData.client_name) {
        localStorage.setItem('portal_client_name', dashboardData.client_name);
      }
      if (dashboardData.firm_name) {
        localStorage.setItem('portal_firm_name', dashboardData.firm_name);
      }
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissNudge(id);
      setNudges(nudges.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to dismiss nudge', err);
    }
  };

  const handleExpandAccount = async (accountId: string) => {
    if (expandedAccount === accountId) {
      setExpandedAccount(null);
      return;
    }
    setExpandedAccount(accountId);
    if (!positions[accountId]) {
      setLoadingPositions(accountId);
      try {
        const apiBase = import.meta.env.VITE_API_URL || '';
        const token = localStorage.getItem('portal_token');
        const res = await fetch(`${apiBase}/api/v1/portal/accounts/${accountId}/positions`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setPositions((prev) => ({ ...prev, [accountId]: data }));
        }
      } catch (err) {
        console.error('Failed to load positions', err);
      } finally {
        setLoadingPositions(null);
      }
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: val >= 1000 ? 0 : 2,
    }).format(val);

  const formatPercent = (val: number) =>
    `${val >= 0 ? '+' : ''}${(val * 100).toFixed(1)}%`;

  const formatGainPct = (val: number) =>
    `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;

  const getNudgeStyle = (type: string) => {
    switch (type) {
      case 'concentration':
        return 'border-l-red-500 bg-red-50';
      case 'fee':
        return 'border-l-amber-500 bg-amber-50';
      case 'planning':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-yellow-500 bg-yellow-50';
    }
  };

  const getNudgeIcon = (type: string) => {
    switch (type) {
      case 'concentration':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'fee':
        return <DollarSign className="w-5 h-5 text-amber-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-slate-500">Loading your portfolio...</p>
          </div>
        </div>
      </div>
    );
  }

  const clientName =
    data?.client_name?.split(' ')[0] || getPortalClientName()?.split(' ')[0] || 'there';

  // Calculate aggregate stats
  const totalGain = (data?.ytd_return_dollar || 0);
  const accountCount = data?.accounts.length || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalNav nudgeCount={nudges.length} firmName={branding?.portal_title || data?.firm_name} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Welcome + Advisor */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Dashboard — Welcome back, {clientName}
            </h1>
            <p className="text-slate-500">Wilson Household Overview</p>
          </div>
          {data?.advisor_name && (
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-white rounded-lg px-4 py-2 border border-slate-200">
              <Building2 className="w-4 h-4" />
              <span>
                Your Advisor: <strong className="text-slate-700">{data.advisor_name}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Portfolio</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {formatCurrency(data?.total_value || 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <PieChart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">YTD Return</p>
                <p className={`text-2xl font-bold mt-1 ${(data?.ytd_return || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatPercent(data?.ytd_return || 0)}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${(data?.ytd_return || 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {(data?.ytd_return || 0) >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              {formatCurrency(totalGain)} gain
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Accounts</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{accountCount}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl">
                <DollarSign className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-2">across {new Set(data?.accounts.map(a => a.custodian)).size} custodians</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Active Goals</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{data?.active_goals || 0}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <Link to="/portal/goals" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
              View goals →
            </Link>
          </div>
        </div>

        {/* Action Items / Nudges */}
        {nudges.length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Action Items
              <span className="text-sm font-normal text-slate-400">({nudges.length})</span>
            </h3>
            <div className="space-y-3">
              {nudges.map((nudge) => (
                <div
                  key={nudge.id}
                  className={`border-l-4 rounded-r-xl rounded-l p-4 flex items-start gap-3 ${getNudgeStyle(nudge.nudge_type)}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getNudgeIcon(nudge.nudge_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{nudge.title}</p>
                    <p className="text-sm text-slate-600 mt-1">{nudge.message}</p>
                    {nudge.action_label && nudge.action_url && (
                      <Link
                        to={nudge.action_url}
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 mt-2 hover:underline"
                      >
                        {nudge.action_label}
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                  <button
                    onClick={() => handleDismiss(nudge.id)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Accounts with Expandable Holdings */}
        <div>
          <h3 className="font-semibold text-slate-900 mb-4">Your Accounts & Holdings</h3>
          <div className="space-y-3">
            {data?.accounts.map((account) => {
              const isExpanded = expandedAccount === account.id;
              const acctPositions = positions[account.id] || [];
              const isLoading = loadingPositions === account.id;
              const pctOfTotal = data.total_value > 0 ? (account.current_value / data.total_value) * 100 : 0;

              return (
                <div
                  key={account.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  {/* Account Header */}
                  <button
                    onClick={() => handleExpandAccount(account.id)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-slate-900">{account.account_name}</p>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                          {account.tax_type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {account.account_type} · {account.custodian}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold text-slate-900">
                        {formatCurrency(account.current_value)}
                      </p>
                      <p className="text-sm text-slate-400">{pctOfTotal.toFixed(1)}% of portfolio</p>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Holdings Table */}
                  {isExpanded && (
                    <div className="border-t border-slate-100">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                        </div>
                      ) : acctPositions.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm">
                          No positions data available
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="text-left px-5 py-3 font-medium text-slate-500">Symbol</th>
                                <th className="text-left px-5 py-3 font-medium text-slate-500">Name</th>
                                <th className="text-right px-5 py-3 font-medium text-slate-500">Shares</th>
                                <th className="text-right px-5 py-3 font-medium text-slate-500">Price</th>
                                <th className="text-right px-5 py-3 font-medium text-slate-500">Value</th>
                                <th className="text-right px-5 py-3 font-medium text-slate-500">Cost Basis</th>
                                <th className="text-right px-5 py-3 font-medium text-slate-500">Gain/Loss</th>
                                <th className="text-left px-5 py-3 font-medium text-slate-500">Asset Class</th>
                              </tr>
                            </thead>
                            <tbody>
                              {acctPositions.map((pos) => (
                                <tr
                                  key={pos.symbol}
                                  className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors"
                                >
                                  <td className="px-5 py-3 font-mono font-semibold text-slate-900">
                                    {pos.symbol}
                                  </td>
                                  <td className="px-5 py-3 text-slate-600 max-w-[200px] truncate">
                                    {pos.name}
                                  </td>
                                  <td className="px-5 py-3 text-right text-slate-700">
                                    {pos.quantity.toLocaleString()}
                                  </td>
                                  <td className="px-5 py-3 text-right text-slate-700">
                                    {formatCurrency(pos.price)}
                                  </td>
                                  <td className="px-5 py-3 text-right font-medium text-slate-900">
                                    {formatCurrency(pos.value)}
                                  </td>
                                  <td className="px-5 py-3 text-right text-slate-500">
                                    {formatCurrency(pos.cost_basis)}
                                  </td>
                                  <td className="px-5 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {pos.gain_loss >= 0 ? (
                                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                                      ) : (
                                        <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                                      )}
                                      <span
                                        className={`font-medium ${
                                          pos.gain_loss >= 0 ? 'text-emerald-600' : 'text-red-600'
                                        }`}
                                      >
                                        {formatCurrency(Math.abs(pos.gain_loss))}
                                      </span>
                                      <span
                                        className={`text-xs ${
                                          pos.gain_pct >= 0 ? 'text-emerald-500' : 'text-red-500'
                                        }`}
                                      >
                                        ({formatGainPct(pos.gain_pct)})
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                                      {pos.asset_class}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-50 font-medium">
                                <td className="px-5 py-3 text-slate-700" colSpan={4}>
                                  Total
                                </td>
                                <td className="px-5 py-3 text-right text-slate-900">
                                  {formatCurrency(acctPositions.reduce((s, p) => s + p.value, 0))}
                                </td>
                                <td className="px-5 py-3 text-right text-slate-500">
                                  {formatCurrency(acctPositions.reduce((s, p) => s + p.cost_basis, 0))}
                                </td>
                                <td className="px-5 py-3 text-right">
                                  {(() => {
                                    const totalGain = acctPositions.reduce((s, p) => s + p.gain_loss, 0);
                                    return (
                                      <span className={totalGain >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                        {formatCurrency(Math.abs(totalGain))}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td />
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/portal/goals"
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto group-hover:bg-purple-100 transition-colors">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <p className="font-medium text-slate-900 mt-3">Goals</p>
            <p className="text-sm text-slate-500">{data?.active_goals || 0} active</p>
          </Link>

          <Link
            to="/portal/documents"
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto group-hover:bg-indigo-100 transition-colors">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <p className="font-medium text-slate-900 mt-3">Documents</p>
            <p className="text-sm text-slate-500">View all</p>
          </Link>

          <Link
            to="/portal/updates"
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto group-hover:bg-teal-100 transition-colors">
              <BarChart3 className="w-6 h-6 text-teal-600" />
            </div>
            <p className="font-medium text-slate-900 mt-3">Updates</p>
            <p className="text-sm text-slate-500">{data?.unread_narratives || 0} new</p>
          </Link>

          <Link
            to="/portal/settings"
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center hover:shadow-md hover:border-blue-200 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto group-hover:bg-slate-200 transition-colors">
              <Settings className="w-6 h-6 text-slate-600" />
            </div>
            <p className="font-medium text-slate-900 mt-3">Settings</p>
            <p className="text-sm text-slate-500">Preferences</p>
          </Link>
        </div>

        {/* Footer */}
        {branding?.footer_text && (
          <div className="text-center text-sm text-slate-400 pt-6 border-t border-slate-200">
            {branding.footer_text}
          </div>
        )}
        {branding?.disclaimer_text && (
          <p className="text-center text-xs text-slate-300 pb-4">
            {branding.disclaimer_text}
          </p>
        )}
      </main>
    </div>
  );
}
