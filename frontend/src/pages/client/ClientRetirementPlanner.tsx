import { useState } from 'react';
import { Calculator, Info, Shield, Sparkles, Target, TrendingUp, TrendingDown } from 'lucide-react';
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

/* ── Social Security estimator ───────────────────────────────────────── */

function estimateSsBenefit(annualIncome: number, yearsWorked: number, claimAge: number): number {
  // Simplified AIME approximation based on 35 highest-earning years
  const aime = (annualIncome / 12) * Math.min(yearsWorked, 35) / 35;
  // Apply bend points (2025 approximation)
  const bp1 = 1174, bp2 = 7078;
  let pia = 0;
  if (aime <= bp1) pia = aime * 0.9;
  else if (aime <= bp2) pia = bp1 * 0.9 + (aime - bp1) * 0.32;
  else pia = bp1 * 0.9 + (bp2 - bp1) * 0.32 + (aime - bp2) * 0.15;
  // Adjust for claim age relative to FRA of 67
  const monthsEarly = Math.max(0, (67 - claimAge) * 12);
  const monthsLate = Math.max(0, (claimAge - 67) * 12);
  if (monthsEarly > 0) {
    const reduction = monthsEarly <= 36 ? monthsEarly * (5 / 9 / 100) : (36 * (5 / 9 / 100)) + ((monthsEarly - 36) * (5 / 12 / 100));
    pia = pia * (1 - reduction);
  } else {
    pia = pia * (1 + monthsLate * (8 / 12 / 100));
  }
  return Math.round(pia);
}

function SocialSecurityEstimator() {
  const [income, setIncome] = useState(114000);
  const [yearsWorked, setYearsWorked] = useState(28);
  const [claimAge, setClaimAge] = useState(67);

  const benefitAt62 = estimateSsBenefit(income, yearsWorked, 62);
  const benefitAtFra = estimateSsBenefit(income, yearsWorked, 67);
  const benefitAt70 = estimateSsBenefit(income, yearsWorked, 70);
  const current = estimateSsBenefit(income, yearsWorked, claimAge);
  const lifetimediff70vs62 = (benefitAt70 - benefitAt62) * 12 * 20; // 20-yr horizon

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-emerald-600" />
        <h2 className="font-semibold text-slate-900">Social Security Estimator</h2>
        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Educational estimate</span>
      </div>

      <div className="grid sm:grid-cols-3 gap-x-8 gap-y-4">
        <SliderField label="Annual income (current)" value={income} min={20000} max={300000} step={5000}
          formatValue={(v) => formatCurrency(v)} onChange={setIncome} />
        <SliderField label="Years of work history" value={yearsWorked} min={1} max={40} step={1}
          formatValue={(v) => `${v} yrs`} onChange={setYearsWorked} />
        <SliderField label="Claim age" value={claimAge} min={62} max={70} step={1}
          formatValue={(v) => `Age ${v}`} onChange={setClaimAge} />
      </div>

      {/* Benefit comparison row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { age: 62, label: 'Age 62 (early)', benefit: benefitAt62, tone: 'text-amber-600 bg-amber-50' },
          { age: 67, label: 'Age 67 (FRA)', benefit: benefitAtFra, tone: 'text-blue-600 bg-blue-50' },
          { age: 70, label: 'Age 70 (max)', benefit: benefitAt70, tone: 'text-emerald-600 bg-emerald-50' },
        ].map(({ age, label, benefit, tone }) => (
          <div key={age} className={`rounded-xl p-3 text-center ${tone.split(' ')[1]} border border-slate-100`}>
            <p className={`text-sm font-bold tabular-nums ${tone.split(' ')[0]}`}>
              {formatCurrency(benefit)}<span className="text-xs font-normal text-slate-500">/mo</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
            {age === claimAge && (
              <span className="inline-block mt-1 text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full">Your selection</span>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex gap-3">
        <Info className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-600">
          At age {claimAge} you'd receive an estimated <strong>{formatCurrency(current)}/month</strong>.
          Delaying from 62 to 70 would increase your monthly benefit by {formatCurrency(benefitAt70 - benefitAt62)} — 
          worth roughly <strong>{formatCurrency(lifetimediff70vs62)}</strong> extra over 20 years.
          This is an educational estimate. Create a my Social Security account at ssa.gov for your personalized projection.
        </p>
      </div>
    </div>
  );
}

/* ── Withdrawal / decumulation planner ───────────────────────────────── */

function WithdrawalPlanner() {
  const [portfolio, setPortfolio] = useState(1200000);
  const [ssMonthly, setSsMonthly] = useState(2800);
  const [annualSpend, setAnnualSpend] = useState(80000);
  const [strategy, setStrategy] = useState<'four_pct' | 'dynamic' | 'floor'>('four_pct');

  const ssAnnual = ssMonthly * 12;
  const portfolioNeed = Math.max(0, annualSpend - ssAnnual);
  const withdrawalRate = portfolio > 0 ? (portfolioNeed / portfolio) * 100 : 0;

  const safeYears4pct = portfolioNeed <= 0 ? 999 : Math.floor(Math.log(1 + portfolio * 0.04 / portfolioNeed) / Math.log(1.04));
  const yearsFunded = strategy === 'four_pct' ? safeYears4pct : strategy === 'dynamic' ? Math.floor(portfolio / (portfolioNeed || 1)) : 30;

  const statusColor = withdrawalRate <= 4 ? 'text-emerald-600' : withdrawalRate <= 5.5 ? 'text-amber-600' : 'text-rose-600';
  const statusLabel = withdrawalRate <= 4 ? 'Sustainable' : withdrawalRate <= 5.5 ? 'Elevated risk' : 'High risk';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2">
        <TrendingDown className="h-5 w-5 text-rose-600" />
        <h2 className="font-semibold text-slate-900">Withdrawal / Decumulation Planner</h2>
        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Educational</span>
      </div>

      {/* Strategy selector */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'four_pct', label: '4% Rule' },
          { key: 'dynamic', label: 'Dynamic Spending' },
          { key: 'floor', label: 'Floor & Upside' },
        ].map(({ key, label }) => (
          <button key={key} type="button"
            onClick={() => setStrategy(key as typeof strategy)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${strategy === key ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-x-8 gap-y-4">
        <SliderField label="Retirement portfolio" value={portfolio} min={100000} max={5000000} step={50000}
          formatValue={(v) => formatCurrency(v)} onChange={setPortfolio} />
        <SliderField label="Social Security (monthly)" value={ssMonthly} min={0} max={4000} step={100}
          formatValue={(v) => `${formatCurrency(v)}/mo`} onChange={setSsMonthly} />
        <SliderField label="Annual spending goal" value={annualSpend} min={20000} max={300000} step={5000}
          formatValue={(v) => formatCurrency(v)} onChange={setAnnualSpend} />
      </div>

      {/* Result strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <p className={`text-xl font-bold tabular-nums ${statusColor}`}>{withdrawalRate.toFixed(1)}%</p>
          <p className="text-[10px] text-slate-500">Withdrawal rate</p>
          <p className={`text-[10px] font-semibold mt-0.5 ${statusColor}`}>{statusLabel}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900 tabular-nums">{formatCurrency(portfolioNeed)}</p>
          <p className="text-[10px] text-slate-500">Portfolio draw / year</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <p className="text-xl font-bold text-slate-900 tabular-nums">{formatCurrency(ssAnnual)}</p>
          <p className="text-[10px] text-slate-500">SS covers / year</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center">
          <p className={`text-xl font-bold tabular-nums ${yearsFunded >= 30 ? 'text-emerald-600' : yearsFunded >= 20 ? 'text-amber-600' : 'text-rose-600'}`}>
            {yearsFunded >= 60 ? '60+' : yearsFunded} yrs
          </p>
          <p className="text-[10px] text-slate-500">Portfolio funded for</p>
        </div>
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex gap-3">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-slate-600">
          {strategy === 'four_pct' && <>The classic <strong>4% rule</strong> suggests withdrawing 4% of your portfolio in year 1, then adjusting for inflation. Your current rate is {withdrawalRate.toFixed(1)}% — {withdrawalRate <= 4 ? 'within the safe zone' : 'above the guideline, which increases sequence-of-returns risk'}.</>}
          {strategy === 'dynamic' && <>The <strong>dynamic spending</strong> strategy adjusts withdrawals based on portfolio performance — spending more in good years, less in bad ones. This reduces depletion risk but requires spending flexibility.</>}
          {strategy === 'floor' && <>The <strong>floor & upside</strong> strategy covers essential expenses (floor) with guaranteed income (SS + annuities) and uses the portfolio only for discretionary spending — maximizing security while preserving growth.</>}
        </p>
      </div>
    </div>
  );
}

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

      {/* Social Security Estimator */}
      <SocialSecurityEstimator />

      {/* Withdrawal / Decumulation Planner */}
      <WithdrawalPlanner />
    </div>
  );
}
