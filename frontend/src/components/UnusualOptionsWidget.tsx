import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface UnusualOption {
  option_symbol: string;
  contract_type: string;
  strike: number;
  expiration: string;
  volume: number;
  open_interest: number;
  volume_ratio: number;
  last_price: number;
  detected_at: string;
}

interface UnusualActivity {
  symbol: string;
  unusual_volume: UnusualOption[];
  large_blocks: UnusualOption[];
  sweep_orders: any[];
  summary: {
    total_signals: number;
  };
}

// Helper to determine if contract is a call or put from option symbol
const getContractType = (optionSymbol: string, contractType?: string): 'call' | 'put' | 'unknown' => {
  // If contract_type is provided and valid, use it
  if (contractType) {
    const ct = contractType.toLowerCase().trim();
    if (ct === 'call' || ct === 'c') return 'call';
    if (ct === 'put' || ct === 'p') return 'put';
  }
  
  // Try to parse from option symbol (e.g., COIN240131C00230000)
  // OCC format: Symbol (1-6 chars) + YYMMDD (6 digits) + C/P + Strike (8 digits)
  if (optionSymbol && optionSymbol.length > 10) {
    // Look for C or P followed by 8 digits at the end (the strike price portion)
    const match = optionSymbol.match(/([CP])(\d{8})$/);
    if (match) {
      return match[1] === 'C' ? 'call' : 'put';
    }
    
    // Alternative: Look for the pattern where C/P is between date (6 digits) and strike (8 digits)
    // The C or P should be at position after the symbol and 6-digit date
    // Find where the 6-digit date ends and C/P begins
    const dateAndTypeMatch = optionSymbol.match(/\d{6}([CP])\d{8}$/);
    if (dateAndTypeMatch) {
      return dateAndTypeMatch[1] === 'C' ? 'call' : 'put';
    }
    
    // Last resort: find C or P that's not part of the symbol name
    // Look for C or P that appears after at least 6 digits (the date portion)
    for (let i = optionSymbol.length - 9; i >= 0; i--) {
      const char = optionSymbol[i];
      if (char === 'C' || char === 'P') {
        // Check if preceded by digits (the date) and followed by digits (strike)
        const before = optionSymbol.substring(Math.max(0, i - 6), i);
        const after = optionSymbol.substring(i + 1, i + 9);
        if (/\d{6}$/.test(before) && /^\d{8}/.test(after)) {
          return char === 'C' ? 'call' : 'put';
        }
      }
    }
  }
  
  return 'unknown';
};

const UnusualOptionsWidget: React.FC = () => {
  const [activities, setActivities] = useState<UnusualActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showAllModal, setShowAllModal] = useState(false);

  useEffect(() => {
    fetchUnusualActivity();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchUnusualActivity, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnusualActivity = async () => {
    try {
      setLoading(true);
      // Get watchlist first
      const watchlistRes = await api.get('/watchlist');
      const symbols = watchlistRes.data.watchlist?.map((s: any) => s.symbol) || [];
      
      if (symbols.length === 0) {
        setActivities([]);
        setError(null);
        setLoading(false);
        return;
      }
      
      // Fetch unusual activity for top 5 symbols (limit API calls)
      const topSymbols = symbols.slice(0, 5);
      const results: UnusualActivity[] = [];
      
      for (const symbol of topSymbols) {
        try {
          const res = await api.get(`/options-flow/analyze/${symbol}`);
          if (res.data && res.data.summary?.total_signals > 0) {
            results.push(res.data);
          }
        } catch (err) {
          // Ignore individual symbol errors
        }
      }
      
      setActivities(results);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch unusual activity:', err);
      setError('Unable to load activity');
    } finally {
      setLoading(false);
    }
  };

  const formatVolume = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDollarVolume = (volume: number, price: number) => {
    const total = volume * price * 100;
    if (total >= 1000000) return `$${(total / 1000000).toFixed(1)}M`;
    if (total >= 1000) return `$${(total / 1000).toFixed(0)}K`;
    return `$${total.toFixed(0)}`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'volume': return '📊';
      case 'block': return '💰';
      case 'sweep': return '🌊';
      default: return '🔥';
    }
  };

  // Flatten all unusual options from all symbols
  const allUnusual: Array<UnusualOption & { symbol: string; type: string; derivedContractType: 'call' | 'put' | 'unknown' }> = [];
  activities.forEach(activity => {
    activity.unusual_volume.forEach(opt => {
      allUnusual.push({ 
        ...opt, 
        symbol: activity.symbol, 
        type: 'volume',
        derivedContractType: getContractType(opt.option_symbol, opt.contract_type)
      });
    });
    activity.large_blocks.slice(0, 3).forEach(opt => {
      allUnusual.push({ 
        ...opt, 
        symbol: activity.symbol, 
        type: 'block',
        derivedContractType: getContractType(opt.option_symbol, opt.contract_type)
      });
    });
  });

  // Sort by volume ratio (highest first)
  allUnusual.sort((a, b) => (b.volume_ratio || 0) - (a.volume_ratio || 0));

  // Calculate sentiment summary
  const callCount = allUnusual.filter(x => x.derivedContractType === 'call').length;
  const putCount = allUnusual.filter(x => x.derivedContractType === 'put').length;
  const sentiment = callCount > putCount ? 'bullish' : putCount > callCount ? 'bearish' : 'neutral';

  if (loading && activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          🔥 Unusual Options Activity
        </h3>
        <div className="text-center py-4 text-gray-400">Scanning for activity...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          🔥 Unusual Options Activity
        </h3>
        <button 
          onClick={fetchUnusualActivity}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
          title="Refresh"
          disabled={loading}
        >
          {loading ? '...' : '↻'}
        </button>
      </div>

      {error ? (
        <div className="text-center py-6 text-gray-400">{error}</div>
      ) : allUnusual.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-400 text-sm">No unusual activity detected</p>
          <p className="text-xs text-gray-300 mt-1">Checking volume spikes and large blocks</p>
        </div>
      ) : (
        <>
          {/* Sentiment Summary */}
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-3 text-xs">
              <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                sentiment === 'bullish' ? 'bg-green-100 text-green-700' : 
                sentiment === 'bearish' ? 'bg-red-100 text-red-700' : 
                'bg-gray-100 text-gray-600'
              }`}>
                {sentiment === 'bullish' ? '📈' : sentiment === 'bearish' ? '📉' : '➖'}
                {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} Flow
              </span>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="text-green-600 font-medium">{callCount} Calls</span>
              <span className="text-gray-400">|</span>
              <span className="text-red-600 font-medium">{putCount} Puts</span>
            </div>
          </div>
          
          <div className="space-y-2">
            {allUnusual.slice(0, 5).map((item, index) => {
              const isCall = item.derivedContractType === 'call';
              const isPut = item.derivedContractType === 'put';
              
              return (
                <div
                  key={`${item.symbol}-${item.strike}-${item.derivedContractType}-${index}`}
                  className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg border-l-4 ${
                    isCall ? 'border-green-500' : isPut ? 'border-red-500' : 'border-gray-400'
                  }`}
                >
                  <div className="text-2xl">
                    {isCall ? '🟢' : isPut ? '🔴' : getActivityIcon(item.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900">{item.symbol}</span>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                        isCall ? 'bg-green-100 text-green-800' : 
                        isPut ? 'bg-red-100 text-red-800' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        ${item.strike} {isCall ? 'CALL' : isPut ? 'PUT' : 'OPTION'}
                      </span>
                      {isCall && <span className="text-xs text-green-600">↗ Bullish</span>}
                      {isPut && <span className="text-xs text-red-600">↘ Bearish</span>}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.volume_ratio ? `${item.volume_ratio}x avg volume` : 'Large block'} • {formatDollarVolume(item.volume, item.last_price)}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-sm font-bold ${isCall ? 'text-green-600' : isPut ? 'text-red-600' : 'text-gray-700'}`}>
                      {formatVolume(item.volume)}
                    </div>
                    <div className="text-xs text-gray-400">
                      contracts
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-400">
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Checking watchlist stocks'}
        </span>
        {allUnusual.length > 5 && (
          <button
            onClick={() => setShowAllModal(true)}
            className="text-xs text-primary hover:text-indigo-700 font-medium hover:underline"
          >
            +{allUnusual.length - 5} more signals →
          </button>
        )}
      </div>

      {/* All Signals Modal */}
      {showAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-bold text-gray-900">🔥 All Unusual Options Activity</h3>
                <p className="text-xs text-gray-500">{allUnusual.length} signals detected from watchlist</p>
              </div>
              <button
                onClick={() => setShowAllModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            {/* Sentiment Summary */}
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  sentiment === 'bullish' ? 'bg-green-100 text-green-700' : 
                  sentiment === 'bearish' ? 'bg-red-100 text-red-700' : 
                  'bg-gray-100 text-gray-600'
                }`}>
                  {sentiment === 'bullish' ? '📈 Bullish' : sentiment === 'bearish' ? '📉 Bearish' : '➖ Neutral'} Overall
                </span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span className="font-medium text-green-700">{callCount} Calls</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  <span className="font-medium text-red-700">{putCount} Puts</span>
                </span>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[50vh] p-4 space-y-2">
              {allUnusual.map((item, index) => {
                const isCall = item.derivedContractType === 'call';
                const isPut = item.derivedContractType === 'put';
                
                return (
                  <div
                    key={`modal-${item.symbol}-${item.strike}-${item.derivedContractType}-${index}`}
                    className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${
                      isCall ? 'bg-green-50 border-green-500' : isPut ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-gray-400'
                    }`}
                  >
                    <div className="text-xl">
                      {isCall ? '🟢' : isPut ? '🔴' : '⚪'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{item.symbol}</span>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                          isCall ? 'bg-green-200 text-green-800' : 
                          isPut ? 'bg-red-200 text-red-800' : 
                          'bg-gray-200 text-gray-700'
                        }`}>
                          ${item.strike} {isCall ? 'CALL' : isPut ? 'PUT' : 'OPTION'}
                        </span>
                        <span className={`text-xs font-medium ${isCall ? 'text-green-600' : isPut ? 'text-red-600' : 'text-gray-500'}`}>
                          {isCall ? '↗ Bullish Bet' : isPut ? '↘ Bearish Bet' : ''}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {item.volume_ratio ? `${item.volume_ratio}x avg volume` : 'Large block'} • {formatDollarVolume(item.volume, item.last_price)}
                        {item.expiration && ` • Exp: ${item.expiration}`}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-sm font-bold ${isCall ? 'text-green-600' : isPut ? 'text-red-600' : 'text-gray-700'}`}>
                        {formatVolume(item.volume)}
                      </div>
                      <div className="text-xs text-gray-400">
                        contracts
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t bg-gray-50 text-center">
              <p className="text-xs text-gray-500">
                💡 <strong>Calls</strong> = Bullish (whales betting price goes UP) | <strong>Puts</strong> = Bearish (whales betting price goes DOWN)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnusualOptionsWidget;
