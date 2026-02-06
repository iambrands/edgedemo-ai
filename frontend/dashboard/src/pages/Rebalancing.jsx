import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getRebalancingPlan, getAccounts } from '../lib/api';
import { PageContainer } from '../components/layout/PageContainer';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/common/EmptyState';

export default function Rebalancing() {
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

  const rebalanceMutation = useMutation({
    mutationFn: () => getRebalancingPlan(accountId),
  });

  const { data, isLoading: isPending, error } = rebalanceMutation;

  const runAnalysis = () => {
    if (accountId) rebalanceMutation.mutate();
  };

  if (accounts.length === 0) {
    return <LoadingSpinner message="Loading accounts..." />;
  }

  return (
    <PageContainer title="Rebalancing Center">
      <div className="mb-6">
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Account
        </label>
        <select
          value={accountId || ''}
          onChange={(e) => setAccountId(e.target.value)}
          className="border border-[var(--border)] rounded-lg px-4 py-2 bg-white"
        >
          <option value="">Select account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.account_number_masked} — {a.type} (${Number(a.value).toLocaleString()})
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={runAnalysis}
          disabled={!accountId || isPending}
          className="px-6 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
        >
          {isPending ? 'Analyzing...' : 'Generate Rebalance Plan'}
        </button>
      </div>

      {rebalanceMutation.isError && (
        <ErrorDisplay error={rebalanceMutation.error} onRetry={() => rebalanceMutation.mutate()} />
      )}

      {data && (
        <div className="bg-white rounded-lg border border-[var(--border)] p-6 shadow-sm">
          <h3 className="font-semibold mb-4 text-[var(--text-primary)]">Rebalance Plan</h3>
          {data.summary && (
            <p className="text-[var(--text-secondary)] mb-4">{data.summary}</p>
          )}
          {data.trades?.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 font-medium">Ticker</th>
                  <th className="text-left py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.trades.map((t, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    <td className="py-2">{t.ticker}</td>
                    <td className="py-2">{t.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[var(--text-muted)]">No trades required.</p>
          )}
          <div className="flex gap-4 mt-6">
            <button className="px-4 py-2 bg-primary text-white rounded-lg">
              Preview in Account
            </button>
            <button className="px-4 py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-light)]">
              Export to CSV
            </button>
          </div>
        </div>
      )}

      {!data && !isPending && !rebalanceMutation.isError && (
        <EmptyState
          title="No rebalance plan"
          description="Select an account and click Generate Rebalance Plan to analyze allocation drift."
        />
      )}
    </PageContainer>
  );
}
