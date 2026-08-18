import { useState } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';
import { AppLink } from '../../components/brand/AppLink';
import {
  b2cApi,
  type B2CRetirementPlanRequest,
  type B2CRetirementPlanResponse,
} from '../../services/b2cApi';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

const DEFAULT_INPUTS: B2CRetirementPlanRequest = {
  current_assets: 250000,
  annual_contribution: 12000,
  years_to_retire: 20,
  years_in_retirement: 25,
  annual_spending: 60000,
};

function PercentileChart({ paths, totalYears }: { paths: B2CRetirementPlanResponse['percentile_paths']; totalYears: number }) {
  const p50 = paths.p50;
  if (!p50.length) return null;
  const max = Math.max(...p50, 1);

  return (
    <div className="mt-4">
      <p className="text-xs text-slate-500 mb-2">Median projected balance over {totalYears} years</p>
      <div className="flex items-end gap-px h-24">
        {p50.map((v, i) => (
          <div
            key={i}
            className="flex-1 bg-emerald-500/80 rounded-t-sm min-w-[2px]"
            style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
            title={`Year ${i}: ${formatCurrency(v)}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function ClientRetirementPlanner() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [result, setResult] = useState<B2CRetirementPlanResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: keyof B2CRetirementPlanRequest, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const runPlan = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await b2cApi.runRetirementPlan(inputs);
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not run projection';
      setError(msg.includes('402') || msg.toLowerCase().includes('upgrade')
        ? 'Upgrade to Pro to access the retirement planner.'
        : msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Retirement planner</h1>
        <p className="text-sm text-slate-600 mt-1">Monte Carlo simulation — educational projection only, not investment advice.</p>
      </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Your assumptions</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {([
              ['current_assets', 'Current investable assets ($)', 0, 5000000],
              ['annual_contribution', 'Annual savings ($)', 0, 100000],
              ['years_to_retire', 'Years until retirement', 1, 50],
              ['years_in_retirement', 'Years in retirement', 5, 50],
              ['annual_spending', 'Annual spending in retirement ($)', 0, 500000],
            ] as const).map(([key, label, min, max]) => (
              <label key={key} className="block">
                <span className="text-xs text-slate-600">{label}</span>
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={inputs[key]}
                  onChange={(e) => update(key, Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={runPlan}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Running simulation…' : 'Run Monte Carlo (1,000 scenarios)'}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {error}
            {error.includes('Pro') && (
              <AppLink to="/client/upgrade" className="block mt-2 text-blue-600 font-medium hover:underline">
                View Pro plans →
              </AppLink>
            )}
          </div>
        )}

        {result && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <h2 className="font-semibold text-slate-900">Results</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{result.success_rate}%</p>
                <p className="text-xs text-slate-600">Success rate</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-lg font-bold text-slate-900">{formatCurrency(result.median_ending_balance)}</p>
                <p className="text-xs text-slate-600">Median ending balance</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-lg font-bold text-slate-900">{formatCurrency(result.p10_ending)}</p>
                <p className="text-xs text-slate-600">10th percentile</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-center">
                <p className="text-lg font-bold text-slate-900">{formatCurrency(result.p90_ending)}</p>
                <p className="text-xs text-slate-600">90th percentile</p>
              </div>
            </div>

            <PercentileChart paths={result.percentile_paths} totalYears={result.total_years} />

            <p className="text-xs text-slate-400 mt-4">{result.disclaimer}</p>
          </div>
        )}
    </div>
  );
}
