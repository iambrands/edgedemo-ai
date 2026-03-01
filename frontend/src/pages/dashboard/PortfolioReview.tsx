import { useState, useMemo, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  FileText,
  RefreshCw,
  ArrowUpDown,
  Download,
  Sparkles,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { portfolioReviewApi } from '../../services/api';
import { exportToPDF } from '../../utils/export';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ParsedHolding {
  symbol: string;
  description: string;
  quantity: number;
  price: number;
  marketValue: number;
  costBasis: number;
  gainLossPct: number;
  gainLossDollar: number;
  pctOfAccount: number;
  securityType: string;
}

interface ConcentrationRisk {
  type: string;
  name: string;
  percentage: number;
  threshold: number;
  severity: string;
  recommendation: string;
}

interface PortfolioAnalysisResult {
  overallAssessment: string;
  riskScore: number;
  riskExplanation: string;
  concentrationRisks: ConcentrationRisk[];
  allocationAssessment: {
    current: Record<string, number>;
    recommended: Record<string, number>;
    commentary: string;
  };
  recommendations: { action: string; ticker: string; rationale: string; priority: string }[];
  feeAnalysis: {
    totalEstimatedFees: number;
    commentary: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    highFeeHoldings: any[];
  };
  taxEfficiency: string;
  incomeAssessment: string;
  executiveSummary: string;
}

/* ------------------------------------------------------------------ */
/*  CSV Parsing Utilities                                              */
/* ------------------------------------------------------------------ */

/** Split a CSV line respecting quoted values */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/** Parse dollar strings like "$89,296.00" or "($396.00)" → number */
function parseDollar(val: string | undefined): number {
  if (!val || val === '--' || val === 'N/A') return 0;
  const negative = val.includes('(') && val.includes(')');
  const cleaned = val.replace(/[$,()"\s]/g, '');
  const num = parseFloat(cleaned) || 0;
  return negative ? -num : num;
}

/** Parse percentage strings like "-0.44%" or "367.55%" → number */
function parsePercent(val: string | undefined): number {
  if (!val || val === '--' || val === 'N/A') return 0;
  const negative = val.includes('(') && val.includes(')');
  const cleaned = val.replace(/[%,()"\s]/g, '');
  const num = parseFloat(cleaned) || 0;
  return negative ? -num : num;
}

/** Find column index by trying multiple header variations */
function findCol(headers: string[], candidates: string[]): number {
  for (const cand of candidates) {
    // Keep % and $ in the comparison to distinguish "Gain %" from "Gain $"
    const normCand = cand.toLowerCase().replace(/[^a-z%$]/g, '');
    const idx = headers.findIndex(h => {
      const normH = h.toLowerCase().replace(/[^a-z%$]/g, '');
      return normH.includes(normCand);
    });
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Parse a Schwab-format CSV into holdings */
function parseSchwabCSV(text: string): ParsedHolding[] {
  const lines = text.trim().split(/\r?\n/);

  // Find the header row — look for a line with both "Symbol" and "Market" (Value)
  let headerIdx = lines.findIndex(
    line => {
      const lower = line.toLowerCase();
      return lower.includes('symbol') && (lower.includes('market') || lower.includes('mkt'));
    }
  );
  if (headerIdx === -1) headerIdx = 0;

  const headers = parseCSVLine(lines[headerIdx]);

  const colSymbol = findCol(headers, ['symbol']);
  const colDesc = findCol(headers, ['description', 'name']);
  const colQty = findCol(headers, ['qty', 'quantity', 'shares']);
  const colPrice = findCol(headers, ['price']);
  const colMktVal = findCol(headers, ['mktval', 'marketvalue', 'value']);
  const colCostBasis = findCol(headers, ['costbasis', 'cost']);
  const colGainPct = findCol(headers, ['gain%', 'gainloss%']);
  const colGainDollar = findCol(headers, ['gain$', 'gainloss$']);
  const colPctAcct = findCol(headers, ['%ofacct', 'ofaccount', '%ofaccount']);
  const colType = findCol(headers, ['securitytype', 'type']);

  const holdings: ParsedHolding[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const symbol = (cols[colSymbol] || '').replace(/"/g, '').trim();

    // Skip empty, summary, and total rows
    if (
      !symbol ||
      symbol === 'Account Total' ||
      symbol === 'Cash & Cash Investments' ||
      symbol.toLowerCase().startsWith('positions for')
    ) {
      continue;
    }

    const mktVal = parseDollar(cols[colMktVal]);
    if (mktVal === 0 && symbol !== 'Cash') continue; // skip zero-value rows

    holdings.push({
      symbol,
      description: (cols[colDesc] || '').replace(/"/g, '').trim(),
      quantity: parseDollar(cols[colQty]),
      price: parseDollar(cols[colPrice]),
      marketValue: mktVal,
      costBasis: parseDollar(cols[colCostBasis]),
      gainLossPct: parsePercent(cols[colGainPct]),
      gainLossDollar: parseDollar(cols[colGainDollar]),
      pctOfAccount: parsePercent(cols[colPctAcct]),
      securityType: (cols[colType] || 'Unknown').replace(/"/g, '').trim(),
    });
  }

  return holdings;
}

/* ------------------------------------------------------------------ */
/*  Chart colours                                                      */
/* ------------------------------------------------------------------ */

const PIE_COLORS = ['#3B82F6', '#8B5CF6', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function PortfolioReview() {
  // Phase 1: Upload
  const [holdings, setHoldings] = useState<ParsedHolding[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Phase 2: Table
  const [sortField, setSortField] = useState<keyof ParsedHolding>('marketValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState('all');

  // Phase 3: Analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PortfolioAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Phase 4: Report
  const [clientName, setClientName] = useState('');
  const [advisorName, setAdvisorName] = useState('');

  /* ── Derived data ─────────────────────────────────────────────── */

  const totalValue = useMemo(() => holdings.reduce((s, h) => s + h.marketValue, 0), [holdings]);
  const totalGain = useMemo(() => holdings.reduce((s, h) => s + h.gainLossDollar, 0), [holdings]);
  const totalCost = useMemo(() => holdings.reduce((s, h) => s + h.costBasis, 0), [holdings]);
  const largestHolding = useMemo(() => holdings.length ? holdings.reduce((a, b) => a.marketValue > b.marketValue ? a : b) : null, [holdings]);

  const allocationData = useMemo(() => {
    const groups: Record<string, number> = {};
    holdings.forEach(h => {
      const t = h.securityType || 'Other';
      groups[t] = (groups[t] || 0) + h.marketValue;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value, pct: totalValue > 0 ? (value / totalValue * 100) : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, totalValue]);

  const top10Data = useMemo(
    () => [...holdings].sort((a, b) => b.marketValue - a.marketValue).slice(0, 10).map(h => ({ name: h.symbol, value: h.marketValue })),
    [holdings],
  );

  const securityTypes = useMemo(() => {
    const types = new Set(holdings.map(h => h.securityType));
    return ['all', ...Array.from(types).sort()];
  }, [holdings]);

  const sortedHoldings = useMemo(() => {
    let list = filterType === 'all' ? [...holdings] : holdings.filter(h => h.securityType === filterType);
    list.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return list;
  }, [holdings, sortField, sortDir, filterType]);

  /* ── Handlers ─────────────────────────────────────────────────── */

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a CSV file.');
      return;
    }
    setParseError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseSchwabCSV(text);
        if (parsed.length === 0) {
          setParseError('No valid positions found in CSV. Ensure it contains Symbol and Market Value columns.');
          return;
        }
        setHoldings(parsed);
        setFileName(file.name);
        setAnalysis(null);
        setAnalysisError(null);
      } catch {
        setParseError('Failed to parse CSV. Please check the file format.');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSort = (field: keyof ParsedHolding) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await portfolioReviewApi.analyze(holdings, 'conservative but wants a bit of growth');
      setAnalysis(result);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetUpload = () => {
    setHoldings([]);
    setFileName(null);
    setParseError(null);
    setAnalysis(null);
    setAnalysisError(null);
  };

  const generateReport = () => {
    if (!analysis) return;
    const name = clientName || 'Client';
    const advisor = advisorName || 'Advisor';
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const gainPct = totalCost > 0 ? (totalGain / totalCost * 100) : 0;

    const holdingsRows = holdings
      .sort((a, b) => b.marketValue - a.marketValue)
      .map(h => `
        <tr>
          <td><strong>${h.symbol}</strong></td>
          <td>${h.description}</td>
          <td style="text-align:right">${h.quantity.toLocaleString()}</td>
          <td style="text-align:right">${fmt(h.marketValue)}</td>
          <td style="text-align:right">${fmt(h.costBasis)}</td>
          <td style="text-align:right; color:${h.gainLossDollar >= 0 ? '#16a34a' : '#dc2626'}">${fmt(h.gainLossDollar)}</td>
          <td>${h.securityType}</td>
        </tr>
      `).join('');

    const concRows = analysis.concentrationRisks.map(r => `
      <tr>
        <td>${r.name}</td>
        <td style="text-align:right">${r.percentage.toFixed(1)}%</td>
        <td style="text-align:right">${r.threshold}%</td>
        <td class="${r.severity === 'high' ? 'fail' : r.severity === 'moderate' ? 'warning' : 'pass'}">${r.severity.toUpperCase()}</td>
        <td>${r.recommendation}</td>
      </tr>
    `).join('');

    const allocRows = Object.keys({...analysis.allocationAssessment.current, ...analysis.allocationAssessment.recommended})
      .filter((v, i, a) => a.indexOf(v) === i)
      .map(cls => {
        const cur = analysis.allocationAssessment.current[cls] || 0;
        const rec = analysis.allocationAssessment.recommended[cls] || 0;
        const diff = cur - rec;
        return `<tr>
          <td>${cls}</td>
          <td style="text-align:right">${cur.toFixed(1)}%</td>
          <td style="text-align:right">${rec.toFixed(1)}%</td>
          <td style="text-align:right; color:${Math.abs(diff) > 5 ? '#d97706' : '#374151'}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}%</td>
        </tr>`;
      }).join('');

    const recRows = analysis.recommendations.map(r => `
      <tr>
        <td class="${r.priority === 'high' ? 'fail' : r.priority === 'medium' ? 'warning' : 'pass'}">${r.priority.toUpperCase()}</td>
        <td><strong>${r.action}</strong></td>
        <td>${r.ticker}</td>
        <td>${r.rationale}</td>
      </tr>
    `).join('');

    const riskColor = analysis.riskScore <= 35 ? '#16a34a' : analysis.riskScore <= 65 ? '#d97706' : '#dc2626';

    const html = `
      <div style="text-align:center; padding:60px 0 40px; border-bottom:3px solid #1e3a5f;">
        <h1 style="font-size:32px; color:#1e3a5f; margin:0;">Portfolio Review Report</h1>
        <p style="font-size:18px; color:#6b7280; margin:12px 0 4px;">Prepared for <strong>${name}</strong></p>
        <p style="font-size:14px; color:#9ca3af;">Prepared by ${advisor} &mdash; ${date}</p>
      </div>

      <h2>Executive Summary</h2>
      <div class="summary-box"><p>${analysis.executiveSummary}</p></div>

      <h2>Portfolio Overview</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-value" style="color:#1e3a5f;">${fmt(totalValue)}</div>
          <div class="summary-label">Total Value</div>
        </div>
        <div class="summary-item">
          <div class="summary-value" style="color:${totalGain >= 0 ? '#16a34a' : '#dc2626'};">
            ${fmt(totalGain)} (${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(1)}%)
          </div>
          <div class="summary-label">Total Gain / Loss</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${holdings.length}</div>
          <div class="summary-label">Total Holdings</div>
        </div>
      </div>

      <h2>Risk Assessment</h2>
      <div class="summary-box">
        <p style="font-size:20px; font-weight:700; color:${riskColor};">Risk Score: ${analysis.riskScore} / 100</p>
        <p>${analysis.riskExplanation}</p>
      </div>

      <h2>Concentration Analysis</h2>
      ${analysis.concentrationRisks.length > 0 ? `
      <table>
        <thead><tr><th>Position</th><th>Weight</th><th>Threshold</th><th>Severity</th><th>Recommendation</th></tr></thead>
        <tbody>${concRows}</tbody>
      </table>` : '<p>No significant concentration risks identified.</p>'}

      <h2>Asset Allocation: Current vs. Recommended</h2>
      <p>${analysis.allocationAssessment.commentary}</p>
      <table>
        <thead><tr><th>Asset Class</th><th>Current</th><th>Recommended</th><th>Difference</th></tr></thead>
        <tbody>${allocRows}</tbody>
      </table>

      <h2>Reallocation Recommendations</h2>
      <table>
        <thead><tr><th>Priority</th><th>Action</th><th>Ticker</th><th>Rationale</th></tr></thead>
        <tbody>${recRows}</tbody>
      </table>

      <h2>Fee Analysis</h2>
      <div class="summary-box">
        <p><strong>Estimated Annual Fees:</strong> ${fmt(analysis.feeAnalysis.totalEstimatedFees)}</p>
        <p>${analysis.feeAnalysis.commentary}</p>
      </div>

      <h2>Tax Efficiency</h2>
      <div class="summary-box"><p>${analysis.taxEfficiency}</p></div>

      <h2>Income Assessment</h2>
      <div class="summary-box"><p>${analysis.incomeAssessment}</p></div>

      <h2 style="page-break-before:always;">Complete Holdings</h2>
      <table>
        <thead><tr><th>Symbol</th><th>Description</th><th>Qty</th><th>Market Value</th><th>Cost Basis</th><th>Gain/Loss</th><th>Type</th></tr></thead>
        <tbody>${holdingsRows}</tbody>
      </table>

      <div style="page-break-before:always; font-size:11px; color:#6b7280; margin-top:40px; border-top:1px solid #e5e7eb; padding-top:20px;">
        <h2 style="font-size:14px;">Important Disclosures</h2>
        <p>This report is generated by the Edge Platform using AI-powered analysis and is intended for informational purposes only.
        It does not constitute investment advice, a solicitation, or a recommendation to buy, sell, or hold any security.</p>
        <p>Past performance is not indicative of future results. All investments carry risk, including the potential loss of principal.
        The AI analysis is based on the portfolio positions provided and may not account for all factors relevant to investment decisions.
        Investors should consult with a qualified financial advisor before making investment decisions.</p>
        <p>Securities and investment advisory services may be offered through a registered broker-dealer and/or registered investment adviser.
        Insurance products are offered through licensed insurance agencies.</p>
      </div>
    `;

    exportToPDF('Portfolio Review Report', html, `portfolio-review-${name.replace(/\s+/g, '-').toLowerCase()}`);
  };

  /* ── Render: Upload Phase ─────────────────────────────────────── */

  if (holdings.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Portfolio Review</h1>
          <p className="text-sm text-slate-500 mt-1">Upload a client portfolio CSV to analyze holdings, assess risk, and generate recommendations.</p>
        </div>

        <Card>
          <div className="p-8">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <Upload className="mx-auto mb-4 text-slate-400" size={48} />
              <p className="text-lg font-medium text-slate-700 mb-2">
                Drag & drop a portfolio CSV here
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Supports Schwab, Fidelity, and similar brokerage exports
              </p>
              <label className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors text-sm font-medium">
                <FileSpreadsheet size={16} />
                Choose File
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>
            </div>

            {parseError && (
              <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
                <AlertTriangle size={16} />
                {parseError}
              </div>
            )}
          </div>
        </Card>

        {/* How It Works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Upload, title: '1. Upload CSV', desc: 'Upload a portfolio export from any major custodian' },
            { icon: Sparkles, title: '2. AI Analysis', desc: 'Claude analyzes risk, concentration, fees, and allocation' },
            { icon: FileText, title: '3. Generate Report', desc: 'Download a professional PDF report for your client' },
          ].map(step => (
            <Card key={step.title}>
              <div className="p-5 text-center">
                <step.icon className="mx-auto mb-3 text-blue-600" size={28} />
                <h3 className="font-semibold text-slate-800 text-sm">{step.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{step.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  /* ── Render: Dashboard + Analysis + Report ────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Portfolio Review</h1>
          <p className="text-sm text-slate-500 mt-1">
            <FileSpreadsheet className="inline mr-1" size={14} />
            {fileName} &mdash; {holdings.length} positions &mdash; {fmt(totalValue)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetUpload}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw size={14} />
            New Upload
          </button>
          {!analysis && (
            <button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
            </button>
          )}
          {analysis && (
            <button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Re-run Analysis
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Value</span>
              <DollarSign className="text-blue-500" size={18} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{fmt(totalValue)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Gain/Loss</span>
              {totalGain >= 0 ? <TrendingUp className="text-emerald-500" size={18} /> : <TrendingDown className="text-red-500" size={18} />}
            </div>
            <p className={`text-2xl font-bold ${totalGain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(totalGain)}</p>
            <p className={`text-xs ${totalGain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {totalCost > 0 ? fmtPct(totalGain / totalCost * 100) : '—'}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Holdings</span>
              <BarChart3 className="text-purple-500" size={18} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{holdings.length}</p>
            <p className="text-xs text-slate-500">{securityTypes.length - 1} asset types</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Largest Position</span>
              <PieChartIcon className="text-amber-500" size={18} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{largestHolding?.symbol ?? '—'}</p>
            <p className="text-xs text-slate-500">{largestHolding ? fmt(largestHolding.marketValue) : ''}</p>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocation Pie */}
        <Card>
          <div className="p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Asset Allocation by Type</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={({ name, percent }: any) => `${name} (${((percent ?? 0) * 100).toFixed(1)}%)`}
                    labelLine
                  >
                    {allocationData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => fmt(Number(val))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Top 10 Bar Chart */}
        <Card>
          <div className="p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">Top 10 Holdings by Market Value</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10Data} layout="vertical" margin={{ left: 50, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={45} />
                  <Tooltip formatter={(val) => fmt(Number(val))} />
                  <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">All Holdings</h2>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600"
            >
              {securityTypes.map(t => (
                <option key={t} value={t}>{t === 'all' ? 'All Types' : t}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  {([
                    ['symbol', 'Symbol'],
                    ['description', 'Description'],
                    ['quantity', 'Qty'],
                    ['price', 'Price'],
                    ['marketValue', 'Market Value'],
                    ['costBasis', 'Cost Basis'],
                    ['gainLossDollar', 'Gain/Loss'],
                    ['gainLossPct', 'G/L %'],
                    ['pctOfAccount', '% Acct'],
                    ['securityType', 'Type'],
                  ] as const).map(([field, label]) => (
                    <th
                      key={field}
                      className="pb-3 pr-4 font-medium text-xs text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700 whitespace-nowrap"
                      onClick={() => handleSort(field)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {sortField === field && <ArrowUpDown size={12} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedHoldings.map((h, i) => (
                  <tr key={`${h.symbol}-${i}`} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-4 font-semibold text-slate-900">{h.symbol}</td>
                    <td className="py-2.5 pr-4 text-slate-600 max-w-[200px] truncate">{h.description}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{h.quantity.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">${h.price.toFixed(2)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums font-medium">{fmt(h.marketValue)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{fmt(h.costBasis)}</td>
                    <td className={`py-2.5 pr-4 text-right tabular-nums font-medium ${h.gainLossDollar >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmt(h.gainLossDollar)}
                    </td>
                    <td className={`py-2.5 pr-4 text-right tabular-nums ${h.gainLossPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmtPct(h.gainLossPct)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{h.pctOfAccount.toFixed(2)}%</td>
                    <td className="py-2.5 pr-4">
                      <Badge variant={h.securityType === 'Equity' ? 'blue' : h.securityType.includes('ETF') ? 'green' : 'gray'}>
                        {h.securityType}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Analysis Error */}
      {analysisError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertTriangle size={16} />
          {analysisError}
        </div>
      )}

      {/* Analysis Loading */}
      {isAnalyzing && (
        <Card>
          <div className="p-12 text-center">
            <Loader2 className="mx-auto mb-4 text-blue-600 animate-spin" size={36} />
            <p className="text-lg font-medium text-slate-700">Analyzing portfolio with AI...</p>
            <p className="text-sm text-slate-500 mt-1">Evaluating risk, concentration, fees, and generating recommendations</p>
          </div>
        </Card>
      )}

      {/* ── AI Analysis Results ──────────────────────────────────── */}
      {analysis && !isAnalyzing && (
        <>
          {/* Risk Score + Executive Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <div className="p-6 text-center">
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">Risk Score</h3>
                <div
                  className="inline-flex items-center justify-center w-28 h-28 rounded-full border-4"
                  style={{
                    borderColor: analysis.riskScore <= 35 ? '#22c55e' : analysis.riskScore <= 65 ? '#f59e0b' : '#ef4444',
                  }}
                >
                  <span
                    className="text-3xl font-bold"
                    style={{ color: analysis.riskScore <= 35 ? '#16a34a' : analysis.riskScore <= 65 ? '#d97706' : '#dc2626' }}
                  >
                    {analysis.riskScore}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  {analysis.riskScore <= 35 ? 'Conservative' : analysis.riskScore <= 65 ? 'Moderate' : 'Aggressive'}
                </p>
              </div>
            </Card>
            <div className="lg:col-span-2">
              <Card>
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-blue-600" />
                    AI Assessment
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed mb-3">{analysis.overallAssessment}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{analysis.riskExplanation}</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Concentration Risks */}
          {analysis.concentrationRisks.length > 0 && (
            <Card>
              <div className="p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  Concentration Risks ({analysis.concentrationRisks.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left">
                        <th className="pb-3 pr-4 font-medium text-xs text-slate-500 uppercase">Position</th>
                        <th className="pb-3 pr-4 font-medium text-xs text-slate-500 uppercase text-right">Weight</th>
                        <th className="pb-3 pr-4 font-medium text-xs text-slate-500 uppercase text-right">Threshold</th>
                        <th className="pb-3 pr-4 font-medium text-xs text-slate-500 uppercase">Severity</th>
                        <th className="pb-3 font-medium text-xs text-slate-500 uppercase">Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analysis.concentrationRisks.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 pr-4 font-medium text-slate-800">{r.name}</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">{r.percentage.toFixed(1)}%</td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">{r.threshold}%</td>
                          <td className="py-2.5 pr-4">
                            <Badge variant={r.severity === 'high' ? 'red' : r.severity === 'moderate' ? 'amber' : 'green'}>
                              {r.severity}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-slate-600 text-xs">{r.recommendation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}

          {/* Allocation Assessment */}
          <Card>
            <div className="p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Allocation: Current vs. Recommended</h3>
              <p className="text-sm text-slate-600 mb-4">{analysis.allocationAssessment.commentary}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="pb-3 pr-4 font-medium text-xs text-slate-500 uppercase">Asset Class</th>
                      <th className="pb-3 pr-4 font-medium text-xs text-slate-500 uppercase text-right">Current</th>
                      <th className="pb-3 pr-4 font-medium text-xs text-slate-500 uppercase text-right">Recommended</th>
                      <th className="pb-3 font-medium text-xs text-slate-500 uppercase text-right">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.keys({...analysis.allocationAssessment.current, ...analysis.allocationAssessment.recommended})
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .map(cls => {
                        const cur = analysis.allocationAssessment.current[cls] || 0;
                        const rec = analysis.allocationAssessment.recommended[cls] || 0;
                        const diff = cur - rec;
                        return (
                          <tr key={cls} className="hover:bg-slate-50">
                            <td className="py-2.5 pr-4 font-medium text-slate-800">{cls}</td>
                            <td className="py-2.5 pr-4 text-right tabular-nums">{cur.toFixed(1)}%</td>
                            <td className="py-2.5 pr-4 text-right tabular-nums">{rec.toFixed(1)}%</td>
                            <td className={`py-2.5 text-right tabular-nums font-medium ${Math.abs(diff) > 5 ? 'text-amber-600' : 'text-slate-600'}`}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Recommendations */}
          <Card>
            <div className="p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-500" />
                Recommendations ({analysis.recommendations.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="pb-3 pr-4 font-medium text-xs text-slate-500 uppercase">Priority</th>
                      <th className="pb-3 pr-4 font-medium text-xs text-slate-500 uppercase">Action</th>
                      <th className="pb-3 pr-4 font-medium text-xs text-slate-500 uppercase">Ticker</th>
                      <th className="pb-3 font-medium text-xs text-slate-500 uppercase">Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysis.recommendations.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2.5 pr-4">
                          <Badge variant={r.priority === 'high' ? 'red' : r.priority === 'medium' ? 'amber' : 'green'}>
                            {r.priority}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 font-semibold text-slate-800">{r.action}</td>
                        <td className="py-2.5 pr-4 font-mono text-blue-600">{r.ticker}</td>
                        <td className="py-2.5 text-slate-600">{r.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          {/* Fee + Tax + Income */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <div className="p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Fee Analysis</h3>
                <p className="text-xl font-bold text-slate-900 mb-2">{fmt(analysis.feeAnalysis.totalEstimatedFees)}<span className="text-xs font-normal text-slate-500"> / year</span></p>
                <p className="text-xs text-slate-600 leading-relaxed">{analysis.feeAnalysis.commentary}</p>
              </div>
            </Card>
            <Card>
              <div className="p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Tax Efficiency</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{analysis.taxEfficiency}</p>
              </div>
            </Card>
            <Card>
              <div className="p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Income Assessment</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{analysis.incomeAssessment}</p>
              </div>
            </Card>
          </div>

          {/* ── Report Generation ──────────────────────────────────── */}
          <Card>
            <div className="p-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />
                Generate Client Report
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="e.g., John Smith"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Advisor Name</label>
                  <input
                    type="text"
                    value={advisorName}
                    onChange={e => setAdvisorName(e.target.value)}
                    placeholder="e.g., Jane Advisor, CFP"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <button
                onClick={generateReport}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Download size={16} />
                Generate PDF Report
              </button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
