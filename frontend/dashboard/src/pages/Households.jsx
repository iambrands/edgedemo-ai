import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getHouseholds } from '../lib/api';
import { PageContainer } from '../components/layout/PageContainer';
import { Plus, Search } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/common/EmptyState';
import { formatDistanceToNow } from 'date-fns';

export default function Households() {
  const [search, setSearch] = useState('');

  const { data: households = [], isLoading, error, refetch } = useQuery({
    queryKey: ['households'],
    queryFn: getHouseholds,
  });

  const filtered = households.filter(
    (h) =>
      !search ||
      h.name?.toLowerCase().includes(search.toLowerCase()) ||
      h.primary_client?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <LoadingSpinner message="Loading households..." />;
  if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;

  return (
    <PageContainer title="Households">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="search"
            placeholder="Search households..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg text-sm"
          />
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark">
          <Plus className="w-4 h-4" /> Add Household
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No households"
          description={search ? 'Try a different search.' : 'Add your first household to get started.'}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((h) => (
            <div
              key={h.id}
              className="bg-white rounded-lg border border-[var(--border)] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{h.name}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{h.primary_client}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span>${Number(h.total_aum || 0).toLocaleString()}</span>
                <span>{h.account_count} accounts</span>
                <span className="capitalize">{h.risk_level}</span>
                <span className="text-[var(--text-muted)]">
                  Last: {h.last_activity ? formatDistanceToNow(new Date(h.last_activity), { addSuffix: true }) : '—'}
                </span>
                <span className={h.status === 'active' ? 'text-status-success' : 'text-status-warning'}>
                  ● {h.status}
                </span>
              </div>
              <Link
                to={`/households/${h.id}`}
                className="text-primary text-sm font-medium hover:underline shrink-0"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
