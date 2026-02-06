import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRiskAnalysis, getHouseholds } from '../lib/api';
import { PageContainer } from '../components/layout/PageContainer';
import MetricCard from '../components/dashboard/MetricCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import { AlertTriangle } from 'lucide-react';

export default function RiskAnalysis() {
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
    queryKey: ['risk-analysis', householdId],
    queryFn: () => getRiskAnalysis(householdId),
    enabled: !!householdId,
  });

  if (!householdId && households.length === 0) {
    return <LoadingSpinner message="Loading households..." />;
  }

  if (householdId && isLoading) return <LoadingSpinner message="Loading risk analysis..." />;
  if (householdId && error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;

  if (!data) return null;

  const { overall_risk_score, risk_level, metrics, concentration_risks, recommendations } = data;

  return (
    <PageContainer title="Risk Analysis">
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

      <p className="text-lg font-semibold mb-6 text-[var(--text-primary)]">
        Risk Score: {overall_risk_score}/100 ({risk_level})
      </p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Concentration"
          value={`${metrics.concentration_score}%`}
          change={metrics.concentration_score > 50 ? '⚠ High' : '—'}
          changeType={metrics.concentration_score > 50 ? 'warning' : 'neutral'}
          icon={AlertTriangle}
        />
        <MetricCard
          title="Volatility"
          value={`${metrics.volatility_beta} Beta`}
          change={metrics.volatility_beta > 1.2 ? '⚠ Above Avg' : '—'}
          changeType={metrics.volatility_beta > 1.2 ? 'warning' : 'neutral'}
        />
        <MetricCard
          title="Correlation"
          value={metrics.correlation_to_spy?.toFixed(2) ?? '—'}
          change="To SPY"
          changeType="neutral"
        />
        <MetricCard
          title="Drawdown"
          value={`${metrics.max_drawdown_12m}%`}
          change="Max 12mo"
          changeType={metrics.max_drawdown_12m < -15 ? 'negative' : 'neutral'}
        />
      </div>

      {concentration_risks?.length > 0 && (
        <div className="bg-white rounded-lg border border-[var(--border)] p-6 mb-6 shadow-sm">
          <h3 className="font-semibold mb-4 text-[var(--text-primary)]">Concentration Risk</h3>
          <ul className="space-y-4">
            {concentration_risks.map((r, i) => (
              <li key={i} className="border-b border-[var(--border)] pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium">{r.name}</span> — {r.current_pct}% (threshold{' '}
                    {r.threshold_pct}%)
                  </div>
                  <span
                    className={
                      r.severity === 'critical'
                        ? 'text-[var(--status-error)]'
                        : r.severity === 'high'
                          ? 'text-[var(--status-warning)]'
                          : 'text-[var(--text-secondary)]'
                    }
                  >
                    {r.severity}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{r.recommendation}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendations?.length > 0 && (
        <div className="bg-white rounded-lg border border-[var(--border)] p-6 shadow-sm">
          <h3 className="font-semibold mb-4 text-[var(--text-primary)]">Recommendations</h3>
          <ul className="list-disc list-inside space-y-2 text-[var(--text-secondary)]">
            {recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </PageContainer>
  );
}
