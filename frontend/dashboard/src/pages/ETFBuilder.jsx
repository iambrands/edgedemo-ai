import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PageContainer } from '../components/layout/PageContainer';
import { buildPortfolio } from '../lib/api';

const QUESTIONS = [
  { id: 'q1', text: 'How would you describe your investment experience?', options: [
    'None - I\'m new to investing', 'Limited - I\'ve invested in savings accounts or CDs',
    'Moderate - I\'ve invested in mutual funds or ETFs', 'Good - I understand stocks, bonds, and portfolio theory',
    'Expert - I have professional investment experience',
  ]},
];

export function ETFBuilder() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({});
  const [clientId] = useState(() => crypto.randomUUID());

  const buildMutation = useMutation({
    mutationFn: () => buildPortfolio({
      client_id: clientId,
      q1_investment_experience: answers.q1 ?? 3,
      q2_risk_comfort: answers.q2 ?? 3,
      q3_loss_reaction: answers.q3 ?? 3,
      q4_income_stability: answers.q4 ?? 3,
      q5_emergency_fund: answers.q5 ?? 3,
      q6_investment_goal: answers.q6 ?? 3,
      q7_time_horizon_years: answers.q7 ?? 10,
      q8_withdrawal_needs: answers.q8 ?? 3,
      q9_portfolio_volatility: answers.q9 ?? 3,
      q10_financial_knowledge: answers.q10 ?? 3,
    }),
  });

  return (
    <PageContainer title="Build Your ETF Portfolio">
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded ${s <= step ? 'bg-primary' : 'bg-[var(--border)]'}`}
          />
        ))}
      </div>
      <div className="bg-white rounded-lg border border-[var(--border)] p-8">
        {step === 1 && (
          <>
            <h3 className="text-lg font-semibold mb-4">Question 1 of 10</h3>
            <p className="mb-6">How would you describe your investment experience?</p>
            <div className="space-y-2">
              {QUESTIONS[0].options.map((opt, i) => (
                <label key={i} className="flex items-center gap-3 p-3 rounded border cursor-pointer hover:bg-[var(--bg-light)]">
                  <input type="radio" name="q1" value={i + 1} onChange={() => setAnswers((a) => ({ ...a, q1: i + 1 }))} />
                  {opt}
                </label>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <div>
            <p className="text-[var(--text-muted)] mb-4">Risk profile and recommended allocation will appear here.</p>
            <button
              onClick={() => buildMutation.mutate()}
              disabled={buildMutation.isPending}
              className="px-6 py-2 bg-primary text-white rounded-lg"
            >
              {buildMutation.isPending ? 'Building...' : 'Build Portfolio'}
            </button>
          </div>
        )}
        {buildMutation.data && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Your Recommended Portfolio</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">{buildMutation.data.description}</p>
            <div className="grid grid-cols-4 gap-2 mb-6">
              <div className="p-3 bg-[var(--bg-light)] rounded">Equity: {buildMutation.data.equity_allocation}%</div>
              <div className="p-3 bg-[var(--bg-light)] rounded">Fixed: {buildMutation.data.fixed_income_allocation}%</div>
              <div className="p-3 bg-[var(--bg-light)] rounded">Alts: {buildMutation.data.alternatives_allocation}%</div>
              <div className="p-3 bg-[var(--bg-light)] rounded">Cash: {buildMutation.data.cash_allocation}%</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Symbol</th>
                    <th className="text-left py-2">Name</th>
                    <th className="text-right py-2">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {buildMutation.data.holdings?.map((h, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2">{h.symbol}</td>
                      <td className="py-2">{h.name}</td>
                      <td className="py-2 text-right">{h.target_weight}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="flex justify-between mt-8">
          <button onClick={() => setStep((s) => Math.max(1, s - 1))} className="text-primary">Back</button>
          {!buildMutation.data && (
            <button onClick={() => setStep((s) => Math.min(4, s + 1))} className="px-6 py-2 bg-primary text-white rounded-lg">
              Next
            </button>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
