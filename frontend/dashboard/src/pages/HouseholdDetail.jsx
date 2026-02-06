import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getHousehold } from '../lib/api';
import { PageContainer } from '../components/layout/PageContainer';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function HouseholdDetail() {
  const { id } = useParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['household', id],
    queryFn: () => getHousehold(id),
    enabled: !!id,
  });

  if (isLoading) return <LoadingSpinner message="Loading household..." />;
  if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <PageContainer>
      <Link
        to="/households"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Households
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{data.name}</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          {data.total_aum != null && `$${Number(data.total_aum).toLocaleString()} AUM`}
          {data.risk_level && ` • ${data.risk_level}`}
          {data.status && ` • ${data.status}`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-[var(--border)] p-6 shadow-sm">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Clients</h2>
          <ul className="space-y-3">
            {(data.clients || []).map((c) => (
              <li key={c.id} className="flex justify-between">
                <span className="font-medium">{c.name}</span>
                {c.is_primary && (
                  <span className="text-xs bg-[var(--primary-light)] text-[var(--primary-blue)] px-2 py-0.5 rounded">
                    Primary
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg border border-[var(--border)] p-6 shadow-sm">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Accounts</h2>
          <ul className="space-y-3">
            {(data.accounts || []).map((a) => (
              <li key={a.id}>
                <Link
                  to={`/accounts/${a.id}`}
                  className="flex justify-between hover:text-primary"
                >
                  <span>{a.account_number_masked} — {a.type}</span>
                  <span className="font-medium">${Number(a.value).toLocaleString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {(data.created_at || data.last_activity) && (
        <div className="mt-6 text-sm text-[var(--text-muted)]">
          {data.created_at && (
            <span>Created {format(new Date(data.created_at), 'MMM d, yyyy')}</span>
          )}
          {data.last_activity && (
            <span className="ml-4">
              Last activity {format(new Date(data.last_activity), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      )}
    </PageContainer>
  );
}
