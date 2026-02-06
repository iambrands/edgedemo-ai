import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { projectRetirement, analyzeGoals, analyzeCashflow } from '../lib/api';
import { PageContainer } from '../components/layout/PageContainer';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, TrendingUp, DollarSign } from 'lucide-react';

export default function FinancialPlan() {
  const [activeTab, setActiveTab] = useState('retirement');

  return (
    <PageContainer title="Financial Planning">
      <div className="flex gap-2 mb-6 border-b border-[var(--border)]">
        {['retirement', 'goals', 'cashflow'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-[var(--text-muted)]'
            }`}
          >
            {tab === 'retirement' ? 'Retirement Projection' : tab === 'goals' ? 'Goal Tracker' : 'Cash Flow'}
          </button>
        ))}
      </div>

      {activeTab === 'retirement' && <RetirementTab />}
      {activeTab === 'goals' && <GoalsTab />}
      {activeTab === 'cashflow' && <CashflowTab />}
    </PageContainer>
  );
}

function RetirementTab() {
  const [input, setInput] = useState({
    current_age: 45,
    retirement_age: 65,
    life_expectancy: 90,
    current_savings: 250000,
    annual_contribution: 18000,
    employer_match_pct: 50,
    social_security_monthly: 2000,
    desired_annual_income: 80000,
  });

  const mutation = useMutation({
    mutationFn: projectRetirement,
  });

  const handleRun = () => {
    mutation.mutate({
      ...input,
      inflation_rate: 0.025,
      pre_retirement_return: 0.07,
      post_retirement_return: 0.05,
    });
  };

  const data = mutation.data;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-[var(--border)] p-6 shadow-sm">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">Inputs</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(input).map(([k, v]) => (
            <div key={k}>
              <label className="block text-xs text-[var(--text-muted)] mb-1">{k.replace(/_/g, ' ')}</label>
              <input
                type={typeof v === 'number' ? 'number' : 'text'}
                value={v}
                onChange={(e) => setInput((prev) => ({ ...prev, [k]: isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) }))}
                className="w-full border border-[var(--border)] rounded px-2 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>
        <button onClick={handleRun} disabled={mutation.isPending} className="mt-4 px-6 py-2 bg-primary text-white rounded-lg">
          {mutation.isPending ? 'Running...' : 'Run Projection'}
        </button>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border p-5">
              <p className="text-sm text-[var(--text-muted)]">Retirement Balance</p>
              <p className="text-xl font-semibold">${data.deterministic_projection?.retirement_balance?.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg border p-5">
              <p className="text-sm text-[var(--text-muted)]">Success Rate</p>
              <p className="text-xl font-semibold text-[var(--status-success)]">{data.monte_carlo?.success_rate}%</p>
            </div>
            <div className="bg-white rounded-lg border p-5">
              <p className="text-sm text-[var(--text-muted)]">Success Label</p>
              <p className="text-xl font-semibold">{data.monte_carlo?.success_label}</p>
            </div>
            <div className="bg-white rounded-lg border p-5">
              <p className="text-sm text-[var(--text-muted)]">Years Funded</p>
              <p className="text-xl font-semibold">{data.deterministic_projection?.years_funded}</p>
            </div>
          </div>

          {data.deterministic_projection?.timeline?.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Projection Timeline</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.deterministic_projection.timeline}>
                  <XAxis dataKey="age" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Balance']} labelFormatter={(age) => `Age ${age}`} />
                  <Line type="monotone" dataKey="balance" stroke="var(--primary-blue)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.recommendations?.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Recommendations</h3>
              <ul className="space-y-2">
                {data.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${r.priority === 'high' ? 'bg-red-100 text-red-800' : r.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100'}`}>{r.priority}</span>
                    <div>
                      <p className="font-medium">{r.action}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{r.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GoalsTab() {
  const [goals, setGoals] = useState([
    { name: 'Retirement', target_amount: 1000000, current_amount: 250000, monthly_contribution: 1500, target_date: '2045-01-01', priority: 'high' },
    { name: 'College', target_amount: 150000, current_amount: 25000, monthly_contribution: 500, target_date: '2035-09-01', priority: 'medium' },
  ]);

  const mutation = useMutation({
    mutationFn: analyzeGoals,
  });

  const handleRun = () => {
    mutation.mutate(goals.map((g) => ({ ...g, target_date: g.target_date })));
  };

  const results = mutation.data?.goals ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold mb-4">Goals</h3>
        {goals.map((g, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
            <input value={g.name} onChange={(e) => setGoals((prev) => { const n = [...prev]; n[i].name = e.target.value; return n; })} className="border rounded px-2 py-1" placeholder="Goal name" />
            <input type="number" value={g.target_amount} onChange={(e) => setGoals((prev) => { const n = [...prev]; n[i].target_amount = Number(e.target.value); return n; })} className="border rounded px-2 py-1" placeholder="Target" />
            <input type="number" value={g.current_amount} onChange={(e) => setGoals((prev) => { const n = [...prev]; n[i].current_amount = Number(e.target.value); return n; })} className="border rounded px-2 py-1" placeholder="Current" />
            <input type="number" value={g.monthly_contribution} onChange={(e) => setGoals((prev) => { const n = [...prev]; n[i].monthly_contribution = Number(e.target.value); return n; })} className="border rounded px-2 py-1" placeholder="Monthly" />
            <input type="date" value={g.target_date} onChange={(e) => setGoals((prev) => { const n = [...prev]; n[i].target_date = e.target.value; return n; })} className="border rounded px-2 py-1" />
          </div>
        ))}
        <button onClick={handleRun} disabled={mutation.isPending} className="px-6 py-2 bg-primary text-white rounded-lg">Analyze</button>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-[var(--bg-light)]"><th className="text-left py-2 px-4">Goal</th><th className="text-right">Progress</th><th className="text-right">Status</th><th className="text-right">Monthly Needed</th></tr></thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2 px-4">{r.name}</td>
                  <td className="text-right">{r.progress_pct}%</td>
                  <td className="text-right"><span className={r.status === 'on_track' ? 'text-[var(--status-success)]' : 'text-[var(--status-warning)]'}>{r.status}</span></td>
                  <td className="text-right">${r.monthly_contribution_needed?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CashflowTab() {
  const [input, setInput] = useState({ annual_income: 120000, annual_expenses: 72000, annual_savings: 24000, current_age: 45, retirement_age: 65 });
  const mutation = useMutation({
    mutationFn: () => analyzeCashflow(input),
  });
  const data = mutation.data;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold mb-4">Cash Flow Inputs</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(input).map(([k, v]) => (
            <div key={k}>
              <label className="block text-xs text-[var(--text-muted)] mb-1">{k.replace(/_/g, ' ')}</label>
              <input type="number" value={v} onChange={(e) => setInput((prev) => ({ ...prev, [k]: Number(e.target.value) }))} className="w-full border rounded px-2 py-1.5" />
            </div>
          ))}
        </div>
        <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="mt-4 px-6 py-2 bg-primary text-white rounded-lg">Run Analysis</button>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border p-5">
            <p className="text-sm text-[var(--text-muted)]">Savings Rate</p>
            <p className="text-2xl font-semibold">{data.savings_rate}%</p>
            <p className="text-sm text-[var(--text-secondary)]">{data.savings_rate_label}</p>
          </div>
          {data.projection?.length > 0 && (
            <div className="bg-white rounded-lg border p-6 col-span-2">
              <h3 className="font-semibold mb-4">Net Worth Projection</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.projection}>
                  <XAxis dataKey="age" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Net Worth']} />
                  <Line type="monotone" dataKey="net_worth" stroke="var(--primary-blue)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
