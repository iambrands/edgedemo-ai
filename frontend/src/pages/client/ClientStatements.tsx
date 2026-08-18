import { useEffect, useState } from 'react';
import { FileText, CheckCircle, Clock } from 'lucide-react';
import { b2cApi, type B2CStatement } from '../../services/b2cApi';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCurrency(value: number | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

const STATUS_ICON: Record<string, typeof Clock> = {
  confirmed: CheckCircle,
};

const STATUS_COLOR: Record<string, string> = {
  confirmed: 'text-green-600',
  pending: 'text-amber-500',
  processing: 'text-blue-500',
};

export default function ClientStatements() {
  const [statements, setStatements] = useState<B2CStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    b2cApi.getStatements()
      .then(res => setStatements(res.statements))
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load statements'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Statement history</h1>
        <p className="text-sm text-slate-600 mt-1">All brokerage statements you've confirmed with Firmum.</p>
      </div>
      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {!loading && !error && statements.length === 0 && (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700 mb-1">No statements yet</h2>
          <p className="text-sm text-slate-500">
            Confirm your first brokerage statement from the dashboard to see it here.
          </p>
        </div>
      )}

      {!loading && statements.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Statement date</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">Custodian</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Ending value</th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statements.map(s => {
                const Icon = STATUS_ICON[s.status] ?? Clock;
                const color = STATUS_COLOR[s.status] ?? 'text-slate-400';
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-800">
                      <span>{formatDate(s.statement_date)}</span>
                      {s.filename && (
                        <span className="block text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">{s.filename}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                      {s.custodian ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-800 hidden md:table-cell">
                      {formatCurrency(s.ending_value)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 ${color}`}>
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="capitalize">{s.status}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
