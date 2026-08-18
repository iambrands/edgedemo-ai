export interface FeeAnalyzerChartProps {
  /** User's effective fee rate as a percentage (e.g. 0.65 for 0.65%). */
  userFeeRate: number;
  /** Portfolio value used for annual cost and savings estimates. */
  portfolioValue: number;
  /** Robo-advisor benchmark rate (default 0.25%). */
  roboBenchmark?: number;
  /** Traditional advisor benchmark rate (default 1.0%). */
  traditionalBenchmark?: number;
}

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function userBarTone(rate: number, robo: number, traditional: number): string {
  if (rate <= robo) return 'bg-emerald-500';
  if (rate <= traditional) return 'bg-amber-500';
  return 'bg-red-500';
}

function userBarLabel(rate: number, robo: number, traditional: number): string {
  if (rate <= robo) return 'Below robo average';
  if (rate <= traditional) return 'Above robo, below traditional';
  return 'Above traditional average';
}

interface BarRowProps {
  label: string;
  ratePct: number;
  maxRate: number;
  annualCost: number;
  barClassName: string;
  emphasize?: boolean;
}

function BarRow({ label, ratePct, maxRate, annualCost, barClassName, emphasize }: BarRowProps) {
  const widthPct = maxRate > 0 ? Math.min(100, (ratePct / maxRate) * 100) : 0;

  return (
    <div className={emphasize ? 'rounded-lg bg-slate-50 p-3 -mx-1' : ''}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`text-xs ${emphasize ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
          {label}
        </span>
        <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
          {ratePct.toFixed(2)}% · {formatCurrency(annualCost)}/yr
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barClassName}`}
          style={{ width: `${Math.max(widthPct, ratePct > 0 ? 4 : 0)}%` }}
          role="presentation"
        />
      </div>
    </div>
  );
}

export function FeeAnalyzerChart({
  userFeeRate,
  portfolioValue,
  roboBenchmark = 0.25,
  traditionalBenchmark = 1.0,
}: FeeAnalyzerChartProps) {
  const maxRate = Math.max(userFeeRate, roboBenchmark, traditionalBenchmark, 0.01);
  const userAnnual = (userFeeRate / 100) * portfolioValue;
  const roboAnnual = (roboBenchmark / 100) * portfolioValue;
  const traditionalAnnual = (traditionalBenchmark / 100) * portfolioValue;
  const savingsVsTraditional = Math.max(0, traditionalAnnual - userAnnual);
  const savingsVsRobo = userAnnual - roboAnnual;

  const toneClass = userBarTone(userFeeRate, roboBenchmark, traditionalBenchmark);
  const toneLabel = userBarLabel(userFeeRate, roboBenchmark, traditionalBenchmark);

  return (
    <div className="space-y-4">
      <BarRow
        label="Your portfolio"
        ratePct={userFeeRate}
        maxRate={maxRate}
        annualCost={userAnnual}
        barClassName={toneClass}
        emphasize
      />
      <BarRow
        label="Robo-advisor average"
        ratePct={roboBenchmark}
        maxRate={maxRate}
        annualCost={roboAnnual}
        barClassName="bg-blue-400"
      />
      <BarRow
        label="Traditional advisor average"
        ratePct={traditionalBenchmark}
        maxRate={maxRate}
        annualCost={traditionalAnnual}
        barClassName="bg-slate-400"
      />

      <div className="pt-2 border-t border-slate-100 space-y-1">
        <p className="text-xs text-slate-600">
          <span className="font-medium text-slate-800">{toneLabel}.</span>{' '}
          {savingsVsTraditional > 0 ? (
            <>
              You pay about{' '}
              <span className="font-medium text-emerald-700">
                {formatCurrency(savingsVsTraditional)} less per year
              </span>{' '}
              than a typical 1% advisor on this balance.
            </>
          ) : (
            <>Your fees are at or above the traditional advisor benchmark.</>
          )}
        </p>
        {savingsVsRobo > 0 && userFeeRate > roboBenchmark && (
          <p className="text-xs text-amber-700">
            Switching to a robo-style fee ({roboBenchmark.toFixed(2)}%) could save about{' '}
            {formatCurrency(savingsVsRobo)}/yr at your current balance.
          </p>
        )}
      </div>
    </div>
  );
}

/** Build chart props from dashboard fee_benchmarks + total AUM. */
export function feeBenchmarksToChartProps(
  feeBenchmarks: Array<{ label: string; rate_pct: string; annual_cost_at_aum: string }>,
  totalAum: string | number,
): FeeAnalyzerChartProps | null {
  const portfolioValue = typeof totalAum === 'number' ? totalAum : Number(totalAum);
  if (!Number.isFinite(portfolioValue) || portfolioValue <= 0) return null;

  const findRate = (needle: string) => {
    const row = feeBenchmarks.find((b) => b.label.toLowerCase().includes(needle));
    return row ? Number(row.rate_pct) : undefined;
  };

  const userFeeRate = findRate('your portfolio') ?? findRate('portfolio');
  if (userFeeRate === undefined || !Number.isFinite(userFeeRate)) return null;

  return {
    userFeeRate,
    portfolioValue,
    roboBenchmark: findRate('robo') ?? 0.25,
    traditionalBenchmark: findRate('traditional') ?? 1.0,
  };
}
