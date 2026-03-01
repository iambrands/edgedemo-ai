import type { ReactNode } from 'react';
import { clsx } from 'clsx';

type MetricColor = 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'teal' | 'indigo' | 'slate';

const colorMap: Record<MetricColor, { bg: string; text: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600' },
  red:     { bg: 'bg-red-50',     text: 'text-red-600' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-600' },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-600' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600' },
  slate:   { bg: 'bg-slate-100',  text: 'text-slate-600' },
};

interface MetricCardProps {
  /** Small uppercase label above the value */
  label: string;
  /** Large primary value (formatted currency, number, etc.) */
  value: string;
  /** Optional secondary text below value */
  sublabel?: string;
  /** Lucide icon component or ReactNode for the icon */
  icon?: ReactNode;
  /** Color theme for the icon badge */
  color?: MetricColor;
  /** Additional className */
  className?: string;
}

/**
 * Standardized KPI / summary metric card used across Overview, Trading,
 * Billing, PortalDashboard, and other pages with summary grids.
 *
 * @example
 * <MetricCard
 *   label="Total AUM"
 *   value="$8.83M"
 *   sublabel="+12.4% YTD"
 *   icon={<DollarSign size={18} />}
 *   color="blue"
 * />
 */
export function MetricCard({ label, value, sublabel, icon, color = 'blue', className }: MetricCardProps) {
  const c = colorMap[color];

  return (
    <div className={clsx('bg-white border border-slate-200 rounded-xl p-5 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        {icon && (
          <div className={clsx('p-2 rounded-lg', c.bg)}>
            <div className={c.text}>{icon}</div>
          </div>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {sublabel && (
        <p className="mt-1 text-sm text-slate-500">{sublabel}</p>
      )}
    </div>
  );
}
