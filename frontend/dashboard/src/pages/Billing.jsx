import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFeeSchedules, calculateFees, getInvoices, getRevenueSummary, getHouseholds } from '../lib/api';
import { PageContainer } from '../components/layout/PageContainer';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorDisplay from '../components/common/ErrorDisplay';
import MetricCard from '../components/dashboard/MetricCard';
import { DollarSign, FileText, TrendingUp } from 'lucide-react';

export default function Billing() {
  const [householdId, setHouseholdId] = useState('');
  const [quarter, setQuarter] = useState('Q1 2026');

  const { data: households = [] } = useQuery({ queryKey: ['households'], queryFn: getHouseholds });
  const { data: schedules, isLoading: schedLoading } = useQuery({ queryKey: ['fee-schedules'], queryFn: getFeeSchedules });
  const { data: feeCalc, isLoading: calcLoading } = useQuery({
    queryKey: ['fee-calc', householdId, quarter],
    queryFn: () => calculateFees(householdId || households[0]?.id || 'hh_001', quarter),
    enabled: !!householdId || households.length > 0,
  });
  const { data: invoices = [] } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices });
  const { data: revenue } = useQuery({ queryKey: ['revenue-summary'], queryFn: getRevenueSummary });

  useEffect(() => {
    if (households.length > 0 && !householdId) setHouseholdId(households[0].id);
  }, [households, householdId]);

  const invList = Array.isArray(invoices) ? invoices : invoices?.invoices ?? [];

  if (schedLoading) return <LoadingSpinner message="Loading billing..." />;

  return (
    <PageContainer title="Billing & Fee Management">
      <div className="space-y-6">
        {revenue && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Current Quarter Revenue" value={`$${revenue.current_quarter?.total_revenue?.toLocaleString() ?? '0'}`} changeType="neutral" icon={DollarSign} />
            <MetricCard title="Total AUM" value={`$${revenue.current_quarter?.total_aum?.toLocaleString() ?? '0'}`} changeType="neutral" icon={TrendingUp} />
            <MetricCard title="Effective Rate" value={`${revenue.current_quarter?.effective_rate_bps ?? 0} bps`} changeType="neutral" />
            <MetricCard title="Households Billed" value={revenue.current_quarter?.households_billed ?? 0} changeType="neutral" />
          </div>
        )}

        <div className="bg-white rounded-lg border border-[var(--border)] p-6 shadow-sm">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Fee Schedule</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2">Tier</th><th className="text-right">AUM Range</th><th className="text-right">Annual Rate</th></tr></thead>
              <tbody>
                {(schedules?.default_schedule ?? []).map((t, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2">{t.tier}</td>
                    <td className="text-right">${(t.aum_min ?? 0).toLocaleString()} - ${t.aum_max ? t.aum_max.toLocaleString() : '∞'}</td>
                    <td className="text-right">{t.annual_rate_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-4">Billing: {schedules?.billing_method} • {schedules?.billing_frequency} • Min fee: ${schedules?.minimum_fee}</p>
        </div>

        <div className="bg-white rounded-lg border border-[var(--border)] p-6 shadow-sm">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Fee Calculation</h3>
          <div className="flex gap-4 mb-4">
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Household</label>
              <select value={householdId} onChange={(e) => setHouseholdId(e.target.value)} className="border rounded-lg px-3 py-2">
                {households.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">Quarter</label>
              <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="border rounded-lg px-3 py-2">
                <option>Q1 2026</option>
                <option>Q4 2025</option>
                <option>Q3 2025</option>
              </select>
            </div>
          </div>
          {feeCalc && (
            <div>
              <p className="text-lg font-semibold">Quarterly Fee: ${feeCalc.quarterly_fee?.toLocaleString()} | Annual: ${feeCalc.annual_fee?.toLocaleString()}</p>
              <table className="w-full text-sm mt-4">
                <thead><tr className="border-b"><th className="text-left py-2">Account</th><th className="text-right">AUM</th><th className="text-right">Fee</th></tr></thead>
                <tbody>
                  {(feeCalc.by_account ?? []).map((a, i) => (
                    <tr key={i} className="border-b"><td className="py-2">{a.account}</td><td className="text-right">${Number(a.aum).toLocaleString()}</td><td className="text-right">${Number(a.fee).toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-[var(--text-muted)] mt-4">{feeCalc.fee_disclosure}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
          <h3 className="font-semibold p-4 border-b">Invoices</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-[var(--bg-light)]"><th className="text-left py-2 px-4">Household</th><th className="text-left">Quarter</th><th className="text-right">Amount</th><th className="text-left">Status</th></tr></thead>
            <tbody>
              {invList.map((inv) => (
                <tr key={inv.id} className="border-b">
                  <td className="py-2 px-4">{inv.household_name}</td>
                  <td>{inv.quarter}</td>
                  <td className="text-right">${Number(inv.amount).toLocaleString()}</td>
                  <td><span className={inv.status === 'paid' ? 'text-[var(--status-success)]' : 'text-[var(--status-warning)]'}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {invList.length === 0 && <p className="p-6 text-[var(--text-muted)]">No invoices.</p>}
        </div>
      </div>
    </PageContainer>
  );
}
