import { useState } from 'react';
import {
  PieChart,
  DollarSign,
  Receipt,
  AlertTriangle,
  Layers,
  FileText,
  Play,
  Loader2,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { AnalysisModal } from '../../components/features/AnalysisModal';
import { analysisApi } from '../../services/api';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ToolType = 'portfolio' | 'fee' | 'tax' | 'risk' | 'etf' | 'ips';

interface AnalysisTool {
  id: ToolType;
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  status: 'available' | 'coming-soon';
}

interface ToolState {
  isRunning: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: Record<string, any> | null;
  error: string | null;
  lastRunAt: Date | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ANALYSIS_TOOLS: AnalysisTool[] = [
  {
    id: 'portfolio',
    title: 'Portfolio Analysis',
    description:
      'Comprehensive portfolio analysis including asset allocation, diversification metrics, and optimization suggestions.',
    icon: PieChart,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    status: 'available',
  },
  {
    id: 'fee',
    title: 'Fee Analysis',
    description:
      'Identify hidden fees, expense ratios, and cost optimization opportunities across all accounts.',
    icon: DollarSign,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    status: 'available',
  },
  {
    id: 'tax',
    title: 'Tax Analysis',
    description:
      'Tax-loss harvesting opportunities, asset location optimization, and tax efficiency scoring.',
    icon: Receipt,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    status: 'available',
  },
  {
    id: 'risk',
    title: 'Risk Analysis',
    description:
      'Risk assessment including concentration analysis, correlation metrics, and stress testing scenarios.',
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    status: 'available',
  },
  {
    id: 'etf',
    title: 'ETF Builder',
    description:
      'Build custom ETF portfolios with factor-based screening and replication strategies.',
    icon: Layers,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    status: 'available',
  },
  {
    id: 'ips',
    title: 'IPS Generator',
    description:
      'Generate compliant Investment Policy Statements based on client profiles and objectives.',
    icon: FileText,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    status: 'available',
  },
];

const DEMO_HOUSEHOLD_ID = 'hh-001';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Analysis() {
  const [toolStates, setToolStates] = useState<Record<string, ToolState>>(() => {
    const init: Record<string, ToolState> = {};
    ANALYSIS_TOOLS.forEach((t) => {
      init[t.id] = { isRunning: false, results: null, error: null, lastRunAt: null };
    });
    return init;
  });

  const [selectedTool, setSelectedTool] = useState<AnalysisTool | null>(null);

  /* ── Run Analysis ─────────────────────────────────────────────── */
  const runAnalysis = async (toolId: string) => {
    setToolStates((prev) => ({
      ...prev,
      [toolId]: { ...prev[toolId], isRunning: true, error: null },
    }));

    try {
      const data = await analysisApi.run(toolId, DEMO_HOUSEHOLD_ID);
      setToolStates((prev) => ({
        ...prev,
        [toolId]: { isRunning: false, results: data, error: null, lastRunAt: new Date() },
      }));
    } catch (err) {
      setToolStates((prev) => ({
        ...prev,
        [toolId]: {
          ...prev[toolId],
          isRunning: false,
          error: err instanceof Error ? err.message : 'Analysis failed — please try again.',
        },
      }));
    }
  };

  /* ── View Report ──────────────────────────────────────────────── */
  const viewReport = (tool: AnalysisTool) => {
    const state = toolStates[tool.id];
    if (!state.results) {
      // Run analysis first, then open modal once results come back
      runAnalysis(tool.id).then(() => setSelectedTool(tool));
      return;
    }
    setSelectedTool(tool);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analysis Tools</h1>
        <p className="text-slate-500">
          AI-powered analysis tools for comprehensive portfolio insights
        </p>
      </div>

      {/* Tool Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ANALYSIS_TOOLS.map((tool) => {
          const state = toolStates[tool.id];
          return (
            <div
              key={tool.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${tool.iconBg} rounded-xl flex items-center justify-center`}>
                    <tool.icon className={`w-6 h-6 ${tool.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{tool.title}</h3>
                    {state.lastRunAt ? (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeAgo(state.lastRunAt)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Not run yet</span>
                    )}
                  </div>
                </div>
                {state.results ? (
                  <Badge variant="green">
                    <CheckCircle className="w-3 h-3 mr-1 inline" />
                    Complete
                  </Badge>
                ) : (
                  <Badge variant="gray">Available</Badge>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-slate-500 mb-4 flex-1">{tool.description}</p>

              {/* Inline Results Preview */}
              {state.results && (
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <InlinePreview type={tool.id} data={state.results} />
                </div>
              )}

              {/* Error */}
              {state.error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {state.error}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => runAnalysis(tool.id)}
                  disabled={state.isRunning}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    state.isRunning
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {state.isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      {state.results ? 'Re-run' : 'Run Analysis'}
                    </>
                  )}
                </button>
                <button
                  onClick={() => viewReport(tool)}
                  disabled={state.isRunning}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    state.isRunning
                      ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Report
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Analysis</h2>
        <p className="text-slate-500 text-sm mb-4">
          Run a quick analysis on a specific household to get instant insights.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { name: 'Wilson Household', date: 'Feb 4, 2026' },
            { name: 'Henderson Family', date: 'Jan 28, 2026' },
            { name: 'Martinez Retirement', date: 'Jan 30, 2026' },
          ].map((hh) => (
            <div key={hh.name} className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-700 mb-1">{hh.name}</p>
              <p className="text-xs text-slate-500">Last analyzed: {hh.date}</p>
              <button
                onClick={() => {
                  const tool = ANALYSIS_TOOLS[0];
                  runAnalysis(tool.id).then(() => setSelectedTool(tool));
                }}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Run Analysis →
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Analysis Modal — opens with full results view */}
      {selectedTool && (
        <AnalysisModal
          isOpen={!!selectedTool}
          onClose={() => setSelectedTool(null)}
          toolType={selectedTool.id}
          toolTitle={selectedTool.title}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline Preview — compact summary shown on the card                 */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InlinePreview({ type, data }: { type: string; data: Record<string, any> }) {
  switch (type) {
    case 'portfolio':
      return (
        <div className="grid grid-cols-3 gap-2 text-xs">
          {(data.metrics || []).slice(0, 3).map((m: { label: string; value: string }, i: number) => (
            <div key={i}>
              <span className="text-slate-500">{m.label}</span>
              <p className="font-semibold text-slate-900">{m.value}</p>
            </div>
          ))}
        </div>
      );

    case 'fee':
      return (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-slate-500">Annual Fees</span>
            <p className="font-semibold text-red-600">${(data.totalFees || 0).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-500">Fee %</span>
            <p className="font-semibold text-slate-900">{data.feePercentage}%</p>
          </div>
          <div>
            <span className="text-slate-500">Potential Savings</span>
            <p className="font-semibold text-emerald-600">${(data.potentialSavings || 0).toLocaleString()}</p>
          </div>
        </div>
      );

    case 'tax':
      return (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-slate-500">Unrealized Gains</span>
            <p className="font-semibold text-emerald-600">+${(data.unrealizedGains || 0).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-500">Unrealized Losses</span>
            <p className="font-semibold text-red-600">-${(data.unrealizedLosses || 0).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-slate-500">Efficiency</span>
            <p className="font-semibold text-slate-900">{data.taxEfficiencyScore}/100</p>
          </div>
        </div>
      );

    case 'risk':
      return (
        <div className="text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-500">Risk Score</span>
            <span className={`font-bold ${
              (data.riskScore || 0) > 70 ? 'text-red-600' : (data.riskScore || 0) > 40 ? 'text-amber-600' : 'text-emerald-600'
            }`}>{data.riskScore}/100</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                (data.riskScore || 0) > 70 ? 'bg-red-500' : (data.riskScore || 0) > 40 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${data.riskScore || 0}%` }}
            />
          </div>
          <p className="text-slate-500 mt-1">{(data.riskFactors || []).filter((f: { level: string }) => f.level === 'high').length} high-risk factors</p>
        </div>
      );

    case 'etf':
      return (
        <div className="text-xs">
          <p className="text-slate-500 mb-1">{(data.recommendations || []).length} ETFs recommended</p>
          <p className="font-semibold text-emerald-600">Expense ratio: {data.totalExpenseRatio}%</p>
        </div>
      );

    case 'ips':
      return (
        <div className="text-xs">
          <p className="text-slate-500 mb-1 line-clamp-2">{data.clientProfile}</p>
          <p className="font-semibold text-indigo-600">IPS Document Ready</p>
        </div>
      );

    default:
      return <p className="text-xs text-slate-500">Analysis complete</p>;
  }
}
