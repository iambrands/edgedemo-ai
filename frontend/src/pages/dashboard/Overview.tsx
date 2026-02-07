import { useState, useEffect } from 'react';
import { DollarSign, Users, Briefcase, AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { dashboardApi, type DashboardSummary } from '../../services/api';
import { clsx } from 'clsx';

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

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

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
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative">
          <div className="absolute top-4 right-4 w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm text-gray-500 mb-1">Total AUM</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.kpis.totalAUM)}</p>
        </Card>

        <Card className="relative">
          <div className="absolute top-4 right-4 w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-500" />
          </div>
          <p className="text-sm text-gray-500 mb-1">Households</p>
          <p className="text-2xl font-bold text-gray-900">{data.kpis.householdCount}</p>
        </Card>

        <Card className="relative">
          <div className="absolute top-4 right-4 w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-sm text-gray-500 mb-1">Accounts</p>
          <p className="text-2xl font-bold text-gray-900">{data.kpis.accountCount}</p>
        </Card>

        <Card className="relative">
          <div className="absolute top-4 right-4 w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-sm text-gray-500 mb-1">Active Alerts</p>
          <p className="text-2xl font-bold text-gray-900">{data.kpis.alertCount}</p>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
          </div>
          <div className="space-y-4">
            {data.alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div
                  className={clsx(
                    'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                    alert.severity === 'high' && 'bg-red-500',
                    alert.severity === 'medium' && 'bg-amber-500',
                    alert.severity === 'low' && 'bg-green-500'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{alert.date}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="space-y-4">
            {data.recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="border-b border-gray-100 pb-3 last:border-0">
                <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-500">{activity.detail}</p>
                <p className="text-xs text-gray-400 mt-1">{activity.date}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Household Overview Table */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Household Overview</h2>
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
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full',
                          household.riskScore > 60 ? 'bg-red-500' : household.riskScore > 40 ? 'bg-amber-500' : 'bg-green-500'
                        )}
                        style={{ width: `${household.riskScore}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{household.riskScore}</span>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(household.status)}</TableCell>
                <TableCell className="text-gray-500">
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
