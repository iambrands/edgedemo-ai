import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface FinnhubEarning {
  symbol: string;
  date: string;
  hour: string;  // 'bmo' (before market open), 'amc' (after market close), or ''
  quarter: number | null;
  year: number | null;
  eps_estimate: number | null;
  eps_actual: number | null;
  revenue_estimate: number | null;
  revenue_actual: number | null;
}

interface ProcessedEarning extends FinnhubEarning {
  days_until: number;
  is_this_week: boolean;
}

const EarningsWidget: React.FC = () => {
  const [earnings, setEarnings] = useState<ProcessedEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEarnings();
    
    // Refresh every hour
    const interval = setInterval(fetchEarnings, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      
      // Use Finnhub endpoint directly for real earnings data
      const response = await api.get('/earnings/finnhub/earnings?days=14');
      const rawEarnings: FinnhubEarning[] = response.data.earnings || [];
      
      // Process and enrich earnings data
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const processed: ProcessedEarning[] = rawEarnings
        .filter(e => e.date && e.symbol) // Filter out invalid entries
        .map(e => {
          const earningsDate = new Date(e.date);
          earningsDate.setHours(0, 0, 0, 0);
          const diffTime = earningsDate.getTime() - today.getTime();
          const days_until = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          return {
            ...e,
            days_until,
            is_this_week: days_until >= 0 && days_until <= 7
          };
        })
        .filter(e => e.days_until >= 0) // Only future earnings
        .sort((a, b) => a.days_until - b.days_until);
      
      setEarnings(processed);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch earnings:', err);
      // Try to provide more specific error message
      if (err.response?.status === 401) {
        setError('Please log in to view earnings');
      } else if (err.response?.data?.error?.includes('API key')) {
        setError('Earnings service unavailable');
      } else {
        setError('Unable to load earnings');
      }
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

  const formatTiming = (hour: string) => {
    const map: Record<string, string> = {
      'bmo': 'Before Open',
      'amc': 'After Close',
      'dmh': 'During Market',
      '': 'TBD'
    };
    return map[hour] || hour || 'TBD';
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

  const formatEPS = (eps: number | null) => {
    if (eps === null || eps === undefined) return null;
    return `$${eps.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          📅 Upcoming Earnings
        </h3>
        <div className="text-center py-4 text-gray-400">Loading earnings calendar...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          📅 Upcoming Earnings
        </h3>
        <div className="text-center py-4 text-gray-400">{error}</div>
        <button 
          onClick={fetchEarnings}
          className="w-full mt-2 text-xs text-primary hover:text-indigo-700 py-1"
        >
          Try again
        </button>
      </div>
    );
  }

  const thisWeekEarnings = earnings.filter(e => e.is_this_week);
  const displayEarnings = thisWeekEarnings.length > 0 ? thisWeekEarnings : earnings.slice(0, 8);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          📅 {thisWeekEarnings.length > 0 ? 'Earnings This Week' : 'Upcoming Earnings'}
        </h3>
        <button 
          onClick={fetchEarnings}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {displayEarnings.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-400 text-sm">No upcoming earnings found</p>
          <p className="text-xs text-gray-300 mt-1">Check back later for updates</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayEarnings.slice(0, 8).map((earning, index) => (
            <div
              key={`${earning.symbol}-${earning.date}-${index}`}
              className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                earning.days_until === 0 ? 'bg-red-50 border-red-500' :
                earning.days_until === 1 ? 'bg-orange-50 border-orange-500' :
                earning.days_until <= 3 ? 'bg-amber-50 border-amber-500' :
                'bg-gray-50 border-blue-500'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{earning.symbol}</span>
                  {earning.eps_estimate && (
                    <span className="text-xs text-gray-500">
                      Est: {formatEPS(earning.eps_estimate)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(earning.date)} • {formatTiming(earning.hour)}
                </div>
              </div>
              <div className="ml-3">
                {getCountdownBadge(earning.days_until)}
              </div>
            </div>
          ))}
          
          {displayEarnings.length > 8 && (
            <div className="text-center pt-2">
              <span className="text-xs text-gray-400">
                +{displayEarnings.length - 8} more upcoming
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 text-center">
        <span className="text-xs text-gray-400">
          {thisWeekEarnings.length > 0 
            ? `${thisWeekEarnings.length} companies reporting this week`
            : `${earnings.length} earnings in next 14 days`
          }
        </span>
      </div>
    </div>
  );
};

export default EarningsWidget;
