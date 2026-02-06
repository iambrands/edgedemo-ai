import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Target, FileText, BarChart3, Settings, LogOut, Bell, 
  TrendingUp, Building2, ChevronRight, X
} from 'lucide-react';
import { 
  getDashboard, getNudges, dismissNudge, portalLogout,
  getPortalClientName, getBranding,
  DashboardData, Nudge, BrandingConfig 
} from '../../services/portalApi';

export default function PortalDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleLogout = async () => {
    try {
      await portalLogout();
    } finally {
      navigate('/portal/login');
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);

  const formatPercent = (val: number) =>
    `${val >= 0 ? '+' : ''}${(val * 100).toFixed(1)}%`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  const clientName = data?.client_name?.split(' ')[0] || getPortalClientName()?.split(' ')[0] || 'there';
  const primaryColor = branding?.primary_color || '#1a56db';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {branding?.logo_url ? (
              <img src={branding.logo_url} alt="Logo" className="h-8" />
            ) : (
              <h1 className="text-xl font-bold" style={{ color: primaryColor }}>
                {branding?.portal_title || 'Client Portal'}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:text-gray-700">
              <Bell className="w-5 h-5" />
              {nudges.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              Welcome back, {clientName}
            </h2>
            <p className="text-gray-500">Here's your portfolio overview</p>
          </div>
          {data?.advisor_name && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Building2 className="w-4 h-4" />
              <span>Advisor: {data.advisor_name}</span>
            </div>
          )}
        </div>

        {/* Portfolio Summary Card */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Total Portfolio Value</p>
              <p className="text-4xl font-bold text-gray-900">
                {formatCurrency(data?.total_value || 0)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className={`w-4 h-4 ${(data?.ytd_return || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`font-medium ${(data?.ytd_return || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(data?.ytd_return || 0)} YTD
                </span>
                <span className="text-gray-400">
                  ({formatCurrency(data?.ytd_return_dollar || 0)})
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              <p>Last updated</p>
              <p className="font-medium text-gray-700">
                {data?.last_updated ? new Date(data.last_updated).toLocaleDateString() : 'Today'}
              </p>
            </div>
          </div>
        </div>

        {/* Nudges / Action Items */}
        {nudges.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-500" />
              Action Items
            </h3>
            {nudges.map((nudge) => (
              <div
                key={nudge.id}
                className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex justify-between items-start"
              >
                <div className="flex-1">
                  <p className="font-medium text-yellow-800">{nudge.title}</p>
                  <p className="text-sm text-yellow-700 mt-1">{nudge.message}</p>
                  {nudge.action_label && nudge.action_url && (
                    <Link 
                      to={nudge.action_url}
                      className="inline-flex items-center gap-1 text-sm font-medium text-yellow-800 mt-2 hover:underline"
                    >
                      {nudge.action_label}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
                <button
                  onClick={() => handleDismiss(nudge.id)}
                  className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Accounts Grid */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Your Accounts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.accounts.map((account) => (
              <div key={account.id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{account.account_name}</p>
                    <p className="text-sm text-gray-500">{account.account_type}</p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                    {account.tax_type}
                  </span>
                </div>
                <p className="text-2xl font-semibold text-gray-900 mt-4">
                  {formatCurrency(account.current_value)}
                </p>
                {account.custodian && (
                  <p className="text-xs text-gray-400 mt-2">{account.custodian}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/portal/goals"
            className="bg-white rounded-xl shadow-sm p-5 text-center hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto group-hover:bg-blue-200 transition-colors">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <p className="font-medium text-gray-900 mt-3">Goals</p>
            <p className="text-sm text-gray-500">{data?.active_goals || 0} active</p>
          </Link>

          <div className="bg-white rounded-xl shadow-sm p-5 text-center opacity-60">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6 text-gray-500" />
            </div>
            <p className="font-medium text-gray-900 mt-3">Documents</p>
            <p className="text-sm text-gray-500">Coming soon</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 text-center opacity-60">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <BarChart3 className="w-6 h-6 text-gray-500" />
            </div>
            <p className="font-medium text-gray-900 mt-3">Updates</p>
            <p className="text-sm text-gray-500">{data?.unread_narratives || 0} new</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 text-center opacity-60">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <Settings className="w-6 h-6 text-gray-500" />
            </div>
            <p className="font-medium text-gray-900 mt-3">Settings</p>
            <p className="text-sm text-gray-500">Coming soon</p>
          </div>
        </div>

        {/* Footer */}
        {branding?.footer_text && (
          <div className="text-center text-sm text-gray-400 pt-6 border-t">
            {branding.footer_text}
          </div>
        )}
      </main>
    </div>
  );
}
