import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFeeAnalysis, getAccounts } from '../lib/api';
import { PageContainer } from '../components/layout/PageContainer';
import MetricCard from '../components/dashboard/MetricCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/common/EmptyState';

export default function FeeAnalysis() {
  const [accountId, setAccountId] = useState(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  });

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['fee-analysis', accountId],
    queryFn: () => getFeeAnalysis(accountId),
    enabled: !!accountId,
  });

  if (!accountId && accounts.length === 0) {
    return <LoadingSpinner message="Loading accounts..." />;
  }

  if (accountId && isLoading) return <LoadingSpinner message="Loading fee analysis..." />;
  if (accountId && error)
    return <ErrorDisplay error={error} onRetry={() => refetch()} />;

  if (!data && !error) return null;

  return (
    <PageContainer title="Fee Impact Analysis">
      {accounts.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Account
          </label>
          <select
            value={accountId || ''}
            onChange={(e) => setAccountId(e.target.value)}
            className="border border-[var(--border)] rounded-lg px-4 py-2 bg-white"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_number_masked} — {a.type} (${Number(a.value).toLocaleString()})
              </option>
            ))}
          </select>
        </div>
      )}

      {data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <MetricCard
              title="Total Annual Fees"
              value={`$${Number(data.total_annual_fees ?? 0).toLocaleString()}/yr`}
              changeType="neutral"
            />
            <MetricCard
              title="Projected 10Yr"
              value={`$${Number(data.projected_10yr ?? 0).toLocaleString()}`}
              changeType="neutral"
            />
            <MetricCard
              title="Projected 30Yr"
              value={`$${Number(data.projected_30yr ?? 0).toLocaleString()}`}
              changeType="neutral"
            />
            <MetricCard
              title="30Yr Opportunity Cost"
              value={`$${Number(data.opportunity_cost_30yr ?? 0).toLocaleString()}`}
              changeType="warning"
            />
          </div>
          {data.recommendations?.length > 0 && (
            <div className="bg-white rounded-lg border border-[var(--border)] p-6 shadow-sm">
              <h3 className="font-semibold mb-4 text-[var(--text-primary)]">
                Fee Breakdown & Recommendations
              </h3>
              <ul className="list-disc list-inside space-y-2 text-[var(--text-secondary)]">
                {data.recommendations.map((r, i) => (
                  <li key={i}>{typeof r === 'string' ? r : r.description || JSON.stringify(r)}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          title="No fee data"
          description="Select an account to view fee impact analysis."
        />
      )}
    </PageContainer>
  );
}
