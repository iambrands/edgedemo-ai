import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

interface AllocationSlice {
  asset_class: string;
  pct: string;
  value: string;
}

const COLORS: Record<string, string> = {
  'US Equity': '#3B82F6',
  'International Equity': '#8B5CF6',
  'Fixed Income': '#10B981',
  'Cash & Equivalents': '#F59E0B',
  Alternatives: '#EC4899',
  'Real Estate': '#F97316',
};

function getColor(assetClass: string, idx: number): string {
  return COLORS[assetClass] ?? ['#64748B', '#06B6D4', '#84CC16', '#E11D48'][idx % 4];
}

function formatCurrency(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { asset_class: string; pct: number; numValue: number } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-slate-800">{d.asset_class}</p>
      <p className="text-slate-600">{d.pct.toFixed(1)}% &middot; {formatCurrency(d.numValue)}</p>
    </div>
  );
}

interface AllocationDonutProps {
  allocation: AllocationSlice[];
  totalAum: number;
}

export function AllocationDonut({ allocation, totalAum }: AllocationDonutProps) {
  const data = allocation.map((item) => ({
    asset_class: item.asset_class,
    pct: Number(item.pct),
    numValue: Number(item.value),
  }));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold text-slate-900 text-sm mb-4">Asset Allocation</h2>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Donut */}
        <div className="relative w-44 h-44 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="numValue"
                nameKey="asset_class"
                cx="50%"
                cy="50%"
                innerRadius={54}
                outerRadius={82}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((entry, idx) => (
                  <Cell key={entry.asset_class} fill={getColor(entry.asset_class, idx)} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Total</p>
            <p className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(totalAum)}</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 min-w-0 w-full">
          {data.map((item, idx) => (
            <div key={item.asset_class} className="flex items-center gap-2.5">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getColor(item.asset_class, idx) }}
              />
              <span className="text-sm text-slate-700 flex-1 truncate">{item.asset_class}</span>
              <span className="text-sm font-medium text-slate-900 tabular-nums">{item.pct.toFixed(1)}%</span>
              <span className="text-xs text-slate-400 tabular-nums w-16 text-right">{formatCurrency(item.numValue)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
