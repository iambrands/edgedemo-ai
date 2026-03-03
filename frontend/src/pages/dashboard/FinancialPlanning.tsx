import { useEffect, useState, useCallback } from 'react';
import {
  Target, Calculator, Sun, DollarSign,
  Loader2, Shield, Award,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL || '';
const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function FinancialPlanning() {
  const { token } = useAuth();
  const [tab, setTab] = useState<'goals' | 'monte-carlo' | 'social-security' | 'roth' | 'estate'>('goals');
  const [goals, setGoals] = useState<any>(null);
  const [mcResult, setMcResult] = useState<any>(null);
  const [ssResult, setSsResult] = useState<any>(null);
  const [rothResult, setRothResult] = useState<any>(null);
  const [estateData, setEstateData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const [mcInputs, setMcInputs] = useState({
    current_assets: 500000, annual_contribution: 24000,
    years_to_retire: 20, years_in_retirement: 30, annual_spending: 80000,
  });

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadGoals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/planning/goals/hh-001`, { headers });
      setGoals(await res.json());
    } catch {} finally { setLoading(false); }
  }, [token]);

  const loadEstate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/planning/estate/hh-001`, { headers });
      setEstateData(await res.json());
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (tab === 'goals') loadGoals();
    if (tab === 'estate') loadEstate();
  }, [tab]);

  const runMonteCarlo = async () => {
    setRunning(true);
    try {
      const res = await fetch(`${API}/api/v1/planning/monte-carlo`, { method: 'POST', headers, body: JSON.stringify(mcInputs) });
      setMcResult(await res.json());
    } catch {} finally { setRunning(false); }
  };

  const runSocialSecurity = async () => {
    setRunning(true);
    try {
      const res = await fetch(`${API}/api/v1/planning/social-security`, { method: 'POST', headers, body: JSON.stringify({ birth_year: 1965, monthly_pia: 2800, spouse_monthly_pia: 1500 }) });
      setSsResult(await res.json());
    } catch {} finally { setRunning(false); }
  };

  const runRoth = async () => {
    setRunning(true);
    try {
      const res = await fetch(`${API}/api/v1/planning/roth-conversion`, { method: 'POST', headers, body: JSON.stringify({ traditional_ira_balance: 500000, current_tax_rate: 0.24, retirement_tax_rate: 0.22, years_to_retire: 15 }) });
      setRothResult(await res.json());
    } catch {} finally { setRunning(false); }
  };

  const goalIcon = (type: string) => {
    if (type === 'retirement') return <Sun className="w-5 h-5 text-amber-500" />;
    if (type === 'education') return <Award className="w-5 h-5 text-blue-500" />;
    if (type === 'major_purchase') return <DollarSign className="w-5 h-5 text-emerald-500" />;
    return <Shield className="w-5 h-5 text-violet-500" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Financial Planning" subtitle="Multi-goal planning, Monte Carlo simulations, Social Security optimization, and Roth conversion analysis" />

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {(['goals', 'monte-carlo', 'social-security', 'roth', 'estate'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {t === 'goals' ? 'Goals' : t === 'monte-carlo' ? 'Monte Carlo' : t === 'social-security' ? 'Social Security' : t === 'roth' ? 'Roth Conversion' : 'Estate'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : tab === 'goals' && goals ? (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="text-center bg-blue-50 rounded-2xl px-6 py-4">
              <p className="text-3xl font-bold text-blue-700">{goals.overall_score}</p>
              <p className="text-xs text-blue-600 mt-1">Plan Score</p>
            </div>
            <div>
              <Badge variant={goals.overall_status === 'on_track' ? 'green' : 'amber'}>{goals.overall_status.replace('_', ' ')}</Badge>
              <p className="text-sm text-slate-500 mt-1">Next review: {goals.next_review_date}</p>
            </div>
          </div>
          <div className="space-y-4">
            {(goals.goals || []).map((g: any) => {
              const pctDone = Math.round((g.current_progress / g.target_amount) * 100);
              return (
                <Card key={g.id}>
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-slate-50">{goalIcon(g.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{g.name}</h3>
                          <Badge variant={g.status === 'on_track' ? 'green' : 'amber'} size="sm">{g.probability_of_success}% success</Badge>
                        </div>
                        <span className="text-sm font-semibold text-slate-700">Target: {g.target_date}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>{fmt(g.current_progress)}</span>
                            <span>{fmt(g.target_amount)}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5">
                            <div className={`h-2.5 rounded-full transition-all ${g.status === 'on_track' ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(pctDone, 100)}%` }} />
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-700">{pctDone}%</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">Contributing {fmt(g.monthly_contribution)}/mo</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : tab === 'monte-carlo' ? (
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold text-slate-900 mb-4">Simulation Parameters</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: 'Current Assets', key: 'current_assets', prefix: '$' },
                { label: 'Annual Contribution', key: 'annual_contribution', prefix: '$' },
                { label: 'Years to Retire', key: 'years_to_retire', prefix: '' },
                { label: 'Years in Retirement', key: 'years_in_retirement', prefix: '' },
                { label: 'Annual Spending', key: 'annual_spending', prefix: '$' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-slate-500 uppercase">{f.label}</label>
                  <input type="number" value={(mcInputs as any)[f.key]}
                    onChange={e => setMcInputs(prev => ({ ...prev, [f.key]: Number(e.target.value) }))}
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <Button variant="primary" className="mt-4" onClick={runMonteCarlo} disabled={running}>
              {running ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Calculator className="w-4 h-4 mr-1" />}
              Run 1,000 Simulations
            </Button>
          </Card>

          {mcResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card size="sm" className={mcResult.success_rate >= 80 ? 'ring-1 ring-emerald-300' : mcResult.success_rate >= 60 ? 'ring-1 ring-amber-300' : 'ring-1 ring-red-300'}>
                  <p className="text-xs text-slate-500 uppercase">Success Rate</p>
                  <p className={`text-3xl font-bold ${mcResult.success_rate >= 80 ? 'text-emerald-600' : mcResult.success_rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{mcResult.success_rate}%</p>
                </Card>
                <Card size="sm"><p className="text-xs text-slate-500 uppercase">Median Ending</p><p className="text-xl font-bold text-slate-900">{fmt(mcResult.median_ending_balance)}</p></Card>
                <Card size="sm"><p className="text-xs text-slate-500 uppercase">10th Percentile</p><p className="text-xl font-bold text-red-600">{fmt(mcResult.p10_ending)}</p></Card>
                <Card size="sm"><p className="text-xs text-slate-500 uppercase">90th Percentile</p><p className="text-xl font-bold text-emerald-600">{fmt(mcResult.p90_ending)}</p></Card>
              </div>

              <Card>
                <h3 className="font-semibold text-slate-900 mb-3">Wealth Projection Fan Chart</h3>
                <div className="h-48 flex items-end gap-0.5 relative">
                  {(mcResult.percentile_paths?.p50 || []).map((_: any, i: number) => {
                    if (i % 3 !== 0) return null;
                    const p90 = mcResult.percentile_paths.p90[i] || 0;
                    const p50 = mcResult.percentile_paths.p50[i] || 0;
                    const p10 = mcResult.percentile_paths.p10[i] || 0;
                    const max = Math.max(...(mcResult.percentile_paths.p90 || []));
                    const scale = max > 0 ? 100 / max : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end">
                        <div className="bg-emerald-200 rounded-t" style={{ height: `${p90 * scale * 0.48}%` }} />
                        <div className="bg-blue-400" style={{ height: `${(p50 - p10) * scale * 0.48}%` }} />
                        <div className="bg-red-200 rounded-b" style={{ height: `${p10 * scale * 0.48}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-200 rounded" />90th %ile</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-400 rounded" />Median</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-200 rounded" />10th %ile</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      ) : tab === 'social-security' ? (
        <div className="space-y-4">
          {!ssResult && (
            <Card>
              <p className="text-slate-600 mb-3">Analyze optimal Social Security claiming strategies based on life expectancy and household income needs.</p>
              <Button variant="primary" onClick={runSocialSecurity} disabled={running}>
                {running ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sun className="w-4 h-4 mr-1" />}Run Analysis
              </Button>
            </Card>
          )}
          {ssResult && (
            <div className="space-y-4">
              <Card className="bg-blue-50 border-blue-200">
                <div className="flex items-center gap-3">
                  <Sun className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">Recommended: Claim at Age {ssResult.optimal_age}</p>
                    <p className="text-sm text-blue-700">Monthly benefit: {fmt(ssResult.optimal_monthly)}</p>
                  </div>
                </div>
              </Card>
              <Card>
                <h3 className="font-semibold text-slate-900 mb-3">Claiming Scenarios</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="pb-2 text-left text-xs font-semibold text-slate-600 uppercase">Claim Age</th>
                        <th className="pb-2 text-right text-xs font-semibold text-slate-600 uppercase">Monthly</th>
                        <th className="pb-2 text-right text-xs font-semibold text-slate-600 uppercase">Annual</th>
                        <th className="pb-2 text-right text-xs font-semibold text-slate-600 uppercase">Lifetime Total</th>
                        <th className="pb-2 text-center text-xs font-semibold text-slate-600 uppercase">Adjustment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ssResult.scenarios.map((s: any) => (
                        <tr key={s.claim_age} className={`border-b border-slate-100 ${s.claim_age === ssResult.optimal_age ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                          <td className="py-2 font-medium text-slate-900">Age {s.claim_age}</td>
                          <td className="py-2 text-right text-slate-700">{fmt(s.monthly_benefit)}</td>
                          <td className="py-2 text-right text-slate-700">{fmt(s.annual_benefit)}</td>
                          <td className="py-2 text-right font-semibold text-slate-900">{fmt(s.lifetime_total)}</td>
                          <td className="py-2 text-center"><Badge variant={s.adjustment.startsWith('+') ? 'green' : s.adjustment.startsWith('-') ? 'red' : 'gray'} size="sm">{s.adjustment}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      ) : tab === 'roth' ? (
        <div className="space-y-4">
          {!rothResult && (
            <Card>
              <p className="text-slate-600 mb-3">Compare Roth conversion strategies to maximize after-tax retirement wealth.</p>
              <Button variant="primary" onClick={runRoth} disabled={running}>
                {running ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Calculator className="w-4 h-4 mr-1" />}Analyze Strategies
              </Button>
            </Card>
          )}
          {rothResult && (
            <div className="space-y-4">
              <Card className="bg-emerald-50 border-emerald-200">
                <p className="font-semibold text-emerald-900">Recommended: {fmt(rothResult.recommended_annual_conversion)}/yr conversion</p>
                <p className="text-sm text-emerald-700 mt-1">{rothResult.recommended_reason}</p>
              </Card>
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="pb-2 text-left text-xs font-semibold text-slate-600 uppercase">Annual Conversion</th>
                        <th className="pb-2 text-right text-xs font-semibold text-slate-600 uppercase">Tax Paid Now</th>
                        <th className="pb-2 text-right text-xs font-semibold text-slate-600 uppercase">Trad. Balance</th>
                        <th className="pb-2 text-right text-xs font-semibold text-slate-600 uppercase">Roth Balance</th>
                        <th className="pb-2 text-right text-xs font-semibold text-slate-600 uppercase">Net Wealth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rothResult.strategies.map((s: any) => (
                        <tr key={s.annual_conversion} className={`border-b border-slate-100 ${s.annual_conversion === rothResult.recommended_annual_conversion ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                          <td className="py-2 font-medium text-slate-900">{fmt(s.annual_conversion)}</td>
                          <td className="py-2 text-right text-red-600">{fmt(s.total_tax_paid_now)}</td>
                          <td className="py-2 text-right text-slate-700">{fmt(s.traditional_balance_at_retirement)}</td>
                          <td className="py-2 text-right text-emerald-600">{fmt(s.roth_balance_at_retirement)}</td>
                          <td className="py-2 text-right font-bold text-slate-900">{fmt(s.net_wealth_at_retirement)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      ) : tab === 'estate' && estateData ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Estate Value</p><p className="text-xl font-bold text-slate-900">{fmt(estateData.total_estate_value)}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Federal Exemption</p><p className="text-xl font-bold text-emerald-600">{fmt(estateData.federal_exemption)}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Taxable Estate</p><p className="text-xl font-bold text-slate-900">{fmt(estateData.taxable_estate)}</p></Card>
            <Card size="sm"><p className="text-xs text-slate-500 uppercase">Est. Estate Tax</p><p className="text-xl font-bold text-emerald-600">{fmt(estateData.estimated_estate_tax)}</p></Card>
          </div>
          <Card>
            <h3 className="font-semibold text-slate-900 mb-3">Estate Documents</h3>
            <div className="space-y-2">
              {(estateData.documents || []).map((d: any) => (
                <div key={d.type} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50">
                  <span className="font-medium text-slate-900">{d.type}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant={d.status === 'current' ? 'green' : 'amber'} size="sm">{d.status.replace('_', ' ')}</Badge>
                    <span className="text-xs text-slate-500">{d.last_updated}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold text-slate-900 mb-3">Recommended Strategies</h3>
            <ul className="space-y-2">
              {(estateData.strategies || []).map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600"><Target className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />{s}</li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
