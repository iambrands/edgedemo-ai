import { useState, useEffect } from 'react';
import { X, Loader2, Download, RefreshCw } from 'lucide-react';
import { householdsApi, analysisApi, type Household } from '../../services/api';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolType: 'portfolio' | 'fee' | 'tax' | 'risk' | 'etf' | 'ips';
  toolTitle: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalysisResults = Record<string, any>;

export function AnalysisModal({ isOpen, onClose, toolType, toolTitle }: AnalysisModalProps) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      householdsApi.list()
        .then(setHouseholds)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedHousehold('');
      setResults(null);
      setError(null);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const runAnalysis = async () => {
    if (!selectedHousehold) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Call the backend API
      const response = await analysisApi.run(toolType, selectedHousehold);
      setResults(response);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{toolTitle}</h3>
              <p className="text-sm text-slate-500">Select a household to analyze</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-primary-500" size={32} />
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                {/* Household Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Household
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {households.map((hh) => (
                      <button
                        key={hh.id}
                        onClick={() => setSelectedHousehold(hh.id)}
                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                          selectedHousehold === hh.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-medium text-slate-900">{hh.name}</div>
                        <div className="text-sm text-slate-500">
                          {hh.members?.join(', ')} • ${hh.totalValue?.toLocaleString()}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Run Analysis Button */}
                {selectedHousehold && !results && (
                  <button
                    onClick={runAnalysis}
                    disabled={isAnalyzing}
                    className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Running {toolTitle}...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={20} />
                        Run {toolTitle}
                      </>
                    )}
                  </button>
                )}

                {/* Results */}
                {results && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-slate-900">Analysis Results</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setResults(null)}
                          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1 transition-colors"
                        >
                          <RefreshCw size={14} />
                          Re-run
                        </button>
                        <button
                          className="px-3 py-1.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-1 transition-colors"
                        >
                          <Download size={14} />
                          Export
                        </button>
                      </div>
                    </div>
                    
                    {/* Render results based on tool type */}
                    <AnalysisResultsView type={toolType} data={results} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Results renderer based on tool type
function AnalysisResultsView({ type, data }: { type: string; data: AnalysisResults }) {
  switch (type) {
    case 'portfolio':
      return <PortfolioResults data={data as PortfolioData} />;
    case 'fee':
      return <FeeResults data={data as FeeData} />;
    case 'tax':
      return <TaxResults data={data as TaxData} />;
    case 'risk':
      return <RiskResults data={data as RiskData} />;
    case 'etf':
      return <ETFResults data={data as ETFData} />;
    case 'ips':
      return <IPSResults data={data as IPSData} />;
    default:
      return null;
  }
}

// Type definitions for results
interface PortfolioData {
  allocation: { category: string; percentage: number; color: string }[];
  metrics: { label: string; value: string }[];
  recommendations: string[];
}

interface FeeData {
  totalFees: number;
  feePercentage: number;
  potentialSavings: number;
  breakdown: { account: string; feePercent: number; annualCost: number; status: string }[];
}

interface TaxData {
  unrealizedGains: number;
  unrealizedLosses: number;
  taxEfficiencyScore: number;
  harvestingOpportunities: { ticker: string; description: string; loss: number }[];
}

interface RiskData {
  riskScore: number;
  riskFactors: { name: string; description: string; level: string }[];
}

interface ETFData {
  recommendations: { ticker: string; name: string; category: string; allocation: number; expenseRatio: number }[];
  totalExpenseRatio: number;
}

interface IPSData {
  clientProfile: string;
  objectives: string;
  riskTolerance: string;
  allocationGuidelines: string;
  rebalancingPolicy: string;
}

function PortfolioResults({ data }: { data: PortfolioData }) {
  return (
    <div className="space-y-4">
      {/* Allocation Chart */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-slate-700 mb-3">Asset Allocation</h5>
        <div className="space-y-2">
          {data.allocation.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-24 text-sm text-slate-600">{item.category}</div>
              <div className="flex-1 h-6 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                />
              </div>
              <div className="w-12 text-sm font-medium text-right">{item.percentage}%</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        {data.metrics.map((metric, i) => (
          <div key={i} className="bg-slate-50 rounded-lg p-4">
            <div className="text-sm text-slate-500">{metric.label}</div>
            <div className="text-xl font-semibold text-slate-900">{metric.value}</div>
          </div>
        ))}
      </div>
      
      {/* Recommendations */}
      <div className="bg-primary-50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-primary-800 mb-2">Recommendations</h5>
        <ul className="space-y-1">
          {data.recommendations.map((rec, i) => (
            <li key={i} className="text-sm text-primary-700 flex items-start gap-2">
              <span className="text-primary-500 mt-0.5">•</span>
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function FeeResults({ data }: { data: FeeData }) {
  return (
    <div className="space-y-4">
      {/* Fee Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-red-600">Current Annual Fees</div>
          <div className="text-2xl font-bold text-red-700">${data.totalFees.toLocaleString()}</div>
          <div className="text-sm text-red-600">{data.feePercentage}% of portfolio</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600">Potential Savings</div>
          <div className="text-2xl font-bold text-green-700">${data.potentialSavings.toLocaleString()}</div>
          <div className="text-sm text-green-600">per year</div>
        </div>
      </div>
      
      {/* Fee Breakdown */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-slate-700 mb-3">Fee Breakdown by Account</h5>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 text-slate-500 font-medium">Account</th>
              <th className="text-right py-2 text-slate-500 font-medium">Fee %</th>
              <th className="text-right py-2 text-slate-500 font-medium">Annual Cost</th>
              <th className="text-right py-2 text-slate-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.breakdown.map((item, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2 text-slate-900">{item.account}</td>
                <td className="py-2 text-right font-mono">{item.feePercent}%</td>
                <td className="py-2 text-right font-mono">${item.annualCost.toLocaleString()}</td>
                <td className="py-2 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    item.status === 'high' ? 'bg-red-100 text-red-700' :
                    item.status === 'moderate' ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaxResults({ data }: { data: TaxData }) {
  return (
    <div className="space-y-4">
      {/* Tax Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-sm text-slate-500">Unrealized Gains</div>
          <div className="text-xl font-bold text-green-600">+${data.unrealizedGains.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-sm text-slate-500">Unrealized Losses</div>
          <div className="text-xl font-bold text-red-600">-${data.unrealizedLosses.toLocaleString()}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="text-sm text-slate-500">Tax Efficiency Score</div>
          <div className="text-xl font-bold text-primary-600">{data.taxEfficiencyScore}/100</div>
        </div>
      </div>
      
      {/* Tax-Loss Harvesting Opportunities */}
      <div className="bg-amber-50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-amber-800 mb-2">Tax-Loss Harvesting Opportunities</h5>
        <ul className="space-y-2">
          {data.harvestingOpportunities.map((opp, i) => (
            <li key={i} className="text-sm text-amber-700 flex justify-between">
              <span>{opp.ticker} — {opp.description}</span>
              <span className="font-medium">-${opp.loss.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RiskResults({ data }: { data: RiskData }) {
  return (
    <div className="space-y-4">
      {/* Risk Score */}
      <div className="bg-slate-50 rounded-lg p-6 text-center">
        <div className="text-sm text-slate-500 mb-2">Overall Risk Score</div>
        <div className={`text-5xl font-bold ${
          data.riskScore > 70 ? 'text-red-600' :
          data.riskScore > 40 ? 'text-amber-600' :
          'text-green-600'
        }`}>
          {data.riskScore}
        </div>
        <div className="text-sm text-slate-500 mt-1">out of 100</div>
      </div>
      
      {/* Risk Factors */}
      <div className="space-y-3">
        {data.riskFactors.map((factor, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <div className="font-medium text-slate-900">{factor.name}</div>
              <div className="text-sm text-slate-500">{factor.description}</div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              factor.level === 'high' ? 'bg-red-100 text-red-700' :
              factor.level === 'moderate' ? 'bg-amber-100 text-amber-700' :
              'bg-green-100 text-green-700'
            }`}>
              {factor.level}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ETFResults({ data }: { data: ETFData }) {
  return (
    <div className="space-y-4">
      <div className="bg-primary-50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-primary-800 mb-2">Recommended ETF Portfolio</h5>
        <p className="text-sm text-primary-700">Based on risk tolerance and objectives</p>
      </div>
      
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 text-slate-500 font-medium">ETF</th>
            <th className="text-left py-2 text-slate-500 font-medium">Category</th>
            <th className="text-right py-2 text-slate-500 font-medium">Allocation</th>
            <th className="text-right py-2 text-slate-500 font-medium">Expense Ratio</th>
          </tr>
        </thead>
        <tbody>
          {data.recommendations.map((etf, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-2">
                <span className="font-medium text-slate-900">{etf.ticker}</span>
                <span className="text-slate-500 ml-2">{etf.name}</span>
              </td>
              <td className="py-2 text-slate-600">{etf.category}</td>
              <td className="py-2 text-right font-mono">{etf.allocation}%</td>
              <td className="py-2 text-right font-mono text-green-600">{etf.expenseRatio}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="flex justify-between p-3 bg-slate-50 rounded-lg text-sm">
        <span className="text-slate-600">Total Weighted Expense Ratio</span>
        <span className="font-semibold text-green-600">{data.totalExpenseRatio}%</span>
      </div>
    </div>
  );
}

function IPSResults({ data }: { data: IPSData }) {
  return (
    <div className="space-y-4">
      <div className="bg-green-50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-green-800 mb-1">Investment Policy Statement Generated</h5>
        <p className="text-sm text-green-700">Compliant with FINRA 2111 suitability requirements</p>
      </div>
      
      <div className="border border-slate-200 rounded-lg p-4 space-y-4">
        <div>
          <h6 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Client Profile</h6>
          <p className="text-sm text-slate-700">{data.clientProfile}</p>
        </div>
        <div>
          <h6 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Investment Objectives</h6>
          <p className="text-sm text-slate-700">{data.objectives}</p>
        </div>
        <div>
          <h6 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Risk Tolerance</h6>
          <p className="text-sm text-slate-700">{data.riskTolerance}</p>
        </div>
        <div>
          <h6 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Asset Allocation Guidelines</h6>
          <p className="text-sm text-slate-700">{data.allocationGuidelines}</p>
        </div>
        <div>
          <h6 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Rebalancing Policy</h6>
          <p className="text-sm text-slate-700">{data.rebalancingPolicy}</p>
        </div>
      </div>
      
      <button className="w-full py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors">
        <Download size={18} />
        Download IPS Document
      </button>
    </div>
  );
}

