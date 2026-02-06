import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDashboardSummary, getPerformanceData } from '../lib/api';
import MetricCard from '../components/dashboard/MetricCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import { PageContainer } from '../components/layout/PageContainer';
import {
  DollarSign,
  Users,
  Briefcase,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function formatTimeAgo(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function Dashboard() {
  const [period, setPeriod] = useState('1M');

  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  });

  const { data: performance } = useQuery({
    queryKey: ['performance', period],
    queryFn: () => getPerformanceData(period),
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => refetch()} />;
  }

  const { metrics, recent_activity, alerts, market_data } = summary;

  return (
    <PageContainer>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Good morning, Leslie</h1>
          <p className="text-[var(--text-secondary)]">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total AUM"
          value={`$${metrics.total_aum.toLocaleString()}`}
          change={`${metrics.aum_change_pct > 0 ? '+' : ''}${metrics.aum_change_pct}% MTD`}
          changeType={metrics.aum_change_pct >= 0 ? 'positive' : 'negative'}
          icon={DollarSign}
        />
        <MetricCard
          title="Households"
          value={metrics.household_count}
          change={`+${metrics.new_households_week} this week`}
          changeType="neutral"
          icon={Users}
        />
        <MetricCard
          title="Accounts"
          value={metrics.account_count}
          change={`${metrics.pending_accounts} pending`}
          changeType="neutral"
          icon={Briefcase}
        />
        <MetricCard
          title="Compliance"
          value={`${metrics.compliance_pass_rate}%`}
          change={`${metrics.compliance_reviews_pending} reviews`}
          changeType={metrics.compliance_pass_rate >= 90 ? 'positive' : 'warning'}
          icon={ShieldCheck}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-[var(--text-primary)]">Portfolio Performance</h2>
            <div className="flex gap-2">
              {['1M', '3M', '6M', '1Y', 'ALL'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-sm rounded ${
                    period === p
                      ? 'bg-[var(--primary-blue)] text-white'
                      : 'bg-[var(--bg-light)] text-[var(--text-secondary)] hover:bg-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          {performance?.data?.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={performance.data}>
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString()} />
                <YAxis domain={['auto', 'auto']} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Line type="monotone" dataKey="portfolio" stroke="var(--primary-blue)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="benchmark" stroke="#94A3B8" strokeWidth={1} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-[var(--text-muted)]">
              No performance data
            </div>
          )}
        </div>

        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-6 shadow-sm">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recent_activity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="mt-1">
                  {activity.type === 'statement_uploaded' && <Clock className="w-4 h-4 text-[var(--primary-blue)]" />}
                  {activity.type === 'ips_generated' && <CheckCircle className="w-4 h-4 text-[var(--status-success)]" />}
                  {activity.type === 'rebalance_executed' && <TrendingUp className="w-4 h-4 text-[var(--status-success)]" />}
                  {activity.type === 'household_added' && <Users className="w-4 h-4 text-[var(--primary-blue)]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">{activity.description}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {activity.household_name} • {formatTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-6 shadow-sm">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Alerts & Actions</h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg flex items-start justify-between ${
                  alert.severity === 'warning'
                    ? 'bg-amber-50 border border-amber-200'
                    : alert.severity === 'error'
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-blue-50 border border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`w-5 h-5 mt-0.5 ${
                      alert.severity === 'warning' ? 'text-amber-500' : alert.severity === 'error' ? 'text-red-500' : 'text-blue-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{alert.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{alert.description}</p>
                  </div>
                </div>
                {alert.action_link && (
                  <Link
                    to={alert.action_link}
                    className="text-sm text-[var(--primary-blue)] hover:underline shrink-0"
                  >
                    {alert.action_text}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--bg-card)] rounded-lg border border-[var(--border)] p-6 shadow-sm">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Market Summary</h2>
          <div className="space-y-3">
            {market_data.map((item) => (
              <div key={item.symbol} className="flex justify-between items-center py-2 border-b border-[var(--border)] last:border-0">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{item.symbol}</p>
                  <p className="text-xs text-[var(--text-muted)]">{item.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-[var(--text-primary)]">{item.value.toLocaleString()}</p>
                  <p
                    className={`text-sm ${
                      item.change >= 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'
                    }`}
                  >
                    {item.change >= 0 ? '+' : ''}
                    {item.change.toFixed(2)} ({item.change_pct >= 0 ? '+' : ''}
                    {item.change_pct.toFixed(2)}%)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </PageContainer>
  );
}
