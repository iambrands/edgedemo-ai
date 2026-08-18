import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';

/* ── types ────────────────────────────────────────────────────────────── */

export interface NetWorthDataPoint {
  date: string;
  value: number;
}

type Period = '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'All';

const PERIODS: { key: Period; label: string }[] = [
  { key: '1M',  label: '1M' },
  { key: '3M',  label: '3M' },
  { key: '6M',  label: '6M' },
  { key: 'YTD', label: 'YTD' },
  { key: '1Y',  label: '1Y' },
  { key: 'All', label: 'All' },
];

/* ── helpers ──────────────────────────────────────────────────────────── */

function filterByPeriod(data: NetWorthDataPoint[], period: Period): NetWorthDataPoint[] {
  if (!data.length || period === 'All') return data;
  const now = new Date();
  let cutoff: Date;
  if (period === '1M') {
    cutoff = new Date(now);
    cutoff.setMonth(now.getMonth() - 1);
  } else if (period === '3M') {
    cutoff = new Date(now);
    cutoff.setMonth(now.getMonth() - 3);
  } else if (period === '6M') {
    cutoff = new Date(now);
    cutoff.setMonth(now.getMonth() - 6);
  } else if (period === 'YTD') {
    cutoff = new Date(now.getFullYear(), 0, 1);
  } else {
    // 1Y
    cutoff = new Date(now);
    cutoff.setFullYear(now.getFullYear() - 1);
  }
  return data.filter((d) => new Date(d.date + 'T00:00:00') >= cutoff);
}

function formatCurrency(v: number): string {
  if (!Number.isFinite(v)) return '$0';
  if (Math.abs(v) >= 1_000_000) {
    return `$${(v / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(v) >= 1_000) {
    return `$${(v / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtLabel(dateStr: string, filtered: NetWorthDataPoint[]): string {
  const d = new Date(dateStr + 'T00:00:00');
  // If spanning > 6 months show "Mon 'YY", else "Mon DD"
  if (filtered.length > 6) {
    return d.toLocaleDateString('en-US', { month: 'short' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── tooltip ──────────────────────────────────────────────────────────── */

interface TooltipPayload {
  value: number;
  payload: { date: string };
}

function NetWorthTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const d = new Date(p.payload.date + 'T00:00:00');
  const dateLabel = d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="text-xs text-slate-500 mb-0.5">{dateLabel}</p>
      <p className="font-semibold text-slate-900">
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0,
        }).format(p.value)}
      </p>
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────────── */

export interface NetWorthChartProps {
  data: NetWorthDataPoint[];
  /** Chart height in px. Default: 160 */
  height?: number;
  /** Show period selector pills. Default: true */
  showPeriodSelector?: boolean;
  /** Default period. Default: '1Y' */
  defaultPeriod?: Period;
  className?: string;
}

export default function NetWorthChart({
  data,
  height = 160,
  showPeriodSelector = true,
  defaultPeriod = '1Y',
  className,
}: NetWorthChartProps) {
  const [period, setPeriod] = useState<Period>(defaultPeriod);

  const filtered = useMemo(() => filterByPeriod(data, period), [data, period]);

  const chartData = useMemo(
    () => filtered.map((p) => ({ ...p, label: fmtLabel(p.date, filtered) })),
    [filtered],
  );

  const firstVal = chartData[0]?.value ?? 0;
  const lastVal = chartData[chartData.length - 1]?.value ?? 0;
  const change = lastVal - firstVal;
  const changePct = firstVal > 0 ? (change / firstVal) * 100 : 0;
  const isPositive = change >= 0;

  if (!data.length) return null;

  return (
    <div className={className}>
      {/* Period selector + delta */}
      {showPeriodSelector && (
        <div className="flex items-center justify-between px-6 pt-3 pb-1">
          {/* Delta badge */}
          <span
            className={`text-xs font-medium ${
              isPositive ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {isPositive ? '+' : ''}
            {formatCurrency(change)}{' '}
            <span className="text-slate-400 font-normal">
              ({Math.abs(changePct).toFixed(1)}%)
            </span>
          </span>

          {/* Period pills */}
          <div className="flex items-center gap-0.5">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                  period === key
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="nwChartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              dy={2}
              padding={{ left: 12, right: 12 }}
            />
            <Tooltip content={<NetWorthTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3B82F6"
              strokeWidth={2.5}
              fill="url(#nwChartGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
