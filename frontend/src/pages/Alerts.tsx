import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import AlertFilters from '../components/AlertFilters';

interface Alert {
  id: number;
  alert_type: string;
  priority: string;
  status: string;
  symbol: string;
  signal_direction?: string;
  confidence?: number;
  signal_strength?: string;
  title: string;
  message: string;
  explanation?: string;
  details?: any;
  option_symbol?: string;
  strike_price?: number;
  expiration_date?: string;
  position_id?: number;
  automation_id?: number;
  created_at: string;
  expires_at?: string;
}

const Alerts: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterSettings, setFilterSettings] = useState<any>(null);
  const [filter, setFilter] = useState({
    status: 'active',
    type: '',
    priority: ''
  });

  useEffect(() => {
    loadAlerts();
    loadFilterSettings();
    // Refresh alerts every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const loadFilterSettings = async () => {
    try {
      const response = await api.get('/alerts/filters');
      setFilterSettings(response.data);
    } catch (error: any) {
      // Don't show error toast or redirect - just use defaults silently
      console.warn('Failed to load filter settings, using defaults:', error);
      // Set default state so UI doesn't break
      setFilterSettings({
        is_default: true,
        filters: {
          enabled: false,
          min_confidence: 0.6
        }
      });
    }
  };

  const loadAlerts = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status !== 'all') params.append('status', filter.status);
      if (filter.type) params.append('type', filter.type);
      if (filter.priority) params.append('priority', filter.priority);
      
      const response = await api.get(`/alerts?${params.toString()}`);
      setAlerts(response.data.alerts);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: number) => {
    try {
      await api.put(`/alerts/${alertId}/acknowledge`);
      toast.success('Alert acknowledged');
      loadAlerts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to acknowledge alert');
    }
  };

  const handleDismiss = async (alertId: number) => {
    try {
      await api.put(`/alerts/${alertId}/dismiss`);
      toast.success('Alert dismissed');
      loadAlerts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to dismiss alert');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const activeAlerts = alerts.filter(a => a.status === 'active');
      await Promise.all(activeAlerts.map(alert => api.put(`/alerts/${alert.id}/acknowledge`)));
      toast.success(`Marked ${activeAlerts.length} alert(s) as read`);
      loadAlerts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to mark alerts as read');
    }
  };

  const handleGenerateAlerts = async () => {
    if (generating) return; // Prevent multiple clicks
    
    setGenerating(true);
    const loadingToast = toast.loading('Generating alerts... This may take a few seconds.');
    
    try {
      const response = await api.post('/alerts/generate');
      const results = response.data.results;
      
      toast.dismiss(loadingToast);
      
      if (results.total > 0) {
        toast.success(
          `Generated ${results.total} alerts: ${results.buy_signals} buy signals, ${results.sell_signals} sell signals, ${results.risk_alerts} risk alerts`,
          { duration: 5000 }
        );
      } else {
        toast.success('Scan complete. No new alerts found.', { duration: 3000 });
      }
      
      // Reload alerts to show the new ones
      await loadAlerts();
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.error || 'Failed to generate alerts');
    } finally {
      setGenerating(false);
    }
  };

  const handleViewPosition = (positionId?: number) => {
    if (positionId) {
      navigate('/dashboard');
      // Could scroll to position or highlight it
    }
  };

  const handleViewAutomation = (automationId?: number) => {
    if (automationId) {
      navigate('/automations');
      // Could highlight the automation
    }
  };

  const handleTrade = (symbol: string, optionSymbol?: string, strike?: number, expiration?: string) => {
    const tradeData: any = { symbol };
    if (optionSymbol) {
      tradeData.optionSymbol = optionSymbol;
      tradeData.strike = strike;
      tradeData.expiration = expiration;
    }
    sessionStorage.setItem('tradeData', JSON.stringify(tradeData));
    navigate('/trade');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'buy_signal': return '📈';
      case 'sell_signal': return '📉';
      case 'risk_alert': return '⚠️';
      case 'trade_executed': return '✅';
      default: return '🔔';
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading alerts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Alerts</h1>
          {generating && (
            <p className="text-sm text-gray-500 mt-1">Scanning watchlist, positions, and risk limits...</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium"
            title="Configure custom alert filters"
          >
            ⚙️ Configure Filters
          </button>
          <button
            onClick={handleGenerateAlerts}
            disabled={generating}
            className={`px-4 py-2 rounded-lg transition-colors font-medium ${
              generating
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-success text-white hover:bg-green-600'
            }`}
            title="Scan watchlist, positions, and risk limits to generate new alerts"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Generating...
              </span>
            ) : (
              'Generate Alerts'
            )}
          </button>
          {alerts.filter(a => a.status === 'active').length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Mark All Read
            </button>
          )}
          <button
            onClick={loadAlerts}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="dismissed">Dismissed</option>
              <option value="all">All</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="buy_signal">Buy Signals</option>
              <option value="sell_signal">Sell Signals</option>
              <option value="trade_executed">Trade Executed</option>
              <option value="risk_alert">Risk Alerts</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={filter.priority}
              onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">ℹ️ About Alerts</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Buy Signals:</strong> Generated from your watchlist when technical indicators (RSI, moving averages, MACD, volume) suggest buying opportunities. Confidence score (0-100%) shows signal strength.</li>
              <li>• <strong>Sell Signals:</strong> Generated for open positions when exit conditions are met (profit target reached, stop loss triggered, expiration approaching, or max days held).</li>
              <li>• <strong>Risk Alerts:</strong> Generated when portfolio risk limits are approached or exceeded (daily loss limits, position size limits, etc.).</li>
              <li>• <strong>Trade Alerts:</strong> Automatically created when automations execute trades (both buys and sells).</li>
              <li>• <strong>Confidence Score:</strong> Shows how strong the signal is (0-100%). Higher = stronger signal. Signals with confidence ≥ your Min Confidence setting will trigger automation trades.</li>
              <li>• <strong>Generate Alerts:</strong> Click "Generate Alerts" to scan your watchlist, positions, and risk limits now. This runs technical analysis on all watchlist symbols.</li>
            </ul>
            <div className="mt-3 p-2 bg-white rounded border border-blue-300">
              <p className="text-xs text-blue-900 font-semibold mb-1">💡 How Confidence is Calculated:</p>
              <p className="text-xs text-blue-800">
                Confidence is based on: (1) Technical indicator strength (moving averages, RSI, MACD), (2) How far price is above/below moving averages, (3) Volume patterns, (4) IV rank adjustments. 
                The 77% you see is from the Golden Cross pattern calculation when price is well above all moving averages. Different patterns produce different confidence scores.
              </p>
            </div>
          </div>
          {filterSettings && (
            <div className="ml-4 text-sm">
              <div className="bg-white rounded p-2 border border-blue-300">
                <p className="font-semibold text-blue-900 mb-1">Current Settings:</p>
                <p className="text-blue-700">
                  {filterSettings.is_default ? (
                    <span>Using <strong>Platform Defaults</strong></span>
                  ) : filterSettings.filters?.enabled ? (
                    <span>Using <strong>Custom Filters</strong> (Min Confidence: {(filterSettings.filters.min_confidence * 100).toFixed(0)}%)</span>
                  ) : (
                    <span>Custom filters <strong>disabled</strong> (using defaults)</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">No alerts found</p>
            <p className="text-gray-400 text-sm mt-2">
              Click "Generate Alerts" to scan your watchlist, positions, and risk limits for new alerts
            </p>
            <button
              onClick={handleGenerateAlerts}
              disabled={generating}
              className={`mt-4 px-6 py-2 rounded-lg transition-colors font-medium ${
                generating
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-success text-white hover:bg-green-600'
              }`}
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  Generating Alerts...
                </span>
              ) : (
                'Generate Alerts Now'
              )}
            </button>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-lg shadow border-l-4 ${getPriorityColor(alert.priority)}`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="text-3xl">{getTypeIcon(alert.alert_type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-secondary">{alert.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(alert.priority)}`}>
                          {alert.priority.toUpperCase()}
                        </span>
                        {alert.symbol && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            {alert.symbol}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-2">{alert.message}</p>
                      {alert.explanation && (
                        <p className="text-sm text-gray-600 mb-2">{alert.explanation}</p>
                      )}
                      
                      {/* Technical Indicators Details */}
                      {alert.details?.indicators && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3 mt-2">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2">📊 Technical Indicators:</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            {alert.details.indicators.rsi !== undefined && (
                              <div>
                                <span className="text-gray-600">RSI:</span>
                                <span className={`ml-1 font-medium ${
                                  alert.details.indicators.rsi < 30 ? 'text-green-600' :
                                  alert.details.indicators.rsi > 70 ? 'text-red-600' : 'text-gray-700'
                                }`}>
                                  {alert.details.indicators.rsi.toFixed(1)}
                                </span>
                              </div>
                            )}
                            {alert.details.indicators.sma_20 !== undefined && (
                              <div>
                                <span className="text-gray-600">SMA20:</span>
                                <span className="ml-1 font-medium text-gray-700">${alert.details.indicators.sma_20.toFixed(2)}</span>
                              </div>
                            )}
                            {alert.details.indicators.sma_50 !== undefined && (
                              <div>
                                <span className="text-gray-600">SMA50:</span>
                                <span className="ml-1 font-medium text-gray-700">${alert.details.indicators.sma_50.toFixed(2)}</span>
                              </div>
                            )}
                            {alert.details.indicators.volume?.ratio !== undefined && (
                              <div>
                                <span className="text-gray-600">Volume:</span>
                                <span className={`ml-1 font-medium ${
                                  alert.details.indicators.volume.ratio > 1.5 ? 'text-green-600' : 'text-gray-700'
                                }`}>
                                  {alert.details.indicators.volume.ratio.toFixed(1)}x
                                </span>
                              </div>
                            )}
                            {alert.details.indicators.macd?.histogram !== undefined && (
                              <div>
                                <span className="text-gray-600">MACD:</span>
                                <span className={`ml-1 font-medium ${
                                  alert.details.indicators.macd.histogram > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {alert.details.indicators.macd.histogram > 0 ? '↑' : '↓'} {Math.abs(alert.details.indicators.macd.histogram).toFixed(3)}
                                </span>
                              </div>
                            )}
                            {alert.details.indicators.price_change?.percent !== undefined && (
                              <div>
                                <span className="text-gray-600">Price Change:</span>
                                <span className={`ml-1 font-medium ${
                                  alert.details.indicators.price_change.percent > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {alert.details.indicators.price_change.percent > 0 ? '+' : ''}{alert.details.indicators.price_change.percent.toFixed(2)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Triggered Signals */}
                      {alert.details?.triggered_signals && alert.details.triggered_signals.length > 0 && (
                        <div className="bg-blue-50 rounded-lg p-3 mb-3">
                          <h4 className="text-xs font-semibold text-blue-900 mb-2">🎯 Signals Triggered:</h4>
                          <ul className="space-y-1">
                            {alert.details.triggered_signals.map((signal: any, idx: number) => (
                              <li key={idx} className="text-xs text-blue-800">
                                <span className="font-medium">{signal.name}</span>
                                {signal.description && (
                                  <span className="text-blue-700">: {signal.description}</span>
                                )}
                                <span className="text-blue-600 ml-1">
                                  ({(signal.confidence * 100).toFixed(0)}% confidence, {signal.strength})
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* AI Analysis Section */}
                      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-3 border border-purple-200">
                        <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                          🤖 AI Analysis & Recommendation
                        </h4>
                        <div className="text-sm text-gray-700 space-y-2">
                          {(() => {
                            const confidence = alert.confidence || 0;
                            const indicators = alert.details?.indicators || {};
                            const rsi = indicators.rsi;
                            const sma20 = indicators.sma_20;
                            const sma50 = indicators.sma_50;
                            const volumeRatio = indicators.volume?.ratio;
                            const priceChange = indicators.price_change?.percent;
                            const macdHist = indicators.macd?.histogram;
                            
                            let analysis = [];
                            
                            // Confidence Analysis
                            if (confidence >= 0.75) {
                              analysis.push(`✅ **Strong Signal** (${(confidence * 100).toFixed(1)}% confidence): This is a high-quality trading opportunity with multiple technical indicators aligned.`);
                            } else if (confidence >= 0.60) {
                              analysis.push(`⚠️ **Moderate Signal** (${(confidence * 100).toFixed(1)}% confidence): This is a decent opportunity, but consider additional factors before trading.`);
                            } else {
                              analysis.push(`📊 **Weak Signal** (${(confidence * 100).toFixed(1)}% confidence): This signal has lower confidence. Proceed with caution.`);
                            }
                            
                            // RSI Analysis
                            if (rsi !== undefined) {
                              if (rsi < 30) {
                                analysis.push(`📉 **RSI Oversold** (${rsi.toFixed(1)}): Stock is oversold, potential bounce opportunity. Good for buying calls.`);
                              } else if (rsi > 70) {
                                analysis.push(`📈 **RSI Overbought** (${rsi.toFixed(1)}): Stock is overbought, may pull back. Consider waiting or buying puts.`);
                              } else if (rsi > 50) {
                                analysis.push(`➡️ **RSI Neutral-Bullish** (${rsi.toFixed(1)}): Momentum is positive but not extreme.`);
                              } else {
                                analysis.push(`➡️ **RSI Neutral-Bearish** (${rsi.toFixed(1)}): Momentum is negative but not extreme.`);
                              }
                            }
                            
                            // Moving Average Analysis
                            if (sma20 && sma50) {
                              if (sma20 > sma50) {
                                analysis.push(`📊 **Bullish Trend**: Price (${alert.details?.indicators?.sma_20 ? `$${alert.details.indicators.sma_20.toFixed(2)}` : 'current'}) is above both SMA20 and SMA50, indicating upward momentum.`);
                              } else {
                                analysis.push(`📊 **Bearish Trend**: Price is below moving averages, indicating downward pressure.`);
                              }
                            }
                            
                            // Volume Analysis
                            if (volumeRatio !== undefined) {
                              if (volumeRatio > 1.5) {
                                analysis.push(`📢 **High Volume** (${volumeRatio.toFixed(1)}x average): Strong interest in this stock. Volume confirms the price movement.`);
                              } else if (volumeRatio < 0.7) {
                                analysis.push(`🔇 **Low Volume** (${volumeRatio.toFixed(1)}x average): Weak volume suggests the move may not be sustainable.`);
                              }
                            }
                            
                            // MACD Analysis
                            if (macdHist !== undefined) {
                              if (macdHist > 0) {
                                analysis.push(`📈 **MACD Bullish**: MACD histogram is positive, indicating bullish momentum.`);
                              } else {
                                analysis.push(`📉 **MACD Bearish**: MACD histogram is negative, indicating bearish momentum.`);
                              }
                            }
                            
                            // Price Change Analysis
                            if (priceChange !== undefined) {
                              if (priceChange > 2) {
                                analysis.push(`🚀 **Strong Price Move** (+${priceChange.toFixed(2)}%): Significant price movement suggests strong momentum.`);
                              } else if (priceChange < -2) {
                                analysis.push(`📉 **Significant Decline** (${priceChange.toFixed(2)}%): Large drop may present buying opportunity if oversold.`);
                              }
                            }
                            
                            // Overall Recommendation
                            if (alert.alert_type === 'buy_signal') {
                              if (confidence >= 0.75) {
                                analysis.push(`💡 **Recommendation**: This is a strong buy signal. Consider reviewing options chains for entry opportunities. Look for calls with 30-45 days to expiration and delta around 0.30-0.40.`);
                              } else {
                                analysis.push(`💡 **Recommendation**: This signal has moderate confidence. Review the technical indicators above and consider waiting for stronger confirmation or use smaller position sizes.`);
                              }
                            } else if (alert.alert_type === 'sell_signal') {
                              analysis.push(`💡 **Recommendation**: Exit conditions have been met. Consider closing this position to lock in profits or limit losses as configured in your automation.`);
                            }
                            
                            return analysis.map((item, idx) => (
                              <div key={idx} className="text-xs leading-relaxed">
                                {item.split('**').map((part, i) => 
                                  i % 2 === 1 ? <strong key={i} className="text-purple-800">{part}</strong> : part
                                )}
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-3">
                        {alert.confidence && (
                          <span>Confidence: {(alert.confidence * 100).toFixed(1)}%</span>
                        )}
                        {alert.signal_strength && (
                          <span>Strength: {alert.signal_strength}</span>
                        )}
                        {alert.option_symbol && (
                          <span>Option: {alert.option_symbol}</span>
                        )}
                        {alert.strike_price && (
                          <span>Strike: ${alert.strike_price.toFixed(2)}</span>
                        )}
                        <span>Created: {new Date(alert.created_at).toLocaleString()}</span>
                      </div>
                      {/* Quick Actions */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {alert.position_id && (
                          <button
                            onClick={() => handleViewPosition(alert.position_id)}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-medium"
                          >
                            View Position
                          </button>
                        )}
                        {alert.automation_id && (
                          <button
                            onClick={() => handleViewAutomation(alert.automation_id)}
                            className="px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-xs font-medium"
                          >
                            View Automation
                          </button>
                        )}
                        {alert.symbol && (
                          <button
                            onClick={() => handleTrade(alert.symbol, alert.option_symbol, alert.strike_price, alert.expiration_date)}
                            className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs font-medium"
                          >
                            Trade
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {alert.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="px-3 py-1 bg-primary text-white rounded hover:bg-indigo-600 text-sm font-medium"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={() => handleDismiss(alert.id)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Filter Configuration Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="relative">
            <AlertFilters
              onClose={() => {
                setShowFilters(false);
                loadFilterSettings();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;

