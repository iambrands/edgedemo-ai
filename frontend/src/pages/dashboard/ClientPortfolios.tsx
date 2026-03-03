import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  PieChart,
  AlertTriangle,
  BarChart3,
  Download,
  Plus,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../contexts/ToastContext';
import { portfolioReviewApi } from '../../services/api';
import { exportToPDF } from '../../utils/export';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface Quote {
  symbol: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  previous_close: number;
  latest_day: string;
  source: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const fmtFull = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

export function ClientPortfolios() {
  const navigate = useNavigate();
  const toast = useToast();
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesSource, setQuotesSource] = useState<string>('');

  useEffect(() => {
    loadPortfolios();
  }, []);

  const loadPortfolios = async () => {
    setLoading(true);
    try {
      const data = await portfolioReviewApi.listSaved();
      setPortfolios(data.portfolios || []);
    } catch (err) {
      console.error('Failed to load portfolios:', err);
      toast.error('Failed to load saved portfolios');
    } finally {
      setLoading(false);
    }
  };

  const loadQuotes = useCallback(async (portfolio: any) => {
    const symbols = (portfolio.holdings || [])
      .map((h: any) => h.symbol)
      .filter((s: string) => s && s !== 'Cash' && !s.includes(' '));
    if (symbols.length === 0) return;

    setQuotesLoading(true);
    try {
      const data = await portfolioReviewApi.getQuotes(symbols, portfolio.id);
      setQuotes(data.quotes || {});
      setQuotesSource(data.source || 'mock');
    } catch (err) {
      console.error('Failed to load quotes:', err);
    } finally {
      setQuotesLoading(false);
    }
  }, []);

  const toggleExpand = (portfolio: any) => {
    if (expandedId === portfolio.id) {
      setExpandedId(null);
      setQuotes({});
    } else {
      setExpandedId(portfolio.id);
      loadQuotes(portfolio);
    }
  };

  const getPerformance = (holding: any) => {
    const quote = quotes[holding.symbol];
    if (!quote) return null;
    const currentValue = quote.price * holding.quantity;
    const originalValue = holding.marketValue;
    const performanceDollar = currentValue - originalValue;
    const performancePct = originalValue > 0 ? (performanceDollar / originalValue) * 100 : 0;
    return { currentPrice: quote.price, currentValue, performanceDollar, performancePct, quote };
  };

  const getPortfolioPerformance = (portfolio: any) => {
    if (Object.keys(quotes).length === 0) return null;
    let currentTotal = 0;
    let originalTotal = 0;
    for (const h of portfolio.holdings || []) {
      const q = quotes[h.symbol];
      if (q) {
        currentTotal += q.price * h.quantity;
        originalTotal += h.marketValue;
      } else {
        currentTotal += h.marketValue;
        originalTotal += h.marketValue;
      }
    }
    const changeDollar = currentTotal - originalTotal;
    const changePct = originalTotal > 0 ? (changeDollar / originalTotal) * 100 : 0;
    return { currentTotal, changeDollar, changePct };
  };

  const generatePDFForPortfolio = (portfolio: any) => {
    const analysis = portfolio.analysis;
    if (!analysis) return;

    const name = portfolio.client_name || 'Client';
    const advisor = portfolio.advisor_name || 'Advisor';
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const perf = getPortfolioPerformance(portfolio);

    const holdingsRows = (portfolio.holdings || [])
      .sort((a: any, b: any) => b.marketValue - a.marketValue)
      .map((h: any) => {
        const q = quotes[h.symbol];
        const currentPrice = q ? q.price : h.price;
        const currentValue = q ? q.price * h.quantity : h.marketValue;
        const change = currentValue - h.marketValue;
        return `<tr>
          <td><strong>${h.symbol}</strong></td>
          <td>${h.description}</td>
          <td style="text-align:right">${h.quantity.toLocaleString()}</td>
          <td style="text-align:right">${fmtFull(h.price)}</td>
          <td style="text-align:right">${fmtFull(currentPrice)}</td>
          <td style="text-align:right">${fmt(currentValue)}</td>
          <td style="text-align:right" class="${change >= 0 ? 'gain' : 'loss'}">${fmt(change)}</td>
        </tr>`;
      }).join('');

    const riskLevel = analysis.riskScore <= 35 ? 'low' : analysis.riskScore <= 65 ? 'moderate' : 'high';
    const html = `
      <div class="report-header">
        <div class="logo-row">
          <div class="logo-mark">E</div>
          <div class="logo-text">Edge</div>
        </div>
        <h1>Portfolio Performance Report</h1>
        <div class="subtitle">Current Holdings & Live Market Performance</div>
        <div class="meta-row">
          <span><strong>Client:</strong> ${name}</span>
          <span><strong>Advisor:</strong> ${advisor}</span>
          <span><strong>Date:</strong> ${date}</span>
        </div>
      </div>

      <div class="metrics-bar">
        <div class="metric">
          <div class="metric-value">${fmt(portfolio.total_value)}</div>
          <div class="metric-label">Original Value</div>
        </div>
        <div class="metric">
          <div class="metric-value">${perf ? fmt(perf.currentTotal) : 'N/A'}</div>
          <div class="metric-label">Current Value</div>
        </div>
        <div class="metric">
          <div class="metric-value" style="color:${perf && perf.changeDollar >= 0 ? '#16a34a' : '#dc2626'}">
            ${perf ? `${perf.changeDollar >= 0 ? '+' : ''}${perf.changePct.toFixed(1)}%` : 'N/A'}
          </div>
          <div class="metric-label">Performance</div>
        </div>
        <div class="metric">
          <div class="metric-value"><span class="risk-badge risk-${riskLevel}">${analysis.riskScore}</span></div>
          <div class="metric-label">Risk Score</div>
        </div>
      </div>

      <h2>Executive Summary</h2>
      <div class="info-box"><p>${analysis.executiveSummary}</p></div>

      <h2>Current Holdings & Performance</h2>
      <table>
        <thead><tr>
          <th>Symbol</th><th>Description</th><th style="text-align:right">Qty</th>
          <th style="text-align:right">Upload Price</th><th style="text-align:right">Current Price</th>
          <th style="text-align:right">Current Value</th><th style="text-align:right">Change</th>
        </tr></thead>
        <tbody>${holdingsRows}</tbody>
      </table>

      <h2>AI Recommendations</h2>
      <table>
        <thead><tr><th>Priority</th><th>Action</th><th>Ticker</th><th>Rationale</th></tr></thead>
        <tbody>${(analysis.recommendations || []).map((r: any) => `
          <tr>
            <td class="severity-${r.priority === 'medium' ? 'moderate' : r.priority}">${r.priority.toUpperCase()}</td>
            <td><strong>${r.action}</strong></td>
            <td>${r.ticker}</td>
            <td>${r.rationale}</td>
          </tr>
        `).join('')}</tbody>
      </table>

      <div class="report-footer">
        <p class="brand">Edge &mdash; AI-Powered Wealth Management Platform</p>
        <p>IAB Advisors, Inc. &bull; Report generated ${date}</p>
        <p>Market data source: ${quotesSource === 'alpha_vantage' ? 'Alpha Vantage' : 'Simulated'} &bull; Confidential</p>
      </div>

      <div class="disclosures">
        <h3 style="font-size:8pt; color:#9ca3af; margin-bottom:6px;">IMPORTANT DISCLOSURES</h3>
        <p>This report is for informational purposes only and does not constitute investment advice.
        Past performance is not indicative of future results. All investments carry risk.</p>
      </div>
    `;

    exportToPDF('Portfolio Performance Report', html, `portfolio-${name.replace(/\s+/g, '-').toLowerCase()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Portfolios"
        subtitle="View saved portfolios with live performance data"
        badge={<Badge variant="blue">{portfolios.length} portfolios</Badge>}
        actions={
          <Button variant="primary" onClick={() => navigate('/dashboard/portfolio-review')}>
            <Plus className="w-4 h-4 mr-1" />
            New Portfolio Review
          </Button>
        }
      />

      {portfolios.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No saved portfolios yet</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Upload a portfolio CSV in Portfolio Review, run AI analysis, and the portfolio will be automatically saved here with live performance tracking.
            </p>
            <Button variant="primary" onClick={() => navigate('/dashboard/portfolio-review')}>
              <ArrowRight className="w-4 h-4 mr-1" />
              Go to Portfolio Review
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {portfolios.map((portfolio) => {
            const isExpanded = expandedId === portfolio.id;
            const perf = isExpanded ? getPortfolioPerformance(portfolio) : null;

            return (
              <Card key={portfolio.id}>
                {/* Summary row */}
                <button
                  onClick={() => toggleExpand(portfolio)}
                  className="w-full flex items-center justify-between p-1 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{portfolio.client_name}</h3>
                      <p className="text-sm text-slate-500">
                        {portfolio.holdings_count} holdings &middot; {fmt(portfolio.total_value)} &middot;{' '}
                        {new Date(portfolio.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {portfolio.analysis?.riskScore != null && (
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-slate-500">Risk Score</div>
                        <Badge variant={portfolio.analysis.riskScore <= 35 ? 'green' : portfolio.analysis.riskScore <= 65 ? 'amber' : 'red'}>
                          {portfolio.analysis.riskScore}/100
                        </Badge>
                      </div>
                    )}
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-slate-500">Gain/Loss</div>
                      <span className={`text-sm font-semibold ${portfolio.total_gain >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {fmt(portfolio.total_gain)}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-4 border-t border-slate-100 pt-4 space-y-6">
                    {/* Performance summary bar */}
                    {(perf || quotesLoading) && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4 text-center">
                          <DollarSign className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                          <div className="text-lg font-bold text-slate-900">{fmt(portfolio.total_value)}</div>
                          <div className="text-xs text-slate-500">Upload Value</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4 text-center">
                          <BarChart3 className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                          <div className="text-lg font-bold text-slate-900">
                            {quotesLoading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : perf ? fmt(perf.currentTotal) : '—'}
                          </div>
                          <div className="text-xs text-slate-500">Current Value</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4 text-center">
                          {perf && perf.changeDollar >= 0 ? (
                            <TrendingUp className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
                          )}
                          <div className={`text-lg font-bold ${perf && perf.changeDollar >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {quotesLoading ? '...' : perf ? `${perf.changeDollar >= 0 ? '+' : ''}${perf.changePct.toFixed(2)}%` : '—'}
                          </div>
                          <div className="text-xs text-slate-500">Performance</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4 text-center">
                          <PieChart className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                          <div className="text-lg font-bold text-slate-900">{portfolio.holdings_count}</div>
                          <div className="text-xs text-slate-500">Positions</div>
                        </div>
                      </div>
                    )}

                    {quotesSource && !quotesLoading && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className={`w-2 h-2 rounded-full ${quotesSource === 'alpha_vantage' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        {quotesSource === 'alpha_vantage' ? 'Live quotes from Alpha Vantage' : 'Simulated market data'}
                        <button
                          onClick={() => loadQuotes(portfolio)}
                          className="ml-2 text-blue-500 hover:text-blue-700"
                          aria-label="Refresh quotes"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* AI Summary */}
                    {portfolio.analysis?.executiveSummary && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-800">AI Analysis Summary</span>
                        </div>
                        <p className="text-sm text-blue-700">{portfolio.analysis.executiveSummary}</p>
                      </div>
                    )}

                    {/* Holdings table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-left">
                            <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Symbol</th>
                            <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Description</th>
                            <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide text-right">Qty</th>
                            <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide text-right">Upload Price</th>
                            <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide text-right">Current</th>
                            <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide text-right">Value</th>
                            <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide text-right">Change</th>
                            <th className="px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(portfolio.holdings || [])
                            .sort((a: any, b: any) => b.marketValue - a.marketValue)
                            .map((h: any, idx: number) => {
                              const perf = getPerformance(h);
                              return (
                                <tr key={`${h.symbol}-${idx}`} className="border-t border-slate-100 hover:bg-slate-50">
                                  <td className="px-3 py-2.5 font-semibold text-slate-900">{h.symbol}</td>
                                  <td className="px-3 py-2.5 text-slate-600 max-w-[200px] truncate">{h.description}</td>
                                  <td className="px-3 py-2.5 text-right text-slate-700">{h.quantity?.toLocaleString()}</td>
                                  <td className="px-3 py-2.5 text-right text-slate-700">{fmtFull(h.price)}</td>
                                  <td className="px-3 py-2.5 text-right font-medium">
                                    {quotesLoading ? (
                                      <span className="text-slate-400">...</span>
                                    ) : perf ? (
                                      fmtFull(perf.currentPrice)
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-right font-medium text-slate-900">
                                    {perf ? fmt(perf.currentValue) : fmt(h.marketValue)}
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    {perf ? (
                                      <span className={`font-semibold ${perf.performanceDollar >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {perf.performanceDollar >= 0 ? '+' : ''}{perf.performancePct.toFixed(1)}%
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <Badge variant="gray" className="text-xs">{h.securityType}</Badge>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                      <Button variant="primary" size="sm" onClick={() => generatePDFForPortfolio(portfolio)}>
                        <Download className="w-4 h-4 mr-1" />
                        Generate PDF Report
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard/prospects')}>
                        <Eye className="w-4 h-4 mr-1" />
                        View Prospect
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => loadQuotes(portfolio)} disabled={quotesLoading}>
                        <RefreshCw className={`w-4 h-4 mr-1 ${quotesLoading ? 'animate-spin' : ''}`} />
                        Refresh Quotes
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
