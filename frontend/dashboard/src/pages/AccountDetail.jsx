import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAccount } from '../lib/api';
import { PageContainer } from '../components/layout/PageContainer';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import { ArrowLeft } from 'lucide-react';

export default function AccountDetail() {
  const { id } = useParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['account', id],
    queryFn: () => getAccount(id),
    enabled: !!id,
  });

  if (isLoading) return <LoadingSpinner message="Loading account..." />;
  if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;
  if (!data) return null;

  const positions = data.positions || [];

  return (
    <PageContainer>
      <Link
        to="/accounts"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Accounts
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {data.account_number_masked} — {data.type}
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          {data.custodian}
          {data.household_name && (
            <>
              {' • '}
              <Link to={`/households/${data.household_id}`} className="hover:text-primary">
                {data.household_name}
              </Link>
            </>
          )}
        </p>
        <p className="text-xl font-semibold text-[var(--text-primary)] mt-2">
          ${Number(data.total_value ?? data.value ?? 0).toLocaleString()}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden shadow-sm">
        <h2 className="text-lg font-medium text-[var(--text-primary)] p-4 border-b border-[var(--border)]">
          Positions
        </h2>
        {positions.length === 0 ? (
          <p className="p-6 text-[var(--text-muted)]">No positions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-light)]">
                  <th className="text-left py-3 px-4 font-medium">Symbol</th>
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                  <th className="text-right py-3 px-4 font-medium">Qty</th>
                  <th className="text-right py-3 px-4 font-medium">Price</th>
                  <th className="text-right py-3 px-4 font-medium">Value</th>
                  <th className="text-right py-3 px-4 font-medium">G/L</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.symbol} className="border-b border-[var(--border)]">
                    <td className="py-3 px-4 font-medium">{p.symbol}</td>
                    <td className="py-3 px-4">{p.name}</td>
                    <td className="py-3 px-4 text-right">{Number(p.quantity).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">${Number(p.price).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">${Number(p.value).toLocaleString()}</td>
                    <td
                      className={`py-3 px-4 text-right ${
                        (p.gain_loss ?? 0) >= 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'
                      }`}
                    >
                      {p.gain_loss_pct != null ? `${p.gain_loss_pct >= 0 ? '+' : ''}${Number(p.gain_loss_pct).toFixed(2)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
