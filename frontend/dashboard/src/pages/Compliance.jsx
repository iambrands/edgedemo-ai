import { useQuery } from '@tanstack/react-query';
import { getComplianceDashboard } from '../lib/api';
import { PageContainer } from '../components/layout/PageContainer';
import MetricCard from '../components/dashboard/MetricCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import { format } from 'date-fns';
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';

export default function Compliance() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['compliance-dashboard'],
    queryFn: getComplianceDashboard,
  });

  if (isLoading) return <LoadingSpinner message="Loading compliance..." />;
  if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;

  const { metrics, pending_reviews, recent_audit_log } = data;

  return (
    <PageContainer title="Compliance Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Checks"
          value={metrics.total_checks.toLocaleString()}
          changeType="neutral"
          icon={ShieldCheck}
        />
        <MetricCard
          title="Passed"
          value={`${metrics.passed.toLocaleString()} (${metrics.passed_pct.toFixed(1)}%)`}
          changeType="positive"
          icon={CheckCircle}
        />
        <MetricCard
          title="Warnings"
          value={`${metrics.warnings.toLocaleString()} (${metrics.warnings_pct.toFixed(1)}%)`}
          changeType="warning"
          icon={AlertTriangle}
        />
        <MetricCard
          title="Failed"
          value={`${metrics.failed.toLocaleString()} (${metrics.failed_pct.toFixed(1)}%)`}
          changeType="negative"
          icon={XCircle}
        />
      </div>

      <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden shadow-sm mb-6">
        <h3 className="font-semibold p-4 border-b border-[var(--border)] text-[var(--text-primary)]">
          Pending Reviews
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-light)]">
                <th className="text-left py-3 px-4 font-medium">Client</th>
                <th className="text-left py-3 px-4 font-medium">Rule</th>
                <th className="text-left py-3 px-4 font-medium">Severity</th>
                <th className="text-left py-3 px-4 font-medium">Date</th>
                <th className="text-left py-3 px-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {pending_reviews.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border)]">
                  <td className="py-3 px-4">{r.client_name}</td>
                  <td className="py-3 px-4">{r.rule}</td>
                  <td className="py-3 px-4">
                    <span
                      className={
                        r.severity === 'high'
                          ? 'text-[var(--status-error)]'
                          : r.severity === 'medium'
                            ? 'text-[var(--status-warning)]'
                            : 'text-[var(--text-secondary)]'
                      }
                    >
                      {r.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-4">{format(new Date(r.date), 'MMM d')}</td>
                  <td className="py-3 px-4">
                    <button className="text-primary hover:underline">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden shadow-sm">
        <h3 className="font-semibold p-4 border-b border-[var(--border)] text-[var(--text-primary)]">
          Recent Audit Log
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-light)]">
                <th className="text-left py-3 px-4 font-medium">Date</th>
                <th className="text-left py-3 px-4 font-medium">Client</th>
                <th className="text-left py-3 px-4 font-medium">Rule</th>
                <th className="text-left py-3 px-4 font-medium">Result</th>
                <th className="text-left py-3 px-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {recent_audit_log.map((log) => (
                <tr key={log.id} className="border-b border-[var(--border)]">
                  <td className="py-3 px-4">{format(new Date(log.timestamp), 'MMM d, HH:mm')}</td>
                  <td className="py-3 px-4">{log.client_name}</td>
                  <td className="py-3 px-4">{log.rule}</td>
                  <td className="py-3 px-4">
                    <span
                      className={
                        log.result === 'pass'
                          ? 'text-[var(--status-success)]'
                          : log.result === 'warning'
                            ? 'text-[var(--status-warning)]'
                            : 'text-[var(--status-error)]'
                      }
                    >
                      {log.result}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}
