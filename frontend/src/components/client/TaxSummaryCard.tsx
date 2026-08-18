import { Lightbulb, TrendingDown, TrendingUp } from 'lucide-react';
import type { B2CTaxSummary } from '../../services/b2cApi';

/* ── helpers ──────────────────────────────────────────────────────────── */

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v);
}

/* ── row ──────────────────────────────────────────────────────────────── */

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'green' | 'red' | 'amber' | 'slate';
}) {
  const toneMap = {
    green: 'text-emerald-700',
    red:   'text-red-600',
    amber: 'text-amber-700',
    slate: 'text-slate-700',
  };
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-600">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${toneMap[tone]}`}>{value}</span>
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────────── */

export interface TaxSummaryCardProps {
  data: B2CTaxSummary;
}

export function TaxSummaryCard({ data }: TaxSummaryCardProps) {
  const totalGains = data.short_term_gains + data.long_term_gains;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Tax summary</h2>
        </div>
        <span className="text-xs text-slate-400">{data.tax_year}</span>
      </div>

      {/* Rows */}
      <div>
        <Row
          label="Short-term gains"
          value={formatCurrency(data.short_term_gains)}
          tone={data.short_term_gains > 0 ? 'green' : 'slate'}
        />
        <Row
          label="Long-term gains"
          value={formatCurrency(data.long_term_gains)}
          tone={data.long_term_gains > 0 ? 'green' : 'slate'}
        />
        <Row
          label="Total realized gains"
          value={formatCurrency(totalGains)}
          tone={totalGains > 0 ? 'green' : 'slate'}
        />
        <Row
          label="Projected tax liability"
          value={formatCurrency(data.projected_tax_liability)}
          tone="amber"
        />
      </div>

      {/* TLH opportunity callout */}
      {data.tlh_opportunities > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2.5">
          <Lightbulb className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-800">
            <span className="font-medium">
              {data.tlh_opportunities} tax-loss harvesting{' '}
              {data.tlh_opportunities === 1 ? 'opportunity' : 'opportunities'} detected.
            </span>{' '}
            Estimated {formatCurrency(data.tlh_estimated_savings)} in potential tax savings.
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-3 flex items-center gap-1.5">
        <TrendingUp className="h-3 w-3 text-slate-400 flex-shrink-0" />
        <p className="text-xs text-slate-400">
          Estimates only — not tax advice. Consult a CPA for filing.
        </p>
      </div>
    </div>
  );
}
