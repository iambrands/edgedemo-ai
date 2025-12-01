import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OptionContract } from '../../types/options';
import { watchlistService } from '../../services/watchlist';
import toast from 'react-hot-toast';

interface OptionsChainTableProps {
  options: OptionContract[];
  symbol?: string;
  expiration?: string;
  stockPrice?: number | null;
}

const OptionsChainTable: React.FC<OptionsChainTableProps> = ({ options, symbol, expiration, stockPrice }) => {
  const navigate = useNavigate();
  const [sortConfig, setSortConfig] = useState<{ key: keyof OptionContract; direction: 'asc' | 'desc' } | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [highlightedStrike, setHighlightedStrike] = useState<number | null>(null);
  
  // Find the strike closest to current stock price
  React.useEffect(() => {
    if (stockPrice && options.length > 0) {
      // Find the strike price closest to the current stock price
      const closestOption = options.reduce((closest, current) => {
        const closestDiff = Math.abs(closest.strike - stockPrice);
        const currentDiff = Math.abs(current.strike - stockPrice);
        return currentDiff < closestDiff ? current : closest;
      });
      setHighlightedStrike(closestOption.strike);
      
      // Scroll to the highlighted row after a short delay
      setTimeout(() => {
        const element = document.getElementById(`option-row-${closestOption.option_symbol}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [stockPrice, options]);

  const handleTrade = (option: OptionContract) => {
    // Store trade data in sessionStorage to pass to Trade page
    const tradeData = {
      symbol: symbol || option.option_symbol.split('_')[0],
      expiration: option.expiration_date,
      strike: option.strike.toString(),
      contractType: option.contract_type,
      price: option.mid_price,
      quantity: 1
    };
    sessionStorage.setItem('tradeData', JSON.stringify(tradeData));
    navigate('/trade');
    toast.success('Trade details loaded! Review and execute on the Trade page.');
  };

  const handleAddToWatchlist = async (option: OptionContract) => {
    const stockSymbol = symbol || option.option_symbol.split('_')[0];
    try {
      await watchlistService.addStock(stockSymbol);
      toast.success(`${stockSymbol} added to watchlist!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add to watchlist');
    }
  };

  const handleSort = (key: keyof OptionContract) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedOptions = [...options].sort((a, b) => {
    if (!sortConfig) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    
    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    return sortConfig.direction === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const filteredOptions = filterCategory === 'all'
    ? sortedOptions
    : sortedOptions.filter(opt => {
        // Case-insensitive category matching
        const optCategory = opt.category?.toLowerCase() || '';
        const filterCat = filterCategory.toLowerCase();
        return optCategory === filterCat;
      });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Aggressive':
        return 'bg-red-100 text-red-800';
      case 'Balanced':
        return 'bg-yellow-100 text-yellow-800';
      case 'Conservative':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-secondary">Analysis Results</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filterCategory === 'all' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterCategory('Conservative')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filterCategory === 'Conservative' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Conservative
          </button>
          <button
            onClick={() => setFilterCategory('Balanced')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filterCategory === 'Balanced' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Balanced
          </button>
          <button
            onClick={() => setFilterCategory('Aggressive')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filterCategory === 'Aggressive' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Aggressive
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('contract_type')}
              >
                Type
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('strike')}
              >
                Strike
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('mid_price')}
              >
                Price
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('spread_percent')}
              >
                Spread %
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('delta')}
              >
                Delta
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('theta')}
              >
                Theta
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('volume')}
              >
                Volume
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('score')}
              >
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOptions.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                  No options found for the selected category. Try selecting "All" to see all options.
                </td>
              </tr>
            ) : (
              filteredOptions.map((option) => {
                const isAtTheMoney = stockPrice && highlightedStrike && Math.abs(option.strike - stockPrice) < 0.01;
                const isNearTheMoney = stockPrice && highlightedStrike && option.strike === highlightedStrike;
                return (
                  <React.Fragment key={option.option_symbol}>
                <tr 
                  id={`option-row-${option.option_symbol}`}
                  className={`hover:bg-gray-50 ${
                    isAtTheMoney || isNearTheMoney 
                      ? 'bg-blue-50 border-l-4 border-blue-500' 
                      : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      option.contract_type === 'call' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {option.contract_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {formatCurrency(option.strike)}
                      {(isAtTheMoney || isNearTheMoney) && stockPrice && (
                        <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded">
                          ATM
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(option.mid_price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPercent(option.spread_percent)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {option.delta.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {option.theta.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {option.volume}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-primary">
                      {(option.score * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getCategoryColor(option.category)}`}>
                      {option.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setExpandedRow(expandedRow === option.option_symbol ? null : option.option_symbol)}
                      className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-indigo-600 font-medium text-xs transition-colors"
                    >
                      {expandedRow === option.option_symbol ? 'Hide Details' : 'View Details'}
                    </button>
                  </td>
                </tr>
                {expandedRow === option.option_symbol && (
                  <tr>
                    <td colSpan={10} className="px-6 py-4 bg-gray-50">
                      <div className="space-y-4">
                        {/* Quick Analysis - Formatted */}
                        {option.ai_analysis ? (
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-lg border-2 border-blue-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-bold text-lg text-secondary flex items-center gap-2">
                                <span className="text-2xl">🤖</span>
                                AI-Powered Quick Analysis
                              </h4>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                option.ai_analysis.recommendation.action === 'buy'
                                  ? 'bg-green-500 text-white'
                                  : option.ai_analysis.recommendation.action === 'consider'
                                  ? 'bg-blue-500 text-white'
                                  : option.ai_analysis.recommendation.action === 'consider_carefully'
                                  ? 'bg-yellow-500 text-white'
                                  : 'bg-red-500 text-white'
                              }`}>
                                {option.ai_analysis.recommendation.action.toUpperCase().replace('_', ' ')}
                              </span>
                            </div>
                            
                            {/* Recommendation Card */}
                            <div className="bg-white rounded-lg p-4 mb-4 border-l-4 border-blue-500">
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm font-semibold text-gray-700">Recommendation:</span>
                                    <span className="text-sm font-bold text-blue-600">
                                      {option.ai_analysis.recommendation.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      (Confidence: {option.ai_analysis.recommendation.confidence.charAt(0).toUpperCase() + option.ai_analysis.recommendation.confidence.slice(1)})
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {option.ai_analysis.recommendation.reasoning}
                                  </p>
                                  <div className="mt-2 text-xs text-gray-600">
                                    <span className="font-medium">Suitability:</span> {option.ai_analysis.recommendation.suitability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-500 mb-1">Risk Level</div>
                                <div className={`text-sm font-bold ${
                                  option.ai_analysis.risk_assessment.overall_risk_level === 'high'
                                    ? 'text-red-600'
                                    : option.ai_analysis.risk_assessment.overall_risk_level === 'moderate'
                                    ? 'text-yellow-600'
                                    : 'text-green-600'
                                }`}>
                                  {option.ai_analysis.risk_assessment.overall_risk_level.toUpperCase()}
                                </div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-500 mb-1">Score</div>
                                <div className="text-sm font-bold text-blue-600">
                                  {(option.score * 100).toFixed(1)}%
                                </div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-500 mb-1">Days to Expiry</div>
                                <div className="text-sm font-bold text-gray-700">
                                  {option.days_to_expiration} days
                                </div>
                              </div>
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="text-xs text-gray-500 mb-1">Break-Even</div>
                                <div className="text-sm font-bold text-gray-700">
                                  {option.ai_analysis.trade_analysis.break_even.split(':')[1]?.trim().split(' ')[0] || 'N/A'}
                                </div>
                              </div>
                            </div>

                            {/* Quick Summary */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h5 className="font-semibold text-sm text-gray-700 mb-2">📋 Quick Summary</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                  <span className="text-green-600 font-semibold min-w-[80px]">✓ Best Case:</span>
                                  <span className="text-gray-700">{option.ai_analysis.trade_analysis.best_case}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-red-600 font-semibold min-w-[80px]">✗ Worst Case:</span>
                                  <span className="text-gray-700">{option.ai_analysis.trade_analysis.worst_case}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-orange-600 font-semibold min-w-[80px]">⏰ Time:</span>
                                  <span className="text-gray-700">{option.ai_analysis.trade_analysis.time_considerations}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <h4 className="font-semibold text-secondary mb-2">📊 Quick Analysis</h4>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{option.explanation}</p>
                          </div>
                        )}

                        {/* Detailed AI Analysis Sections */}
                        {option.ai_analysis && (
                          <>

                            {/* Greeks Explanation */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <h4 className="font-semibold text-secondary mb-3">📚 Understanding the Greeks</h4>
                              <div className="space-y-3 text-sm">
                                <div className="border-l-4 border-blue-500 pl-3">
                                  <strong className="text-blue-700">Delta ({option.delta.toFixed(4)}):</strong>
                                  <p className="text-gray-700 mt-1">{option.ai_analysis.greeks_explanation.delta}</p>
                                </div>
                                <div className="border-l-4 border-purple-500 pl-3">
                                  <strong className="text-purple-700">Gamma ({option.gamma.toFixed(4)}):</strong>
                                  <p className="text-gray-700 mt-1">{option.ai_analysis.greeks_explanation.gamma}</p>
                                </div>
                                <div className="border-l-4 border-red-500 pl-3">
                                  <strong className="text-red-700">Theta ({option.theta.toFixed(4)}):</strong>
                                  <p className="text-gray-700 mt-1">{option.ai_analysis.greeks_explanation.theta}</p>
                                </div>
                                <div className="border-l-4 border-green-500 pl-3">
                                  <strong className="text-green-700">Vega ({option.vega.toFixed(4)}):</strong>
                                  <p className="text-gray-700 mt-1">{option.ai_analysis.greeks_explanation.vega}</p>
                                </div>
                                <div className="border-l-4 border-orange-500 pl-3">
                                  <strong className="text-orange-700">Implied Volatility ({formatPercent(option.implied_volatility * 100)}):</strong>
                                  <p className="text-gray-700 mt-1">{option.ai_analysis.greeks_explanation.implied_volatility}</p>
                                </div>
                              </div>
                            </div>

                            {/* Trade Analysis */}
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <h4 className="font-semibold text-secondary mb-3">💡 Trade Analysis</h4>
                              <div className="space-y-2 text-sm">
                                <p><strong>Overview:</strong> {option.ai_analysis.trade_analysis.overview}</p>
                                <p className="text-green-700"><strong>Best Case:</strong> {option.ai_analysis.trade_analysis.best_case}</p>
                                <p className="text-red-700"><strong>Worst Case:</strong> {option.ai_analysis.trade_analysis.worst_case}</p>
                                <p><strong>Break-Even:</strong> {option.ai_analysis.trade_analysis.break_even}</p>
                                <p><strong>Profit Potential:</strong> {option.ai_analysis.trade_analysis.profit_potential}</p>
                                <p className="text-orange-700"><strong>Time:</strong> {option.ai_analysis.trade_analysis.time_considerations}</p>
                              </div>
                            </div>

                            {/* Risk Assessment */}
                            <div className={`p-4 rounded-lg border ${
                              option.ai_analysis.risk_assessment.overall_risk_level === 'high'
                                ? 'bg-red-50 border-red-300'
                                : option.ai_analysis.risk_assessment.overall_risk_level === 'moderate'
                                ? 'bg-yellow-50 border-yellow-300'
                                : 'bg-green-50 border-green-300'
                            }`}>
                              <h4 className="font-semibold mb-2">
                                ⚠️ Risk Assessment: {option.ai_analysis.risk_assessment.overall_risk_level.toUpperCase()}
                              </h4>
                              {option.ai_analysis.risk_assessment.warnings.length > 0 && (
                                <div className="mb-2">
                                  {option.ai_analysis.risk_assessment.warnings.map((warning, idx) => (
                                    <p key={idx} className="text-sm text-red-700 mb-1">{warning}</p>
                                  ))}
                                </div>
                              )}
                              <div className="text-sm">
                                <strong>Risk Factors:</strong>
                                <ul className="list-disc list-inside mt-1">
                                  {option.ai_analysis.risk_assessment.risk_factors.map((factor, idx) => (
                                    <li key={idx} className="text-gray-700">{factor}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Basic Metrics (if no AI analysis) */}
                        {!option.ai_analysis && (
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <strong>Gamma:</strong> {option.gamma.toFixed(4)}
                            </div>
                            <div>
                              <strong>Vega:</strong> {option.vega.toFixed(4)}
                            </div>
                            <div>
                              <strong>IV:</strong> {formatPercent(option.implied_volatility * 100)}
                            </div>
                            <div>
                              <strong>DTE:</strong> {option.days_to_expiration} days
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-4">
                          <button 
                            onClick={() => handleTrade(option)}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 text-sm font-medium transition-colors"
                          >
                            Trade
                          </button>
                          <button 
                            onClick={() => handleAddToWatchlist(option)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium transition-colors"
                          >
                            Add to Watchlist
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OptionsChainTable;

