import { useEffect, useState, useCallback } from 'react';
import { CreditCard, Car, Home, GraduationCap, HelpCircle, Download, TrendingDown, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { b2cApi } from '../../services/b2cApi';

type Debt = {
  id: string;
  name: string;
  category: string;
  lender: string;
  original_balance: number | null;
  current_balance: number;
  monthly_payment: number;
  interest_rate: number;
  maturity_date: string | null;
};

const CAT_ICONS: Record<string, LucideIcon> = {
  mortgage: Home,
  auto: Car,
  credit_card: CreditCard,
  student_loan: GraduationCap,
};
const CAT_COLORS: Record<string, string> = {
  mortgage: 'bg-blue-50 text-blue-600',
  auto: 'bg-slate-50 text-slate-600',
  credit_card: 'bg-rose-50 text-rose-600',
  student_loan: 'bg-violet-50 text-violet-600',
};
const CAT_LABELS: Record<string, string> = {
  mortgage: 'Mortgage',
  auto: 'Auto Loan',
  credit_card: 'Credit Card',
  student_loan: 'Student Loan',
};

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}
function paidOffPct(original: number | null, current: number): number {
  if (!original || original <= 0) return 0;
  return Math.min(100, Math.round(((original - current) / original) * 100));
}
function payoffMonths(balance: number, payment: number, rate: number): number | null {
  if (payment <= 0) return null;
  const monthlyRate = rate / 100 / 12;
  if (monthlyRate === 0) return Math.ceil(balance / payment);
  if (payment <= balance * monthlyRate) return null; // minimum payment scenario
  return Math.ceil(
    Math.log(payment / (payment - balance * monthlyRate)) / Math.log(1 + monthlyRate),
  );
}
function formatMonths(months: number | null): string {
  if (months === null) return 'Min payment only';
  if (months <= 12) return `${months} months`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m > 0 ? `${y}y ${m}m` : `${y} years`;
}

function downloadCSV(debts: Debt[]) {
  const header = 'Name,Category,Lender,Balance,Monthly Payment,Interest Rate,Maturity Date\n';
  const rows = debts
    .map((d) => `"${d.name}","${d.category}","${d.lender}",${d.current_balance},${d.monthly_payment},${d.interest_rate},"${d.maturity_date ?? ''}"`)
    .join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'debts.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ClientDebts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalMonthly, setTotalMonthly] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    b2cApi.getDebts()
      .then((data) => {
        setDebts(data.debts);
        setTotalBalance(data.total_balance);
        setTotalMonthly(data.total_monthly_payment);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const creditCardDebt = debts.filter((d) => d.category === 'credit_card').reduce((s, d) => s + d.current_balance, 0);
  const highInterest = debts.filter((d) => d.interest_rate >= 15);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Debts & Liabilities</h1>
            <p className="text-xs text-slate-500">Loans, credit cards, and obligations in your net worth</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => downloadCSV(debts)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 rounded-full border-4 border-rose-200 border-t-rose-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1">
              <p className="text-xs text-slate-500">Total debt balance</p>
              <p className="text-xl font-bold text-rose-600 tabular-nums">{fmt(totalBalance)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1">
              <p className="text-xs text-slate-500">Monthly debt payments</p>
              <p className="text-xl font-bold text-slate-900 tabular-nums">{fmt(totalMonthly)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1 col-span-2 sm:col-span-1">
              <p className="text-xs text-slate-500">Credit card balance</p>
              <p className={`text-xl font-bold tabular-nums ${creditCardDebt > 5000 ? 'text-rose-600' : creditCardDebt > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {fmt(creditCardDebt)}
              </p>
            </div>
          </div>

          {/* High-interest alert */}
          {highInterest.length > 0 && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex gap-3">
              <AlertCircle size={16} className="text-rose-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-slate-700">
                <strong>{highInterest.length} high-interest {highInterest.length === 1 ? 'debt' : 'debts'}</strong> detected
                ({highInterest.map((d) => `${d.name} at ${d.interest_rate}%`).join(', ')}).
                Prioritizing these using the avalanche method saves the most in interest.
              </p>
            </div>
          )}

          {/* Debt cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {debts.map((d) => {
              const Icon = CAT_ICONS[d.category] ?? HelpCircle;
              const iconCls = CAT_COLORS[d.category] ?? 'bg-slate-50 text-slate-500';
              const paid = paidOffPct(d.original_balance, d.current_balance);
              const months = payoffMonths(d.current_balance, d.monthly_payment, d.interest_rate);
              const isHighInterest = d.interest_rate >= 15;

              return (
                <div key={d.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconCls}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 text-sm leading-snug">{d.name}</p>
                      <p className="text-xs text-slate-400">{d.lender} · {CAT_LABELS[d.category] ?? d.category}</p>
                    </div>
                    {isHighInterest && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 flex-shrink-0">High APR</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400">Balance</p>
                      <p className="font-bold text-rose-600 tabular-nums text-sm">{fmt(d.current_balance)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Monthly payment</p>
                      <p className="font-semibold text-slate-900 tabular-nums">{fmt(d.monthly_payment)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Interest rate</p>
                      <p className={`font-semibold tabular-nums ${isHighInterest ? 'text-rose-600' : 'text-slate-900'}`}>{d.interest_rate}% APR</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Payoff estimate</p>
                      <p className="font-semibold text-slate-900">{formatMonths(months)}</p>
                    </div>
                  </div>

                  {/* Progress bar for loans with original balance */}
                  {d.original_balance && paid > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>{paid}% paid off</span>
                        <span>Original: {fmt(d.original_balance)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${paid}%` }} />
                      </div>
                    </div>
                  )}

                  {d.maturity_date && (
                    <p className="text-[10px] text-slate-400">Matures {new Date(d.maturity_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-400">
            Debt balances included in net worth calculation as liabilities. Reducing high-interest
            debt is typically the highest guaranteed return on your money.
          </p>
        </>
      )}
    </div>
  );
}
