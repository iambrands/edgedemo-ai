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

const UnusualOptionsWidget: React.FC = () => {
  const [activities, setActivities] = useState<UnusualActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
  const allUnusual: Array<UnusualOption & { symbol: string; type: string }> = [];
  activities.forEach(activity => {
    activity.unusual_volume.forEach(opt => {
      allUnusual.push({ ...opt, symbol: activity.symbol, type: 'volume' });
    });
    activity.large_blocks.slice(0, 3).forEach(opt => {
      allUnusual.push({ ...opt, symbol: activity.symbol, type: 'block' });
    });
  });

  // Sort by volume ratio (highest first)
  allUnusual.sort((a, b) => (b.volume_ratio || 0) - (a.volume_ratio || 0));

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
        <div className="space-y-2">
          {allUnusual.slice(0, 5).map((item, index) => (
            <div
              key={`${item.symbol}-${item.strike}-${item.contract_type}-${index}`}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border-l-4 border-red-500"
            >
              <div className="text-2xl">
                {getActivityIcon(item.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{item.symbol}</span>
                  <span className={`px-1.5 py-0.5 text-xs font-semibold rounded ${
                    item.contract_type?.toLowerCase() === 'call' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    ${item.strike} {item.contract_type?.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {item.volume_ratio ? `${item.volume_ratio}x avg volume` : 'Large block'} • {formatDollarVolume(item.volume, item.last_price)}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-bold text-red-600">
                  {formatVolume(item.volume)}
                </div>
                <div className="text-xs text-gray-400">
                  contracts
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs text-gray-400">
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Checking watchlist stocks'}
        </span>
        {allUnusual.length > 5 && (
          <span className="text-xs text-gray-400">
            +{allUnusual.length - 5} more signals
          </span>
        )}
      </div>
    </div>
  );
};

export default UnusualOptionsWidget;
