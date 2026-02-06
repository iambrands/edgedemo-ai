import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getClientPortalSummary } from '../lib/api';
import { PageContainer } from '../components/layout/PageContainer';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#0066CC', '#00A86B', '#F59E0B', '#94A3B8'];

export default function ClientPortalDemo() {
  const [clientId, setClientId] = useState('demo');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portal-summary', clientId],
    queryFn: () => getClientPortalSummary(clientId),
    enabled: !!clientId,
  });

  if (isLoading) return <LoadingSpinner message="Loading portal..." />;
  if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;
  if (!data) return null;

  const { portfolio_summary, allocation, recent_activity, documents, advisor_message } = data;
  const pieData = allocation
    ? Object.entries(allocation).map(([k, v]) => ({ name: v.label || k, value: v.current, color: COLORS[Object.keys(allocation).indexOf(k) % COLORS.length] }))
    : [];

  return (
    <PageContainer>
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
        <strong>Advisor Preview</strong> — This is what clients see in their portal. Use this to demo the client experience.
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{data.client_name}</h1>
            <p className="text-[var(--text-secondary)]">{data.firm_name} • Advisor: {data.advisor_name}</p>
          </div>
          <p className="text-sm text-[var(--text-muted)]">Last updated: {data.last_updated ? new Date(data.last_updated).toLocaleDateString() : '—'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-[var(--border)] p-5 shadow-sm">
            <p className="text-sm text-[var(--text-muted)]">Portfolio Value</p>
            <p className="text-2xl font-semibold text-[var(--text-primary)]">${portfolio_summary?.total_value?.toLocaleString() ?? '—'}</p>
          </div>
          <div className="bg-white rounded-lg border border-[var(--border)] p-5 shadow-sm">
            <p className="text-sm text-[var(--text-muted)]">YTD Return</p>
            <p className={`text-2xl font-semibold ${(portfolio_summary?.ytd_return ?? 0) >= 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}`}>
              {portfolio_summary?.ytd_return != null ? `${portfolio_summary.ytd_return}%` : '—'}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[var(--border)] p-5 shadow-sm">
            <p className="text-sm text-[var(--text-muted)]">YTD Return ($)</p>
            <p className="text-2xl font-semibold text-[var(--text-primary)]">${portfolio_summary?.ytd_return_dollar?.toLocaleString() ?? '—'}</p>
          </div>
          <div className="bg-white rounded-lg border border-[var(--border)] p-5 shadow-sm">
            <p className="text-sm text-[var(--text-muted)]">Next Review</p>
            <p className="text-xl font-semibold text-[var(--text-primary)]">{data.next_review ?? '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-[var(--border)] p-6 shadow-sm">
            <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Asset Allocation</h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}%`, 'Current']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[var(--text-muted)]">No allocation data</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-[var(--border)] p-6 shadow-sm">
            <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Recent Activity</h2>
            <ul className="space-y-3">
              {(recent_activity || []).map((a, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span>{a.description}</span>
                  <span className="text-[var(--text-muted)]">{a.date}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-[var(--border)] p-6 shadow-sm">
            <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Documents</h2>
            <ul className="space-y-2">
              {(documents || []).map((d, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span>{d.name}</span>
                  <span className="text-[var(--text-muted)]">{d.date}</span>
                </li>
              ))}
            </ul>
          </div>

          {advisor_message && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-blue-900 mb-2">Message from Advisor</h2>
              <p className="text-blue-800">{advisor_message}</p>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
