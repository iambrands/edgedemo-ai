import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PageContainer } from '../components/layout/PageContainer';
import { generateIPS, getHouseholds } from '../lib/api';
import { useQuery } from '@tanstack/react-query';

export function IPSGenerator() {
  const [clientId] = useState(() => crypto.randomUUID());
  const genMutation = useMutation({
    mutationFn: (params) => generateIPS(params || {
      client_id: clientId,
      first_name: 'Nicole',
      last_name: 'Wilson',
      q1_investment_experience: 3,
      q2_risk_comfort: 3,
      q3_loss_reaction: 3,
      q4_income_stability: 3,
      q5_emergency_fund: 3,
      q6_investment_goal: 3,
      q7_time_horizon_years: 15,
      q8_withdrawal_needs: 4,
      q9_portfolio_volatility: 3,
      q10_financial_knowledge: 3,
    }),
  });
  const { data: households = [] } = useQuery({ queryKey: ['households'], queryFn: getHouseholds });

  return (
    <PageContainer title="Investment Policy Statement Generator">
      <div className="flex gap-4 mb-6">
        <select className="border rounded-lg px-4 py-2">
          <option>Select Household</option>
          {households.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
        <select className="border rounded-lg px-4 py-2">
          <option>Select Portfolio</option>
        </select>
        <button
          onClick={() => genMutation.mutate()}
          disabled={genMutation.isPending}
          className="px-6 py-2 bg-primary text-white rounded-lg"
        >
          {genMutation.isPending ? 'Generating...' : 'Generate IPS'}
        </button>
      </div>
      {genMutation.data && (
        <div className="bg-white rounded-lg border border-[var(--border)] p-6">
          <h3 className="font-semibold mb-4">IPS Preview</h3>
          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{genMutation.data.executive_summary}</p>
          <div className="flex gap-4 mt-6">
            <button className="px-4 py-2 border rounded-lg">Download PDF</button>
            <button className="px-4 py-2 border rounded-lg">Email to Client</button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
