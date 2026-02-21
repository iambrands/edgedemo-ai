import { useState, useEffect } from 'react';
import { Calculator, TrendingUp, Loader2, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { calculateWhatIf, getDashboard } from '../../services/portalApi';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Projection {
  retirement_age: number;
  balance: number;
  monthly_income: number;
  years_of_income: number;
  success_probability: number;
  shortfall_risk: boolean;
}

interface YearlyPoint { year: number; balance: number }

interface Result {
  projection: Projection;
  yearly_projections: YearlyPoint[];
  comparison: Projection[];
  inputs: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */

const fmtCur = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PortalWhatIf() {
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // Inputs
  const [currentAge, setCurrentAge] = useState(45);
  const [retireAge, setRetireAge] = useState(65);
  const [savings, setSavings] = useState(54905);
  const [monthly, setMonthly] = useState(1500);
  const [returnRate, setReturnRate] = useState(7);
  const [inflation, setInflation] = useState(2.5);
  const [spending, setSpending] = useState(6000);

  useEffect(() => {
    getDashboard()
      .then((d) => {
        if (d.total_value) setSavings(Math.round(d.total_value));
      })
      .catch(() => {})
      .finally(() => {
        runCalculation();
      });
  }, []);

  const runCalculation = async (overrides?: Record<string, number>) => {
    setCalculating(true);
    try {
      const params = {
        current_age: overrides?.current_age ?? currentAge,
        retirement_age: overrides?.retirement_age ?? retireAge,
        current_savings: overrides?.current_savings ?? savings,
        monthly_contribution: overrides?.monthly_contribution ?? monthly,
        expected_return: overrides?.expected_return ?? returnRate,
        inflation_rate: overrides?.inflation_rate ?? inflation,
        retirement_spending: overrides?.retirement_spending ?? spending,
      };
      const res = await calculateWhatIf(params);
      setResult(res);
    } catch (e) {
      console.error('what-if calc failed', e);
    } finally {
      setCalculating(false);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentAge(45);
    setRetireAge(65);
    setMonthly(1500);
    setReturnRate(7);
    setInflation(2.5);
    setSpending(6000);
    runCalculation({
      current_age: 45, retirement_age: 65, current_savings: savings,
      monthly_contribution: 1500, expected_return: 7, inflation_rate: 2.5, retirement_spending: 6000,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const p = result?.projection;
  const chartData = result?.yearly_projections?.map((pt) => ({
    age: currentAge + pt.year,
    balance: pt.balance,
  })) || [];

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">What-If Scenarios</h1>
          <p className="text-slate-500 text-sm">Explore how different choices affect your retirement outlook</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Input Panel ───────────────────────────── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2"><Calculator className="h-5 w-5 text-blue-600" /> Parameters</h2>

              <Slider label="Current Age" value={currentAge} min={25} max={70} onChange={setCurrentAge} unit="" />
              <Slider label="Retirement Age" value={retireAge} min={Math.max(currentAge + 1, 55)} max={80} onChange={setRetireAge} unit="" />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Savings</label>
                <p className="text-lg font-semibold text-slate-900">{fmtCur(savings)}</p>
                <p className="text-xs text-slate-400">From your current portfolio</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Contribution</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                  <input type="number" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Return</label>
                <select value={returnRate} onChange={(e) => setReturnRate(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  {[5, 6, 7, 8, 9, 10].map((r) => <option key={r} value={r}>{r}% per year</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Inflation Rate</label>
                <select value={inflation} onChange={(e) => setInflation(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  {[2, 2.5, 3, 3.5].map((r) => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Spending in Retirement</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                  <input type="number" value={spending} onChange={(e) => setSpending(Number(e.target.value))} className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => runCalculation()} disabled={calculating} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium">
                  {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                  {calculating ? 'Calculating...' : 'Calculate'}
                </button>
                <button onClick={handleReset} className="px-3 py-2.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="Reset"><RotateCcw className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          {/* ── Results Panel ─────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {p && (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <ResultCard label="Balance at Retirement" value={fmtCur(p.balance)} sub={`Age ${p.retirement_age}`} />
                  <ResultCard label="Monthly Income" value={fmtCur(p.monthly_income)} sub="4% withdrawal rule" />
                  <ResultCard label="Years of Income" value={`${p.years_of_income}`} sub={`Until age ${retireAge + Math.floor(p.years_of_income)}`} />
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <p className="text-xs text-slate-500 mb-1">Success Probability</p>
                    <p className={`text-2xl font-bold ${p.success_probability >= 80 ? 'text-emerald-600' : p.success_probability >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {p.success_probability}%
                    </p>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full ${p.success_probability >= 80 ? 'bg-emerald-500' : p.success_probability >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${p.success_probability}%` }}
                      />
                    </div>
                    {p.shortfall_risk && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-red-600"><AlertTriangle className="h-3 w-3" /> Shortfall risk</div>
                    )}
                  </div>
                </div>

                {/* Projection Chart */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="font-semibold text-slate-900 mb-4">Projected Growth</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="age" tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} label={{ value: 'Age', position: 'insideBottom', offset: -5, fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8 }} formatter={(v: any) => [fmtCur(v as number), 'Balance']} />
                        <Line type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Comparison cards */}
                {result?.comparison && result.comparison.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Retirement Age Comparison</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {result.comparison.map((c) => {
                        const isSelected = c.retirement_age === retireAge;
                        return (
                          <div key={c.retirement_age} className={`bg-white rounded-xl border shadow-sm p-5 ${isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-slate-500">Retire at {c.retirement_age}</span>
                              {isSelected && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Selected</span>}
                            </div>
                            <p className="text-xl font-bold text-slate-900">{fmtCur(c.balance)}</p>
                            <div className="mt-3 space-y-1.5 text-sm">
                              <div className="flex justify-between"><span className="text-slate-500">Monthly Income</span><span className="font-medium">{fmtCur(c.monthly_income)}</span></div>
                              <div className="flex justify-between"><span className="text-slate-500">Income Years</span><span className="font-medium">{c.years_of_income}</span></div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Success</span>
                                <span className={`font-medium flex items-center gap-1 ${c.success_probability >= 80 ? 'text-emerald-600' : c.success_probability >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {c.success_probability >= 80 ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                                  {c.success_probability}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-700">
                  These projections are estimates based on simplified assumptions. Actual results will vary. Past performance does not guarantee future results. Consult your advisor for personalized financial planning.
                </div>
              </>
            )}
          </div>
        </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function Slider({ label, value, min, max, onChange, unit }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; unit: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-semibold text-blue-600">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
      <div className="flex justify-between text-xs text-slate-400 mt-0.5"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}

function ResultCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}
