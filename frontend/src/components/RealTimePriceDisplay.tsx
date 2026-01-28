import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { formatTimestamp as formatTsUtil } from '../utils/dateTime';

interface QuoteData {
  symbol: string;
  current_price: number;
  change: number;
  change_percent: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
}

interface RealTimePriceDisplayProps {
  symbol: string;
  onPriceUpdate?: (price: number) => void;
  timezone?: string;  // Optional timezone override
}

/**
 * Check if US stock market is currently open
 * Market hours: 9:30 AM - 4:00 PM ET (Eastern Time)
 * Monday - Friday only
 */
const isMarketHours = (): boolean => {
  const now = new Date();
  const day = now.getDay();
  
  // Market closed on weekends (0 = Sunday, 6 = Saturday)
  if (day === 0 || day === 6) return false;
  
  // Convert to Eastern Time
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  // Market hours: 9:30 AM (570 minutes) to 4:00 PM (960 minutes) ET
  const marketOpen = 9 * 60 + 30;  // 9:30 AM
  const marketClose = 16 * 60;      // 4:00 PM
  
  return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
};

const RealTimePriceDisplay: React.FC<RealTimePriceDisplayProps> = ({ 
  symbol, 
  onPriceUpdate,
  timezone: timezoneProp
}) => {
  const { user } = useAuth();
  
  // Use prop timezone, then user's timezone, then fallback to America/New_York
  const userTimezone = timezoneProp || user?.timezone || 'America/New_York';
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string>('');
  const [priceUpdated, setPriceUpdated] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousPriceRef = useRef<number | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!symbol || symbol.trim().length < 1) return;
    
    const trimmedSymbol = symbol.trim().toUpperCase();
    if (!/^[A-Z]{1,5}$/.test(trimmedSymbol)) return;

    try {
      const response = await api.get(`/options/quote/${trimmedSymbol}`);
      
      if (response.data && response.data.current_price) {
        const newQuote: QuoteData = {
          symbol: response.data.symbol || trimmedSymbol,
          current_price: response.data.current_price,
          change: response.data.change || 0,
          change_percent: response.data.change_percent || 0,
          volume: response.data.volume,
          high: response.data.high,
          low: response.data.low,
          open: response.data.open
        };
        
        // Check if price changed for animation
        if (previousPriceRef.current !== null && 
            previousPriceRef.current !== newQuote.current_price) {
          setPriceUpdated(true);
          setTimeout(() => setPriceUpdated(false), 500);
        }
        previousPriceRef.current = newQuote.current_price;
        
        setQuote(newQuote);
        setTimestamp(formatTsUtil(new Date(), userTimezone));
        setError(null);
        
        // Notify parent of price update
        if (onPriceUpdate) {
          onPriceUpdate(newQuote.current_price);
        }
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 404) {
        setError('Quote not available');
      } else if (status === 503) {
        setError('Market data service unavailable');
      } else {
        setError('Failed to fetch quote');
      }
      console.error('Failed to fetch quote:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, onPriceUpdate, userTimezone]);

  // Set up polling
  useEffect(() => {
    if (!symbol) return;

    // Initial fetch
    setLoading(true);
    fetchQuote();

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Update interval based on market hours
    // 5 seconds during market hours, 60 seconds after hours
    const updateInterval = () => {
      const interval = isMarketHours() ? 5000 : 60000;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        fetchQuote();
      }, interval);
    };

    updateInterval();

    // Check market hours status every minute to adjust polling frequency
    const marketCheckInterval = setInterval(() => {
      updateInterval();
    }, 60000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearInterval(marketCheckInterval);
    };
  }, [symbol, fetchQuote]);

  // Determine price direction for styling
  const getPriceDirection = (): 'positive' | 'negative' | 'neutral' => {
    if (!quote) return 'neutral';
    if (quote.change > 0) return 'positive';
    if (quote.change < 0) return 'negative';
    return 'neutral';
  };

  const direction = getPriceDirection();

  // Format change values
  const formatChange = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}`;
  };

  const formatChangePercent = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // Loading state
  if (loading && !quote) {
    return (
      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-4 md:mb-6 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <div className="h-10 w-36 bg-gray-200 rounded"></div>
        </div>
        <div className="h-5 w-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // Error state
  if (error && !quote) {
    return (
      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-4 md:mb-6">
        <div className="text-gray-500 text-center">
          <span className="text-xl font-semibold">--</span>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-4 md:mb-6">
      {/* Header Row - Symbol & Market Status */}
      <div className="flex items-center justify-between mb-2">
        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
          {quote.symbol}
        </span>
        {isMarketHours() ? (
          <span className="flex items-center gap-2 text-xs font-medium text-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Market Open
          </span>
        ) : (
          <span className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
            Market Closed
          </span>
        )}
      </div>

      {/* Price Row */}
      <div className="flex flex-wrap items-baseline gap-2 md:gap-4 mb-1">
        <span 
          className={`
            text-3xl md:text-4xl font-bold text-gray-900 tracking-tight
            ${priceUpdated ? 'animate-price-flash' : ''}
          `}
        >
          ${quote.current_price.toFixed(2)}
        </span>
        
        {/* Change - inline on mobile */}
        <div className="flex items-center gap-2">
          <span 
            className={`
              text-base md:text-lg font-semibold
              ${direction === 'positive' ? 'text-green-600' : ''}
              ${direction === 'negative' ? 'text-red-600' : ''}
              ${direction === 'neutral' ? 'text-gray-500' : ''}
            `}
          >
            {formatChange(quote.change)}
          </span>
          <span 
            className={`
              text-base md:text-lg font-semibold
              ${direction === 'positive' ? 'text-green-600' : ''}
              ${direction === 'negative' ? 'text-red-600' : ''}
              ${direction === 'neutral' ? 'text-gray-500' : ''}
            `}
          >
            ({formatChangePercent(quote.change_percent)})
          </span>
          {direction !== 'neutral' && (
            <span 
              className={`
                text-sm
                ${direction === 'positive' ? 'text-green-600' : 'text-red-600'}
              `}
            >
              {direction === 'positive' ? '▲' : '▼'}
            </span>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-xs md:text-sm text-gray-500 mb-3">
        As of {timestamp}
      </div>

      {/* Day Range - Horizontal on all screens */}
      {quote.high && quote.low && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 pt-3 border-t border-gray-100 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Low:</span>
            <span className="font-medium text-gray-700">${quote.low.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">High:</span>
            <span className="font-medium text-gray-700">${quote.high.toFixed(2)}</span>
          </div>
          {quote.volume && (
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Vol:</span>
              <span className="font-medium text-gray-700">
                {quote.volume >= 1000000 
                  ? `${(quote.volume / 1000000).toFixed(2)}M`
                  : quote.volume >= 1000 
                    ? `${(quote.volume / 1000).toFixed(1)}K`
                    : quote.volume.toLocaleString()
                }
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RealTimePriceDisplay;
