import { ArrowDown, ArrowUp, Banknote, PiggyBank, Receipt, TrendingUp } from 'lucide-react';

interface KPIStripProps {
  totalInvested: number;
  cashReserves: number;
  monthlySpend?: number;
  annualFees?: number;
  netWorthChange?: number;
  netWorthChangePct?: number;
}

function formatCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

interface MetricProps {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  iconColor: string;
  iconBg: string;
  delta?: { value: string; positive: boolean } | null;
}

function Metric({ label, value, icon: Icon, iconColor, iconBg, delta }: MetricProps) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide truncate">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <p className="text-base font-bold text-slate-900 tabular-nums">{value}</p>
          {delta && (
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${delta.positive ? 'text-emerald-600' : 'text-red-500'}`}>
              {delta.positive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {delta.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function KPIStrip({
  totalInvested,
  cashReserves,
  monthlySpend,
  annualFees,
  netWorthChange,
  netWorthChangePct,
}: KPIStripProps) {
  const changeDelta = netWorthChange != null && netWorthChangePct != null
    ? { value: `${Math.abs(netWorthChangePct).toFixed(1)}%`, positive: netWorthChange >= 0 }
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Metric
          label="Invested"
          value={formatCompact(totalInvested)}
          icon={TrendingUp}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          delta={changeDelta}
        />
        <Metric
          label="Cash reserves"
          value={formatCompact(cashReserves)}
          icon={PiggyBank}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        {monthlySpend != null && (
          <Metric
            label="Monthly spend"
            value={formatCompact(monthlySpend)}
            icon={Receipt}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
        )}
        {annualFees != null && (
          <Metric
            label="Annual fees"
            value={formatCompact(annualFees)}
            icon={Banknote}
            iconBg="bg-rose-50"
            iconColor="text-rose-500"
          />
        )}
      </div>
    </div>
  );
}
