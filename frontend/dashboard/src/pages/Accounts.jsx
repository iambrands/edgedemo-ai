import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getAccounts } from '../lib/api';
import { PageContainer } from '../components/layout/PageContainer';
import { Plus } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/common/EmptyState';

export default function Accounts() {
  const { data: accounts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
  });

  if (isLoading) return <LoadingSpinner message="Loading accounts..." />;
  if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;

  return (
    <PageContainer title="Accounts">
      <div className="flex justify-end mb-6">
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark">
          <Plus className="w-4 h-4" /> Add Account
        </button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          title="No accounts"
          description="Add an account or link from a household to get started."
        />
      ) : (
        <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-light)]">
                  <th className="text-left py-3 px-4 font-medium">Account</th>
                  <th className="text-left py-3 px-4 font-medium">Type</th>
                  <th className="text-left py-3 px-4 font-medium">Custodian</th>
                  <th className="text-right py-3 px-4 font-medium">Value</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-light)]/50">
                    <td className="py-3 px-4">
                      <Link to={`/accounts/${a.id}`} className="text-primary hover:underline">
                        {a.account_number_masked || `***${String(a.id || '').slice(-4)}`}
                      </Link>
                    </td>
                    <td className="py-3 px-4">{a.type || '—'}</td>
                    <td className="py-3 px-4">{a.custodian || '—'}</td>
                    <td className="py-3 px-4 text-right font-medium">
                      ${Number(a.value ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={a.status === 'active' ? 'text-status-success' : 'text-status-warning'}>
                        ●
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-sm text-[var(--text-muted)]">
            Showing {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
