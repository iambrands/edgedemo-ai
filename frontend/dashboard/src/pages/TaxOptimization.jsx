import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTaxOptimization, getHouseholds } from '../lib/api';
import { PageContainer } from '../components/layout/PageContainer';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import EmptyState from '../components/common/EmptyState';

export default function TaxOptimization() {
  const [householdId, setHouseholdId] = useState(null);

  const { data: households = [] } = useQuery({
    queryKey: ['households'],
    queryFn: getHouseholds,
  });

  useEffect(() => {
    if (households.length > 0 && !householdId) {
      setHouseholdId(households[0].id);
    }
  }, [households, householdId]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tax-optimization', householdId],
    queryFn: () => getTaxOptimization(householdId),
    enabled: !!householdId,
  });

  if (!householdId && households.length === 0) {
    return <LoadingSpinner message="Loading households..." />;
  }

  if (householdId && isLoading) return <LoadingSpinner message="Loading tax analysis..." />;
  if (householdId && error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;

  if (!data) return null;

  const { estimated_annual_savings_low, estimated_annual_savings_high, harvesting_opportunities, asset_location_suggestions, wash_sale_warnings } = data;

  return (
    <PageContainer title="Tax Optimization Analysis">
      {households.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Household
          </label>
          <select
            value={householdId || ''}
            onChange={(e) => setHouseholdId(e.target.value)}
            className="border border-[var(--border)] rounded-lg px-4 py-2 bg-white"
          >
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-lg border border-[var(--border)] p-6 mb-6 shadow-sm">
        <p className="text-lg font-semibold text-[var(--status-success)]">
          Estimated Annual Savings: ${estimated_annual_savings_low.toLocaleString()} - $
          {estimated_annual_savings_high.toLocaleString()}
        </p>
      </div>

      {harvesting_opportunities?.length > 0 && (
        <div className="bg-white rounded-lg border border-[var(--border)] p-6 mb-6 shadow-sm">
          <h3 className="font-semibold mb-4 text-[var(--text-primary)]">
            Tax-Loss Harvesting Opportunities
          </h3>
          <ul className="space-y-4">
            {harvesting_opportunities.map((o, i) => (
              <li key={i} className="border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between">
                  <div>
                    <span className="font-medium">{o.symbol}</span> — {o.position_name} ({o.shares}{' '}
                    shares)
                  </div>
                  <span className="text-[var(--status-success)]">
                    ${Math.abs(o.unrealized_loss).toLocaleString()} unrealized loss
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Replace with {o.replacement_symbol} ({o.replacement_name})
                </p>
                {o.wash_sale_warning && (
                  <p className="text-sm text-[var(--status-warning)] mt-1">{o.wash_sale_warning}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {wash_sale_warnings?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-amber-800 mb-2">Wash Sale Warnings</h4>
          <ul className="list-disc list-inside text-sm text-amber-700">
            {wash_sale_warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {asset_location_suggestions?.length > 0 && (
        <div className="bg-white rounded-lg border border-[var(--border)] p-6 shadow-sm">
          <h3 className="font-semibold mb-4 text-[var(--text-primary)]">Asset Location Suggestions</h3>
          <ul className="space-y-3">
            {asset_location_suggestions.map((s, i) => (
              <li key={i} className="flex justify-between items-start">
                <div>
                  <span className="font-medium">{s.action}</span>: {s.description}
                </div>
                <span className="text-[var(--status-success)]">
                  ${s.estimated_savings.toLocaleString()} savings
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!harvesting_opportunities?.length && !asset_location_suggestions?.length && (
        <EmptyState
          title="No tax opportunities"
          description="No tax-loss harvesting or asset location opportunities identified for this household."
        />
      )}
    </PageContainer>
  );
}
