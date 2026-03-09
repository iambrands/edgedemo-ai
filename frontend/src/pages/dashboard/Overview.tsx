import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Users, Briefcase, AlertTriangle, Activity, RefreshCw, Lightbulb } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { dashboardApi, type DashboardSummary } from '../../services/api';
import { formatCurrency } from '../../utils/format';
import { clsx } from 'clsx';
import { DataFreshnessIndicator } from '../../components/dashboard/DataFreshnessIndicator';
import { RecommendationCard, type Recommendation } from '../../components/dashboard/RecommendationCard';

function RecommendationsPanel() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecs = useCallback(async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('edgeai_token') || sessionStorage.getItem('edgeai_token');
      const res = await fetch(`${apiBase}/api/v1/clients/current/recommendations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setRecs(await res.json());
    } catch { /* graceful degradation */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecs(); }, [fetchRecs]);

  if (loading) return null;
  if (!recs.length) return null;

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-slate-900">AI Recommendations</h2>
        <Badge variant="blue">{recs.length}</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {recs.map(rec => (
          <RecommendationCard key={rec.rec_id} recommendation={rec} onAction={fetchRecs} />
        ))}
      </div>
    </Card>
  );
}

export function Overview() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await dashboardApi.getSummary();
      setData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'attention':
        return <Badge variant="red">Attn</Badge>;
      case 'rebalance':
        return <Badge variant="amber">Rebal</Badge>;
      case 'good':
        return <Badge variant="green">Good</Badge>;
      default:
        return <Badge variant="gray">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Dashboard" subtitle="Welcome back. Here's your practice at a glance." />
        <DataFreshnessIndicator />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          label="Total AUM"
          value={formatCurrency(data.kpis.totalAUM, { abbreviated: true })}
          icon={<DollarSign size={18} />}
          color="blue"
        />
        <MetricCard
          label="Households"
          value={String(data.kpis.householdCount)}
          icon={<Users size={18} />}
          color="emerald"
        />
        <MetricCard
          label="Accounts"
          value={String(data.kpis.accountCount)}
          icon={<Briefcase size={18} />}
          color="blue"
        />
        <MetricCard
          label="Active Alerts"
          value={String(data.kpis.alertCount)}
          icon={<AlertTriangle size={18} />}
          color="amber"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900">Active Alerts</h2>
          </div>
          <div className="space-y-4">
            {data.alerts.map((alert) => (
              <div
                key={alert.id}
                className={clsx(
                  'flex items-start gap-3 p-3 rounded-lg border-l-4',
                  alert.severity === 'high' && 'border-l-red-500 bg-red-50/30',
                  alert.severity === 'medium' && 'border-l-amber-500 bg-amber-50/30',
                  alert.severity === 'low' && 'border-l-emerald-500 bg-emerald-50/30'
                )}
              >
                <div
                  className={clsx(
                    'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                    alert.severity === 'high' && 'bg-red-500',
                    alert.severity === 'medium' && 'bg-amber-500',
                    alert.severity === 'low' && 'bg-emerald-500'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{alert.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <div className="space-y-4">
            {data.recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="border-b border-slate-100 pb-3 last:border-0">
                <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                <p className="text-sm text-slate-500">{activity.detail}</p>
                <p className="text-xs text-slate-500 mt-1">{activity.date}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AI Recommendations (IMM-06) */}
      <RecommendationsPanel />

      {/* Household Overview Table */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Household Overview</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Household</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Accts</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Analysis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.households.map((household) => (
              <TableRow key={household.id}>
                <TableCell className="font-medium">{household.name}</TableCell>
                <TableCell>{household.members.join(', ')}</TableCell>
                <TableCell>{formatCurrency(household.totalValue)}</TableCell>
                <TableCell>{household.accounts}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full',
                          household.riskScore > 60 ? 'bg-red-500' : household.riskScore > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                        )}
                        style={{ width: `${household.riskScore}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{household.riskScore}</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(household.status)}</TableCell>
                <TableCell className="text-slate-500">
                  {household.lastAnalysis?.slice(5) ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
