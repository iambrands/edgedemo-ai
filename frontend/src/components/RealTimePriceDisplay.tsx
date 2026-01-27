import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

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

/**
 * Format timestamp for display
 */
const formatTimestamp = (): string => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  };
  return `today at ${now.toLocaleString('en-US', options)}`;
};

const RealTimePriceDisplay: React.FC<RealTimePriceDisplayProps> = ({ 
  symbol, 
  onPriceUpdate 
}) => {
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
        setTimestamp(formatTimestamp());
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
  }, [symbol, onPriceUpdate]);

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
      <div className="price-display-container bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl mb-6 shadow-lg animate-pulse">
        <div className="flex items-baseline gap-2 mb-2">
          <div className="h-12 w-32 bg-slate-700 rounded"></div>
          <div className="h-6 w-12 bg-slate-700 rounded"></div>
        </div>
        <div className="h-5 w-24 bg-slate-700 rounded mb-2"></div>
        <div className="h-4 w-40 bg-slate-700 rounded"></div>
      </div>
    );
  }

  // Error state
  if (error && !quote) {
    return (
      <div className="price-display-container bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-xl mb-6 shadow-lg">
        <div className="text-slate-400 text-center">
          <span className="text-xl">--</span>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div 
      className={`
        price-display-container 
        bg-gradient-to-r from-slate-800 to-slate-900 
        p-6 rounded-xl mb-6 shadow-lg
        border border-slate-700
        transition-all duration-300
      `}
    >
      {/* Symbol Badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="px-3 py-1 bg-slate-700 rounded-full text-slate-300 text-sm font-medium">
          {quote.symbol}
        </span>
        {isMarketHours() ? (
          <span className="flex items-center gap-2 text-xs text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Market Open
          </span>
        ) : (
          <span className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
            Market Closed
          </span>
        )}
      </div>

      {/* Main Price Display */}
      <div className="flex items-baseline gap-3 mb-2">
        <span 
          className={`
            text-4xl md:text-5xl font-bold text-white tracking-tight
            ${priceUpdated ? 'animate-price-flash' : ''}
          `}
        >
          {quote.current_price.toFixed(2)}
        </span>
        <span className="text-xl text-slate-400 font-medium">USD</span>
      </div>

      {/* Change Display */}
      <div className="flex items-center gap-3 mb-3">
        <span 
          className={`
            text-lg font-semibold
            ${direction === 'positive' ? 'text-green-400' : ''}
            ${direction === 'negative' ? 'text-red-400' : ''}
            ${direction === 'neutral' ? 'text-slate-400' : ''}
          `}
        >
          {formatChange(quote.change)}
        </span>
        <span 
          className={`
            text-lg font-semibold
            ${direction === 'positive' ? 'text-green-400' : ''}
            ${direction === 'negative' ? 'text-red-400' : ''}
            ${direction === 'neutral' ? 'text-slate-400' : ''}
          `}
        >
          {formatChangePercent(quote.change_percent)}
        </span>
        {/* Direction Arrow */}
        {direction !== 'neutral' && (
          <span 
            className={`
              text-lg
              ${direction === 'positive' ? 'text-green-400' : 'text-red-400'}
            `}
          >
            {direction === 'positive' ? '▲' : '▼'}
          </span>
        )}
      </div>

      {/* Timestamp */}
      <div className="text-sm text-slate-500">
        As of {timestamp}
      </div>

      {/* Optional: Day Range */}
      {quote.high && quote.low && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-slate-500">Day Low</span>
              <span className="ml-2 text-slate-300 font-medium">${quote.low.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-500">Day High</span>
              <span className="ml-2 text-slate-300 font-medium">${quote.high.toFixed(2)}</span>
            </div>
            {quote.volume && (
              <div>
                <span className="text-slate-500">Volume</span>
                <span className="ml-2 text-slate-300 font-medium">
                  {(quote.volume / 1000000).toFixed(2)}M
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimePriceDisplay;
