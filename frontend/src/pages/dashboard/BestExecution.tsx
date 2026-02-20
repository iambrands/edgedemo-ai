import { useState } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Clock,
  BarChart3,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type TradeSide = 'BUY' | 'SELL';

interface ExecutionTrade {
  id: string;
  date: string;
  ticker: string;
  side: TradeSide;
  qty: number;
  orderPrice: number;
  fillPrice: number;
  nbboMid: number;
  improvementBps: number;
  latencyMs: number;
  broker: string;
  venue: string;
}

interface BrokerStats {
  id: string;
  name: string;
  tradeCount: number;
  avgImprovementBps: number;
  avgLatencyMs: number;
  nbboMatchRate: number;
  overallScore: number;
}

// ============================================================================
// HELPERS
// ============================================================================

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);

const fmtNumber = (v: number) =>
  new Intl.NumberFormat('en-US').format(v);

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_TRADES: ExecutionTrade[] = [
  { id: '1', date: '2026-02-19', ticker: 'AAPL', side: 'BUY', qty: 150, orderPrice: 189.50, fillPrice: 189.42, nbboMid: 189.48, improvementBps: 3.2, latencyMs: 42, broker: 'Charles Schwab', venue: 'NYSE' },
  { id: '2', date: '2026-02-19', ticker: 'MSFT', side: 'SELL', qty: 75, orderPrice: 421.20, fillPrice: 421.35, nbboMid: 421.28, improvementBps: 3.6, latencyMs: 38, broker: 'Fidelity', venue: 'NASDAQ' },
  { id: '3', date: '2026-02-18', ticker: 'GOOGL', side: 'BUY', qty: 45, orderPrice: 175.80, fillPrice: 175.72, nbboMid: 175.76, improvementBps: 2.3, latencyMs: 55, broker: 'Pershing', venue: 'NASDAQ' },
  { id: '4', date: '2026-02-18', ticker: 'JNJ', side: 'SELL', qty: 200, orderPrice: 158.40, fillPrice: 158.48, nbboMid: 158.44, improvementBps: 2.5, latencyMs: 48, broker: 'Interactive Brokers', venue: 'NYSE' },
  { id: '5', date: '2026-02-17', ticker: 'V', side: 'BUY', qty: 80, orderPrice: 286.10, fillPrice: 286.02, nbboMid: 286.06, improvementBps: 1.4, latencyMs: 62, broker: 'Charles Schwab', venue: 'NYSE' },
  { id: '6', date: '2026-02-17', ticker: 'UNH', side: 'SELL', qty: 35, orderPrice: 521.50, fillPrice: 521.62, nbboMid: 521.56, improvementBps: 2.3, latencyMs: 41, broker: 'Fidelity', venue: 'NYSE' },
  { id: '7', date: '2026-02-16', ticker: 'HD', side: 'BUY', qty: 60, orderPrice: 379.20, fillPrice: 379.14, nbboMid: 379.18, improvementBps: 1.6, latencyMs: 51, broker: 'Pershing', venue: 'NYSE' },
  { id: '8', date: '2026-02-16', ticker: 'PG', side: 'SELL', qty: 120, orderPrice: 168.90, fillPrice: 168.98, nbboMid: 168.94, improvementBps: 2.4, latencyMs: 44, broker: 'Interactive Brokers', venue: 'NYSE' },
  { id: '9', date: '2026-02-15', ticker: 'CVX', side: 'BUY', qty: 250, orderPrice: 152.30, fillPrice: 152.24, nbboMid: 152.27, improvementBps: 2.0, latencyMs: 58, broker: 'Charles Schwab', venue: 'NYSE' },
  { id: '10', date: '2026-02-15', ticker: 'COST', side: 'SELL', qty: 25, orderPrice: 915.00, fillPrice: 915.18, nbboMid: 915.09, improvementBps: 2.0, latencyMs: 47, broker: 'Fidelity', venue: 'NASDAQ' },
];

const MOCK_BROKERS: BrokerStats[] = [
  { id: '1', name: 'Charles Schwab', tradeCount: 312, avgImprovementBps: 2.8, avgLatencyMs: 48, nbboMatchRate: 97.2, overallScore: 95.4 },
  { id: '2', name: 'Fidelity', tradeCount: 298, avgImprovementBps: 2.6, avgLatencyMs: 44, nbboMatchRate: 96.8, overallScore: 94.2 },
  { id: '3', name: 'Pershing', tradeCount: 285, avgImprovementBps: 2.2, avgLatencyMs: 52, nbboMatchRate: 95.9, overallScore: 92.1 },
  { id: '4', name: 'Interactive Brokers', tradeCount: 352, avgImprovementBps: 2.5, avgLatencyMs: 46, nbboMatchRate: 96.4, overallScore: 93.8 },
];

// ============================================================================
// SUMMARY CARD
// ============================================================================

function SummaryCard({
  icon: Icon,
  label,
  value,
  color = 'blue',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color?: 'blue' | 'emerald' | 'slate';
}) {
  const iconColors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    slate: 'bg-slate-50 text-slate-600',
  };

  const valueColors: Record<string, string> = {
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
    slate: 'text-slate-900',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-slate-500">{label}</p>
          <p className={`text-2xl font-bold ${valueColors[color]}`}>{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${iconColors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BestExecution() {
  const [trades] = useState<ExecutionTrade[]>(MOCK_TRADES);
  const [brokers] = useState<BrokerStats[]>(MOCK_BROKERS);
  const [lastAttestation] = useState('2026-01-15');
  const [nextDueDate] = useState('2026-04-15');
  const [attesting, setAttesting] = useState(false);

  const topBrokerScore = Math.max(...brokers.map((b) => b.overallScore));

  const handleAttest = () => {
    setAttesting(true);
    setTimeout(() => setAttesting(false), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Best Execution Monitoring</h1>
        <p className="text-slate-500">Monitor trade execution quality and compliance with best execution obligations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={TrendingUp} label="Avg Price Improvement" value="2.4 bps" color="blue" />
        <SummaryCard icon={BarChart3} label="Execution Quality Score" value="94.7%" color="emerald" />
        <SummaryCard icon={Clock} label="Trades Reviewed" value="1,247" color="slate" />
        <SummaryCard icon={CheckCircle} label="NBBO Match Rate" value="96.7%" color="blue" />
      </div>

      {/* Trade Execution Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 p-5 border-b border-slate-200">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Trade Execution Detail</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticker</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Side</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order Price</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fill Price</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">NBBO Mid</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Improvement (bps)</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Latency (ms)</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Broker</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Venue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trades.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-sm text-slate-600 font-mono">{t.date}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-slate-900">{t.ticker}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      t.side === 'BUY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {t.side}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono">{fmtNumber(t.qty)}</td>
                  <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono">{fmtCurrency(t.orderPrice)}</td>
                  <td className="px-5 py-3 text-sm text-slate-700 text-right font-mono">{fmtCurrency(t.fillPrice)}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 text-right font-mono">{fmtCurrency(t.nbboMid)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`text-sm font-mono font-medium ${t.improvementBps > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                      {t.improvementBps > 0 ? '+' : ''}{t.improvementBps.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-600 text-right font-mono">{t.latencyMs}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">{t.broker}</td>
                  <td className="px-5 py-3 text-sm text-slate-500">{t.venue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Broker Comparison */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 p-5 border-b border-slate-200">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Broker Comparison</h3>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {brokers.map((broker) => (
            <div
              key={broker.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 relative"
            >
              {broker.overallScore === topBrokerScore && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle className="w-3 h-3" />
                  Top Performer
                </span>
              )}
              <h4 className="text-base font-semibold text-slate-900 mb-4 pr-24">{broker.name}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Trade Count</span>
                  <span className="font-mono text-slate-700">{fmtNumber(broker.tradeCount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Avg Improvement</span>
                  <span className="font-mono text-emerald-600">{broker.avgImprovementBps.toFixed(1)} bps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Avg Latency</span>
                  <span className="font-mono text-slate-700">{broker.avgLatencyMs} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NBBO Match</span>
                  <span className="font-mono text-slate-700">{broker.nbboMatchRate}%</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Overall Score</span>
                  <span className="font-mono font-semibold text-slate-900">{broker.overallScore}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 p-5 border-b border-slate-200">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Quarterly Best Execution Attestation</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Last Attestation</p>
              <p className="text-lg font-semibold text-slate-900">{lastAttestation}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Next Due Date</p>
              <p className="text-lg font-semibold text-slate-900">{nextDueDate}</p>
            </div>
            <div className="ml-auto">
              <button
                onClick={handleAttest}
                disabled={attesting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {attesting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Attest Compliance
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-700 mb-1">Best Execution Obligations</p>
              <p>
                As a registered investment advisor, you have a fiduciary duty to seek best execution for client trades.
                This includes periodically reviewing execution quality across brokers and venues, documenting your
                process, and attesting to compliance with your best execution policy on a quarterly basis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
