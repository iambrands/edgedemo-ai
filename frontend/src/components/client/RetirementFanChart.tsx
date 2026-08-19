import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { B2CRetirementPlanResponse } from '../../services/b2cApi';

interface RetirementFanChartProps {
  result: B2CRetirementPlanResponse;
  yearsToRetire: number;
}

function formatCurrency(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function FanTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: number }) {
  if (!active || !payload?.length) return null;
  const p50 = payload.find((p) => p.dataKey === 'p50');
  const p10 = payload.find((p) => p.dataKey === 'p10');
  const p90 = payload.find((p) => p.dataKey === 'p90');
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-slate-800 mb-1.5">Year {label}</p>
      {p90 && <p className="text-slate-500">90th: <span className="font-medium text-slate-700">{formatCurrency(p90.value)}</span></p>}
      {p50 && <p className="text-blue-600">Median: <span className="font-bold">{formatCurrency(p50.value)}</span></p>}
      {p10 && <p className="text-slate-500">10th: <span className="font-medium text-slate-700">{formatCurrency(p10.value)}</span></p>}
    </div>
  );
}

export function RetirementFanChart({ result, yearsToRetire }: RetirementFanChartProps) {
  const { percentile_paths, total_years } = result;

  const data = Array.from({ length: total_years + 1 }, (_, i) => ({
    year: i,
    p10: percentile_paths.p10[i] ?? 0,
    p25: percentile_paths.p25[i] ?? 0,
    p50: percentile_paths.p50[i] ?? 0,
    p75: percentile_paths.p75[i] ?? 0,
    p90: percentile_paths.p90[i] ?? 0,
  }));

  return (
    <div className="w-full">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fanOuter" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fanInner" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />

            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Years', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#94A3B8' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCurrency}
              width={60}
            />

            <Tooltip content={<FanTooltip />} />

            {/* Outer band: p10-p90 */}
            <Area
              type="monotone"
              dataKey="p90"
              stroke="none"
              fill="url(#fanOuter)"
              stackId="outer"
            />
            <Area
              type="monotone"
              dataKey="p10"
              stroke="none"
              fill="transparent"
              stackId="outer-base"
            />

            {/* Inner band: p25-p75 */}
            <Area
              type="monotone"
              dataKey="p75"
              stroke="none"
              fill="url(#fanInner)"
            />
            <Area
              type="monotone"
              dataKey="p25"
              stroke="none"
              fill="white"
              fillOpacity={0.6}
            />

            {/* Median line */}
            <Area
              type="monotone"
              dataKey="p50"
              stroke="#3B82F6"
              strokeWidth={2.5}
              fill="none"
              dot={false}
              activeDot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }}
            />

            {/* Retirement marker */}
            <ReferenceLine
              x={yearsToRetire}
              stroke="#F59E0B"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: 'Retire',
                position: 'top',
                fontSize: 11,
                fill: '#F59E0B',
                fontWeight: 600,
              }}
            />

            <Legend
              verticalAlign="top"
              align="right"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
              content={() => (
                <div className="flex items-center gap-4 justify-end text-[11px] text-slate-500 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 rounded bg-blue-500 inline-block" /> Median (p50)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: 'rgba(59,130,246,0.15)' }} /> p25–p75
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: 'rgba(59,130,246,0.08)' }} /> p10–p90
                  </span>
                </div>
              )}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Explainer */}
      <div className="mt-3 rounded-lg bg-slate-50 px-4 py-3">
        <p className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-700">How to read this chart:</strong> The dark blue line shows the median outcome
          across 1,000 simulations. The shaded bands represent the range of outcomes — the inner band covers 50%
          of scenarios (p25–p75) and the outer band covers 80% (p10–p90). The yellow dashed line marks your target retirement year.
        </p>
      </div>
    </div>
  );
}
