import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { optionsService } from '../services/options';
import { OptionContract } from '../types/options';
import { watchlistService } from '../services/watchlist';
import api from '../services/api';
import toast from 'react-hot-toast';
import OptionsChainTable from '../components/OptionsChain/OptionsChainTable';

const OptionsAnalyzer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [symbol, setSymbol] = useState('AAPL');
  const [stockPrice, setStockPrice] = useState<number | null>(null);
  const [expiration, setExpiration] = useState('');
  const [preference, setPreference] = useState<'income' | 'growth' | 'balanced'>('balanced');
  const [expirations, setExpirations] = useState<string[]>([]);
  const [options, setOptions] = useState<OptionContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingExpirations, setLoadingExpirations] = useState(false);
  const [expandedOption, setExpandedOption] = useState<string | null>(null);

  const fetchExpirations = async () => {
    if (!symbol || symbol.trim().length < 1) return;
    
    const trimmedSymbol = symbol.trim().toUpperCase();
    // Validate symbol format (1-5 uppercase letters)
    if (!/^[A-Z]{1,5}$/.test(trimmedSymbol)) {
      return;
    }
    
    setLoadingExpirations(true);
    try {
      const data = await optionsService.getExpirations(trimmedSymbol);
      console.log('Expirations data:', data);
      console.log('Expirations data type:', typeof data);
      console.log('Expirations data.expirations:', data?.expirations);
      console.log('Is array?', Array.isArray(data?.expirations));
      
      if (data && data.expirations) {
        const expArray = Array.isArray(data.expirations) ? data.expirations : [];
        console.log('Setting expirations:', expArray);
        setExpirations(expArray);
        // Always set the first expiration if available and none is selected
        if (expArray.length > 0) {
          console.log('Setting first expiration to:', expArray[0]);
          setExpiration(prev => {
            if (!prev) {
              console.log('No previous expiration, setting to:', expArray[0]);
              return expArray[0];
            }
            return prev;
          });
        } else {
          console.warn('No expirations in array');
        }
      } else {
        console.warn('Invalid expirations data:', data);
        setExpirations([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch expirations:', error);
      // Only show error if it's not a 404 or validation error
      if (error.response?.status !== 404 && error.response?.status !== 400) {
        toast.error(error.response?.data?.error || 'Failed to fetch expirations');
      }
      setExpirations([]);
    } finally {
      setLoadingExpirations(false);
    }
  };

  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSymbol(e.target.value.toUpperCase());
    setExpiration('');
    setOptions([]);
  };

  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExpirations();
  };

  const analyzeOptions = async () => {
    if (!symbol || !expiration) {
      toast.error('Please select a symbol and expiration');
      return;
    }

    setLoading(true);
    try {
      const data = await optionsService.analyze(symbol, expiration, preference);
      setOptions(data.options);
      toast.success(`Found ${data.count} options`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to analyze options');
    } finally {
      setLoading(false);
    }
  };

  const [isInitialMount, setIsInitialMount] = React.useState(true);

  React.useEffect(() => {
    // Check if symbol was passed from navigation
    if (location.state && location.state.symbol) {
      setSymbol(location.state.symbol);
      setIsInitialMount(false);
    }
  }, [location.state]);

  React.useEffect(() => {
    // Only fetch if symbol is at least 1 character and not just whitespace
    if (symbol && symbol.trim().length >= 1) {
      const trimmedSymbol = symbol.trim().toUpperCase();
      if (trimmedSymbol.length >= 1 && trimmedSymbol.length <= 5 && /^[A-Z]+$/.test(trimmedSymbol)) {
        // On initial mount, fetch immediately (no debounce)
        // For subsequent changes, debounce to avoid excessive API calls
        if (isInitialMount) {
          fetchExpirations();
          fetchStockPrice();
          setIsInitialMount(false);
        } else {
          // Debounce: wait 500ms after user stops typing
          const timeoutId = setTimeout(() => {
            fetchExpirations();
            fetchStockPrice();
          }, 500);
          
          return () => clearTimeout(timeoutId);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, isInitialMount]);
  
  // Separate effect to set expiration when expirations are loaded
  React.useEffect(() => {
    console.log('Expirations effect triggered:', { 
      expirations, 
      expiration, 
      expirationsLength: expirations.length,
      firstExpiration: expirations[0]
    });
    if (expirations.length > 0 && !expiration) {
      console.log('Auto-selecting first expiration:', expirations[0]);
      setExpiration(expirations[0]);
    }
  }, [expirations]); // Remove expiration from dependencies to avoid loops

  const fetchStockPrice = async () => {
    if (!symbol || symbol.trim().length < 1) return;
    
    const trimmedSymbol = symbol.trim().toUpperCase();
    // Validate symbol format (1-5 uppercase letters)
    if (!/^[A-Z]{1,5}$/.test(trimmedSymbol)) {
      return;
    }
    
    try {
      const response = await api.get(`/options/quote/${trimmedSymbol}`);
      if (response.data && response.data.current_price) {
        setStockPrice(response.data.current_price);
      }
    } catch (error: any) {
      // Log the error for debugging but don't show toast for 404s (expected for invalid symbols)
      const status = error.response?.status;
      const errorMsg = error.response?.data?.error || error.message;
      
      if (status === 404) {
        // 404 is expected for invalid symbols or when quote service is unavailable
        console.debug(`Quote not available for ${trimmedSymbol}:`, errorMsg);
      } else if (status === 401) {
        // 401 means user needs to authenticate - this shouldn't happen on Options Analyzer
        console.warn('Authentication required for quote:', errorMsg);
      } else if (status === 500) {
        // Server error - might be Tradier/Yahoo issue
        console.warn('Quote service error:', errorMsg);
      } else if (status) {
        // Other HTTP errors
        console.warn(`Failed to fetch stock price (${status}):`, errorMsg);
      }
      // Don't set stockPrice to null on error - keep previous value if available
    }
  };

  const handleAddToWatchlist = async () => {
    try {
      await watchlistService.addStock(symbol);
      toast.success(`${symbol} added to watchlist!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add to watchlist');
    }
  };

  const handleTradeFromRecommendation = (option: OptionContract) => {
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

  const handleAddToWatchlistFromRecommendation = async (option: OptionContract) => {
    const stockSymbol = symbol || option.option_symbol.split('_')[0];
    try {
      await watchlistService.addStock(stockSymbol);
      toast.success(`${stockSymbol} added to watchlist!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add to watchlist');
    }
  };

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-secondary">Options Chain Analyzer</h1>
          {stockPrice !== null && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Stock Price</p>
                <p className="text-xl font-bold text-secondary">${stockPrice.toFixed(2)}</p>
              </div>
              <button
                onClick={handleAddToWatchlist}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium text-sm"
              >
                Add to Watchlist
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
            <form onSubmit={handleSymbolSubmit}>
              <input
                type="text"
                value={symbol}
                onChange={handleSymbolChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter symbol (e.g., AAPL)"
                maxLength={10}
              />
            </form>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expiration</label>
            <select
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              disabled={loadingExpirations || expirations.length === 0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select expiration</option>
              {expirations.map((exp) => (
                <option key={exp} value={exp}>
                  {exp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Strategy Preference</label>
            <select
              value={preference}
              onChange={(e) => setPreference(e.target.value as 'income' | 'growth' | 'balanced')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="income">Income</option>
              <option value="balanced">Balanced</option>
              <option value="growth">Growth</option>
            </select>
          </div>
        </div>

        <button
          onClick={analyzeOptions}
          disabled={loading || !symbol || !expiration}
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : 'Analyze Options'}
        </button>
      </div>

      {options.length > 0 && (
        <>
          {/* Top Recommendations Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">🎯 Top Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {options
                .filter(opt => opt.ai_analysis)
                .sort((a, b) => b.score - a.score)
                .slice(0, 6)
                .map((option) => (
                  <div
                    key={option.option_symbol}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          option.contract_type === 'call' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {option.contract_type.toUpperCase()}
                        </span>
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          ${option.strike.toFixed(2)}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-primary">
                        {(option.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    
                    {option.ai_analysis && (
                      <>
                        <div className="mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-600">Recommendation:</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              option.ai_analysis.recommendation.action === 'buy'
                                ? 'bg-green-100 text-green-800'
                                : option.ai_analysis.recommendation.action === 'consider'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {option.ai_analysis.recommendation.action.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {option.ai_analysis.recommendation.reasoning}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          <div>
                            <span className="text-gray-500">Risk:</span>
                            <span className={`ml-1 font-semibold ${
                              option.ai_analysis.risk_assessment.overall_risk_level === 'high'
                                ? 'text-red-600'
                                : option.ai_analysis.risk_assessment.overall_risk_level === 'moderate'
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}>
                              {option.ai_analysis.risk_assessment.overall_risk_level.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Price:</span>
                            <span className="ml-1 font-semibold">${option.mid_price.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 line-clamp-1 mb-3">
                          {option.ai_analysis.trade_analysis.best_case}
                        </div>
                        
                        <button
                          onClick={() => setExpandedOption(expandedOption === option.option_symbol ? null : option.option_symbol)}
                          className="w-full px-3 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 font-medium text-xs transition-colors"
                        >
                          {expandedOption === option.option_symbol ? 'Hide Details' : 'View Details'}
                        </button>
                      </>
                    )}
                  </div>
                ))}
            </div>
            
            {options.filter(opt => opt.ai_analysis).length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No AI analysis available. Click "Details" on any option to see full analysis.
              </p>
            )}

            {/* Expanded Details for Top Recommendations */}
            {expandedOption && options.find(opt => opt.option_symbol === expandedOption) && (() => {
              const option = options.find(opt => opt.option_symbol === expandedOption)!;
              return (
                <div className="mt-6 bg-gray-50 rounded-lg p-6 border-2 border-primary">
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
                    ) : null}

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

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => handleTradeFromRecommendation(option)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 text-sm font-medium transition-colors"
                      >
                        Trade
                      </button>
                      <button 
                        onClick={() => handleAddToWatchlistFromRecommendation(option)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium transition-colors"
                      >
                        Add to Watchlist
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Full Options Chain Table */}
          <div className="bg-white rounded-lg shadow">
            <OptionsChainTable 
              options={options} 
              symbol={symbol} 
              expiration={expiration}
              stockPrice={stockPrice}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default OptionsAnalyzer;

