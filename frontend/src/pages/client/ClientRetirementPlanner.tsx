import { useState } from 'react';
import { Calculator, Info, Sparkles, Target, TrendingUp } from 'lucide-react';
import { AppLink } from '../../components/brand/AppLink';
import {
  b2cApi,
  type B2CRetirementPlanRequest,
  type B2CRetirementPlanResponse,
} from '../../services/b2cApi';
import { RetirementFanChart } from '../../components/client/RetirementFanChart';

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
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

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (v: number) => string;
  onChange: (v: number) => void;
}

function SliderField({ label, value, min, max, step, formatValue, onChange }: SliderFieldProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <span className="text-sm font-bold text-slate-900 tabular-nums">{formatValue(value)}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-100
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
          style={{
            background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${pct}%, #E2E8F0 ${pct}%, #E2E8F0 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>
    </div>
  );
}

function SuccessGauge({ rate }: { rate: number }) {
  const radius = 45;
  const circumference = Math.PI * radius;
  const progress = (rate / 100) * circumference;
  const color = rate >= 80 ? '#10B981' : rate >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative w-28 h-16">
      <svg width="112" height="64" viewBox="0 0 112 64" className="overflow-visible">
        <path
          d="M 6 58 A 45 45 0 0 1 106 58"
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={8}
          strokeLinecap="round"
        />
        <path
          d="M 6 58 A 45 45 0 0 1 106 58"
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-end justify-center pb-0">
        <span className="text-2xl font-bold" style={{ color }}>{rate}%</span>
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
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Retirement Planner</h1>
          <p className="text-sm text-slate-600 mt-0.5">Monte Carlo simulation across 1,000 scenarios — educational projection, not investment advice.</p>
        </div>
      </div>

      {/* Interactive sliders */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900">Your Assumptions</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
          <SliderField
            label="Current investable assets"
            value={inputs.current_assets}
            min={10000}
            max={5000000}
            step={10000}
            formatValue={(v) => formatCurrency(v)}
            onChange={(v) => update('current_assets', v)}
          />
          <SliderField
            label="Annual savings"
            value={inputs.annual_contribution}
            min={0}
            max={100000}
            step={1000}
            formatValue={(v) => formatCurrency(v)}
            onChange={(v) => update('annual_contribution', v)}
          />
          <SliderField
            label="Years until retirement"
            value={inputs.years_to_retire}
            min={1}
            max={40}
            step={1}
            formatValue={(v) => `${v} yrs`}
            onChange={(v) => update('years_to_retire', v)}
          />
          <SliderField
            label="Years in retirement"
            value={inputs.years_in_retirement}
            min={5}
            max={45}
            step={1}
            formatValue={(v) => `${v} yrs`}
            onChange={(v) => update('years_in_retirement', v)}
          />
          <SliderField
            label="Annual spending in retirement"
            value={inputs.annual_spending}
            min={20000}
            max={300000}
            step={5000}
            formatValue={(v) => formatCurrency(v)}
            onChange={(v) => update('annual_spending', v)}
          />
        </div>

        <button
          type="button"
          onClick={runPlan}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Running 1,000 simulations…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Run Monte Carlo Simulation
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
          {error.includes('Pro') && (
            <AppLink to="/client/upgrade" className="block mt-2 text-blue-600 font-medium hover:underline">
              View Pro plans &rarr;
            </AppLink>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Success gauge + key stats */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <SuccessGauge rate={result.success_rate} />
              <p className="text-xs text-slate-500 font-medium">Success Rate</p>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div className="text-center rounded-xl bg-slate-50 p-3">
                <p className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(result.median_ending_balance)}</p>
                <p className="text-[11px] text-slate-500">Median ending balance</p>
              </div>
              <div className="text-center rounded-xl bg-slate-50 p-3">
                <p className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(result.p10_ending)}</p>
                <p className="text-[11px] text-slate-500">10th percentile (worst)</p>
              </div>
              <div className="text-center rounded-xl bg-emerald-50 p-3">
                <p className="text-lg font-bold text-emerald-700 tabular-nums">{formatCurrency(result.p90_ending)}</p>
                <p className="text-[11px] text-slate-500">90th percentile (best)</p>
              </div>
            </div>
          </div>

          {/* Plain-English summary */}
          <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 flex gap-3">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-slate-700 leading-relaxed">
              {result.success_rate >= 80 ? (
                <>With <strong>{result.success_rate}% confidence</strong>, your portfolio can sustain {formatCurrency(inputs.annual_spending)}/year in retirement spending for {inputs.years_in_retirement} years. In the median scenario, you&apos;d end with {formatCurrency(result.median_ending_balance)} remaining.</>
              ) : result.success_rate >= 60 ? (
                <>Your plan has a <strong>{result.success_rate}% success rate</strong> — consider increasing savings by {formatCurrency(Math.round(inputs.annual_spending * 0.1))}/year or working {Math.ceil((80 - result.success_rate) / 5)} more years to reach 80%+ confidence.</>
              ) : (
                <>At <strong>{result.success_rate}%</strong>, this plan carries significant risk. Consider reducing retirement spending below {formatCurrency(inputs.annual_spending)}/year or increasing your savings rate substantially.</>
              )}
            </p>
          </div>

          {/* Fan Chart */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Projected Wealth Over Time</h3>
            </div>
            <RetirementFanChart result={result} yearsToRetire={inputs.years_to_retire} />
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">{result.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
