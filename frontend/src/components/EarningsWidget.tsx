import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface Earning {
  symbol: string;
  earnings_date: string;
  earnings_time: string;
  days_until: number;
  is_this_week: boolean;
  fiscal_quarter?: string;
}

const EarningsWidget: React.FC = () => {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/earnings?days_ahead=14');
      setEarnings(response.data.earnings || []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch earnings:', err);
      setError('Unable to load earnings');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTiming = (timing: string) => {
    const map: Record<string, string> = {
      'before_market': 'Before Open',
      'after_market': 'After Close',
      'during_market': 'During Market'
    };
    return map[timing] || timing;
  };

  const getCountdownBadge = (daysUntil: number) => {
    if (daysUntil === 0) {
      return (
        <span className="px-2 py-1 bg-red-500 text-white rounded-full text-xs font-bold animate-pulse">
          TODAY
        </span>
      );
    } else if (daysUntil === 1) {
      return (
        <span className="px-2 py-1 bg-orange-500 text-white rounded-full text-xs font-bold">
          Tomorrow
        </span>
      );
    } else if (daysUntil <= 7) {
      return (
        <span className="px-2 py-1 bg-amber-500 text-white rounded-full text-xs font-bold">
          {daysUntil}d
        </span>
      );
    }
    return (
      <span className="text-xs text-gray-500 font-medium">
        {daysUntil}d
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          📅 Earnings This Week
        </h3>
        <div className="text-center py-4 text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          📅 Earnings This Week
        </h3>
        <div className="text-center py-4 text-gray-400">{error}</div>
      </div>
    );
  }

  const thisWeekEarnings = earnings.filter(e => e.is_this_week);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          📅 Earnings This Week
        </h3>
        <button 
          onClick={fetchEarnings}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {thisWeekEarnings.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-400 text-sm">No upcoming earnings in your watchlist</p>
          <p className="text-xs text-gray-300 mt-1">Add stocks to see their earnings dates</p>
        </div>
      ) : (
        <div className="space-y-2">
          {thisWeekEarnings.slice(0, 5).map((earning, index) => (
            <div
              key={`${earning.symbol}-${index}`}
              className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                earning.days_until === 0 ? 'bg-red-50 border-red-500' :
                earning.days_until === 1 ? 'bg-orange-50 border-orange-500' :
                'bg-gray-50 border-blue-500'
              }`}
            >
              <div className="flex-1">
                <div className="font-bold text-gray-900">{earning.symbol}</div>
                <div className="text-xs text-gray-500">
                  {formatDate(earning.earnings_date)} • {formatTiming(earning.earnings_time)}
                </div>
              </div>
              <div className="ml-3">
                {getCountdownBadge(earning.days_until)}
              </div>
            </div>
          ))}
          
          {thisWeekEarnings.length > 5 && (
            <div className="text-center pt-2">
              <span className="text-xs text-gray-400">
                +{thisWeekEarnings.length - 5} more this week
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 text-center">
        <span className="text-xs text-gray-400">
          Showing watchlist stocks only
        </span>
      </div>
    </div>
  );
};

export default EarningsWidget;
