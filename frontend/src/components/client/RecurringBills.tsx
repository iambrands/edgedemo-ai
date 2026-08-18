/**
 * RecurringBills — displays a list of detected recurring subscriptions/bills.
 * Used standalone on /client/bills and as a dashboard widget.
 */
import { useEffect, useState } from 'react';
import {
  Car,
  Coffee,
  Heart,
  HelpCircle,
  Monitor,
  Music,
  Package,
  ShoppingCart,
  Repeat2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { b2cApi } from '../../services/b2cApi';
import type { B2CBill } from '../../services/b2cApi';

/* ── category icon map ────────────────────────────────────────────────────── */

const CAT_ICONS: Record<string, { Icon: LucideIcon; color: string }> = {
  groceries:    { Icon: ShoppingCart, color: '#10B981' },
  dining:       { Icon: Coffee,       color: '#F97316' },
  transport:    { Icon: Car,          color: '#3B82F6' },
  entertainment:{ Icon: Music,        color: '#8B5CF6' },
  shopping:     { Icon: Package,      color: '#F43F5E' },
  utilities:    { Icon: Monitor,      color: '#64748B' },
  health:       { Icon: Heart,        color: '#14B8A6' },
};

function getCatIcon(cat: string) {
  return CAT_ICONS[cat] ?? { Icon: HelpCircle, color: '#94A3B8' };
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

function fmt(v: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(v);
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function freqLabel(f: string) {
  return f.charAt(0).toUpperCase() + f.slice(1);
}

/* ── main component ───────────────────────────────────────────────────────── */

interface RecurringBillsProps {
  /** If true, caps the list to 5 items (for dashboard widget use). */
  compact?: boolean;
  className?: string;
}

export function RecurringBills({ compact = false, className = '' }: RecurringBillsProps) {
  const [bills, setBills] = useState<B2CBill[]>([]);
  const [totalMonthly, setTotalMonthly] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoading(true);
    b2cApi
      .getBills()
      .then((data) => {
        setBills(data.bills);
        setTotalMonthly(data.total_monthly);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load bills'))
      .finally(() => setIsLoading(false));
  }, []);

  const displayed = compact ? bills.slice(0, 5) : bills;

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-10 ${className}`}>
        <div className="h-6 w-6 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <p className={`text-sm text-red-600 px-1 ${className}`}>{error}</p>
    );
  }

  return (
    <div className={className}>
      <ul className="divide-y divide-slate-50">
        {displayed.map((bill) => {
          const { Icon, color } = getCatIcon(bill.category);
          return (
            <li key={`${bill.merchant}-${bill.frequency}`} className="flex items-center gap-3 py-3 px-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color + '20' }}
              >
                <Icon className="h-4 w-4" style={{ color }} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{bill.merchant}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <Repeat2 className="h-3 w-3 flex-shrink-0" />
                  <span>{freqLabel(bill.frequency)}</span>
                  <span>·</span>
                  <span>Next: {fmtDate(bill.next_expected_date)}</span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-slate-900 tabular-nums">{fmt(bill.amount)}</p>
                <p className="text-xs text-slate-400">/mo</p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Monthly total footer */}
      <div className="mt-2 pt-3 border-t border-slate-100 flex items-center justify-between px-1">
        <span className="text-xs text-slate-500">Total recurring / month</span>
        <span className="text-sm font-bold text-slate-900 tabular-nums">{fmt(totalMonthly)}</span>
      </div>
    </div>
  );
}
