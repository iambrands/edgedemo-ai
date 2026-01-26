import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { tradesService } from '../services/trades';
import { watchlistService } from '../services/watchlist';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Position, Trade } from '../types/trades';
import { Stock } from '../types/watchlist';
import { Line, Bar } from 'react-chartjs-2';
import OnboardingModal from '../components/OnboardingModal';
import EarningsWidget from '../components/EarningsWidget';
import UnusualOptionsWidget from '../components/UnusualOptionsWidget';
import { useDevice } from '../hooks/useDevice';
import ResponsiveTable, { ColumnDef } from '../components/common/ResponsiveTable';
import ResponsiveModal from '../components/common/ResponsiveModal';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Cache for dashboard data to prevent unnecessary reloads
const DASHBOARD_CACHE_KEY = 'dashboard_data_cache';
const CACHE_DURATION = 30000; // 30 seconds - data is fresh for 30s

interface PlSummary {
  realized_pnl: number;
  total_trades_with_pnl: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
}

interface CachedData {
  positions: Position[];
  trades: Trade[];
  watchlist: Stock[];
  balance: number;
  plSummary?: PlSummary | null;
  timestamp: number;
}

const getCachedData = (): CachedData | null => {
  try {
    const cached = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      const age = Date.now() - data.timestamp;
      if (age < CACHE_DURATION) {
        return data;
      }
    }
  } catch (e) {
    // Ignore cache errors
  }
  return null;
};

const setCachedData = (data: CachedData) => {
  try {
    sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
      ...data,
      timestamp: Date.now()
    }));
  } catch (e) {
    // Ignore cache errors
  }
};

const Dashboard: React.FC = () => {
  const { isMobile, isTablet } = useDevice();
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [initialLoading, setInitialLoading] = useState(true); // True until first data load completes
  const [refreshing, setRefreshing] = useState(false); // Separate state for manual refresh
  const [accountBalance, setAccountBalance] = useState<number | null>(null); // null = not loaded yet
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [forcePriceUpdate, setForcePriceUpdate] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [marketMovers, setMarketMovers] = useState<any[]>([]);
  const [loadingMarketMovers, setLoadingMarketMovers] = useState(false);
  const [showOpportunities, setShowOpportunities] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [loadingAiSuggestions, setLoadingAiSuggestions] = useState(false);
  const [checkingExits, setCheckingExits] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [plSummary, setPlSummary] = useState<PlSummary | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check cache first - if data is fresh, use it immediately
    const cached = getCachedData();
    if (cached) {
      setPositions(cached.positions || []);
      setAllTrades(cached.trades || []);
      setRecentTrades((cached.trades || []).slice(0, 10));
      setWatchlist(cached.watchlist || []);
      setAccountBalance(cached.balance); // Don't default to 100000 - keep actual cached value
      setPlSummary(cached.plSummary ?? null);
      setLastLoadTime(cached.timestamp);
      setLastUpdated(new Date(cached.timestamp));
      setInitialLoading(false); // We have cached data, no need for loading spinner
      console.log('✅ Using cached dashboard data');
    }
    // If no cache, keep initialLoading=true and accountBalance=null
    // The loading spinner will show until data arrives
    
    // Load user preference for showing opportunities
    const savedPreference = localStorage.getItem('showOpportunities');
    if (savedPreference !== null) {
      setShowOpportunities(savedPreference === 'true');
    }
    
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('has_seen_onboarding');
    if (!hasSeenOnboarding) {
      // Show onboarding after a short delay to let dashboard load
      setTimeout(() => {
        setShowOnboarding(true);
      }, 1500);
    }
    
    // Load fresh data - if no cache, this is a blocking load; otherwise background refresh
    const shouldReload = !cached || (Date.now() - cached.timestamp) >= CACHE_DURATION;
    if (shouldReload) {
      // If no cache, this is the initial load - show loading state
      // If we have cache, this is a silent background refresh
      loadDashboardData(false, !!cached).finally(() => {
        setInitialLoading(false);
      });
    }
    
    // Load optional widgets in background (non-blocking, with longer delay)
    // Only load after initial data is loaded
    const widgetsEnabled = localStorage.getItem('dashboard_widgets_enabled') !== 'false';
    
    if (widgetsEnabled) {
      setTimeout(() => {
        // Only load widgets if they're enabled/visible
        if (showOpportunities) {
          loadOpportunities();
        }
        loadMarketMovers();
        loadAiSuggestions();
      }, cached ? 1000 : 2000); // Longer delay if loading fresh
    }
    
    // Auto-refresh data every 30 seconds (silent background refresh)
    const autoRefreshInterval = setInterval(() => {
      const cached = getCachedData();
      const shouldRefresh = !cached || (Date.now() - cached.timestamp) >= CACHE_DURATION;
      if (shouldRefresh) {
        loadDashboardData(false, true); // Silent background refresh
        setLastUpdated(new Date());
      }
    }, 30000); // 30 seconds
    
    return () => {
      clearInterval(autoRefreshInterval);
    };
  }, []); // Empty dependency array - only run once on mount

  const loadDashboardData = async (updatePrices: boolean = false, silent: boolean = false) => {
    // Only show loading state if it's a manual refresh (not silent background load)
    if (!silent) {
      setRefreshing(true);
    }
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Create timeout promise (60 seconds for normal, 90 seconds if updating prices)
      // Increased timeouts significantly to handle large datasets and slow API responses
      const timeoutMs = updatePrices ? 90000 : 60000;
      
      // Fetch all data with individual error handling
      // CRITICAL: Return null on error instead of empty array to preserve existing data
      const fetchWithTimeout = async <T,>(promise: Promise<T>, defaultValue: T, name: string, customTimeout?: number): Promise<T | null> => {
        const timeoutDuration = customTimeout || timeoutMs;
        const timeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Request timeout for ${name}`)), timeoutDuration);
        });
        
        try {
          return await Promise.race([promise, timeout]);
        } catch (error: any) {
          // Handle timeouts gracefully - don't throw uncaught errors
          const errorMessage = error?.message || 'Unknown error';
          if (errorMessage.includes('timeout')) {
            // Silently handle timeouts - don't log as errors if it's just a background operation
            // Only log if it's a manual refresh or critical operation
            if (updatePrices || name === 'positions') {
              console.warn(`⏱️ Timeout loading ${name} (${timeoutDuration}ms), preserving existing data`);
            }
            // Return null to indicate failure - caller will preserve existing data
            return null;
          } else {
            // For non-timeout errors, log but return null to preserve existing data
            console.warn(`⚠️ Error loading ${name}:`, errorMessage);
            return null;
          }
        }
      };

      // Fetch all data in parallel, but handle each failure independently
      // Only update prices if explicitly requested (manual refresh) or if forcePriceUpdate is true
      const positionsUrl = updatePrices || forcePriceUpdate 
        ? '/trades/positions?update_prices=true' 
        : '/trades/positions';
      
      // Use shorter timeouts for initial load (new accounts have no data, should be fast)
      // Only use longer timeouts when explicitly updating prices
      const initialLoadTimeout = updatePrices ? 90000 : 10000; // 10s for initial load, 90s for price updates
      
      const [positionsData, tradesData, watchlistData, userDataResponse, plSummaryData] = await Promise.all([
        fetchWithTimeout(
          api.get(positionsUrl).then(res => res.data),
          { positions: [], count: 0 },
          'positions',
          updatePrices ? 90000 : initialLoadTimeout
        ),
        fetchWithTimeout(
          tradesService.getHistory({ start_date: thirtyDaysAgo }),
          { trades: [], count: 0 },
          'trade history',
          initialLoadTimeout
        ),
        fetchWithTimeout(
          watchlistService.getWatchlist(),
          { watchlist: [], count: 0 },
          'watchlist',
          initialLoadTimeout
        ),
        fetchWithTimeout(
          api.get('/auth/user').catch(() => ({ data: { user: { paper_balance: 100000 } } } as any)),
          { data: { user: { paper_balance: 100000 } } } as any,
          'user data',
          initialLoadTimeout
        ),
        fetchWithTimeout(
          tradesService.getPlSummary(),
          { realized_pnl: 0, total_trades_with_pnl: 0, winning_trades: 0, losing_trades: 0, win_rate: 0 },
          'P/L summary',
          initialLoadTimeout
        ),
      ]);
      
      // CRITICAL: Only update state if we got valid data (not null)
      // This preserves existing data if refresh fails or times out
      // Get current cached data to preserve what we have
      const cached = getCachedData();
      
      if (positionsData !== null) {
        const positionsList = positionsData.positions || [];
        setPositions(positionsList);
      } else {
        // Refresh failed - keep existing positions, but show warning
        if (!silent) {
          toast.error('Position refresh timed out. Showing cached data.', { duration: 4000 });
        }
        console.warn('⚠️ Position refresh failed - preserving existing positions');
        // Don't update positions - keep what we have
      }
      
      if (tradesData !== null) {
        const tradesList = tradesData.trades || [];
        setAllTrades(tradesList); // Store all trades for performance trend
        setRecentTrades(tradesList.slice(0, 10)); // Show only 10 in table
      }
      // If trades failed, keep existing trades
      
      if (watchlistData !== null) {
        const watchlistList = watchlistData.watchlist || [];
        setWatchlist(watchlistList);
      }
      // If watchlist failed, keep existing watchlist
      
      if (userDataResponse !== null) {
        const userData = userDataResponse;
        const balance = userData.data?.user?.paper_balance || 100000;
        setAccountBalance(balance);
      }
      // If user data failed, keep existing balance

      if (plSummaryData !== null) {
        setPlSummary(plSummaryData);
      }

      // Update cache with whatever data we successfully fetched
      // Preserve existing data for any that failed
      setCachedData({
        positions: positionsData !== null ? (positionsData.positions || []) : (cached?.positions || []),
        trades: tradesData !== null ? (tradesData.trades || []) : (cached?.trades || []),
        watchlist: watchlistData !== null ? (watchlistData.watchlist || []) : (cached?.watchlist || []),
        balance: userDataResponse !== null ? (userDataResponse.data?.user?.paper_balance || 100000) : (cached?.balance || 100000),
        plSummary: plSummaryData !== null ? plSummaryData : (cached?.plSummary ?? null),
        timestamp: Date.now()
      });
      
      setLastLoadTime(Date.now());
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      // Only show error toast for manual refreshes, not silent background loads
      if (!silent) {
        toast.error('Failed to load some dashboard data. Please try again.', { duration: 5000 });
      }
      // Don't clear existing data on error - keep what we have
    } finally {
      if (!silent) {
        setRefreshing(false);
      }
    }
  };

  const loadOpportunities = async () => {
    setLoadingOpportunities(true);
    try {
      // Use shorter timeout for opportunities (optional feature)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 8000); // 8 second timeout
      });
      
      const response = await Promise.race([
        api.get('/opportunities/today'),
        timeoutPromise
      ]) as any;
      
      if (response && response.data && response.data.opportunities) {
        setOpportunities(response.data.opportunities);
      }
    } catch (error: any) {
      // Silently fail - opportunities are optional
      if (!error?.message?.includes('Timeout')) {
        console.error('Failed to load opportunities:', error);
      }
      setOpportunities([]);
    } finally {
      setLoadingOpportunities(false);
    }
  };

  const handleAnalyzeOpportunity = (symbol: string) => {
    // Navigate to Options Analyzer with symbol pre-filled
    // Use immediate navigation to prevent any blocking
    navigate('/analyzer', { state: { symbol }, replace: false });
  };

  const loadMarketMovers = async () => {
    setLoadingMarketMovers(true);
    try {
      // Use shorter timeout for market movers (optional feature)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 8000); // 8 second timeout
      });
      
      const response = await Promise.race([
        api.get('/opportunities/market-movers?limit=8'),
        timeoutPromise
      ]) as any;
      
      if (response && response.data && response.data.movers) {
        setMarketMovers(response.data.movers);
      }
    } catch (error: any) {
      if (!error?.message?.includes('Timeout')) {
        console.error('Failed to load market movers:', error);
      }
      setMarketMovers([]);
    } finally {
      setLoadingMarketMovers(false);
    }
  };

  const loadAiSuggestions = async () => {
    setLoadingAiSuggestions(true);
    try {
      // Use shorter timeout for AI suggestions (optional feature)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 8000); // 8 second timeout
      });
      
      const response = await Promise.race([
        api.get('/opportunities/ai-suggestions?limit=8'),
        timeoutPromise
      ]) as any;
      
      if (response && response.data && response.data.recommendations) {
        setAiSuggestions(response.data.recommendations);
      }
    } catch (error: any) {
      if (!error?.message?.includes('Timeout')) {
        console.error('Failed to load AI suggestions:', error);
      }
      setAiSuggestions([]);
    } finally {
      setLoadingAiSuggestions(false);
    }
  };

  const refreshData = async () => {
    // Clear cache when manually refreshing
    sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
    // Force update prices when manually refreshing
    setForcePriceUpdate(true);
    try {
      await loadDashboardData(true, false); // update_prices=true, not silent
      toast.success('Positions updated successfully', { duration: 3000 });
    } catch (error) {
      toast.error('Failed to update positions. Please try again.', { duration: 5000 });
    } finally {
      setForcePriceUpdate(false);
    }
  };

  const checkPositionExits = async () => {
    setCheckingExits(true);
    try {
      const result = await tradesService.checkPositionExits();
      const { exits_triggered, positions_checked, errors, monitored } = result.results;
      
      if (exits_triggered > 0) {
        toast.success(`${exits_triggered} position${exits_triggered > 1 ? 's' : ''} closed based on exit conditions`, { duration: 5000 });
        // Reload dashboard data to show updated positions
        await loadDashboardData();
      } else {
        const message = monitored > 0 
          ? `Checked ${monitored} position${monitored > 1 ? 's' : ''}. No positions met exit conditions.`
          : 'No open positions to check.';
        toast(message, { 
          duration: 4000,
          icon: 'ℹ️'
        });
      }
      
      if (errors && errors.length > 0) {
        console.error('Errors checking positions:', errors);
        const errorMsg = errors.length === 1 
          ? errors[0] 
          : `${errors.length} errors occurred. Check console for details.`;
        toast.error(errorMsg, { duration: 6000 });
      }
    } catch (error: any) {
      console.error('Failed to check position exits:', error);
      const errorMessage = error.response?.data?.error 
        || error.message 
        || error.toString() 
        || 'Failed to check position exits. Please try again.';
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setCheckingExits(false);
    }
  };

  const totalUnrealizedPnl = positions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0);

  // Realized P/L and win rate: use all-time pl-summary (closed positions only). Never use 30-day trades.
  const tradesWithPnl = allTrades.filter(t => t.realized_pnl != null);
  const totalRealizedPnl = plSummary != null ? plSummary.realized_pnl : tradesWithPnl.reduce((sum, t) => sum + (t.realized_pnl ?? 0), 0);
  const winningTrades = plSummary != null ? plSummary.winning_trades : tradesWithPnl.filter(t => (t.realized_pnl ?? 0) > 0).length;
  const losingTrades = plSummary != null ? plSummary.losing_trades : tradesWithPnl.filter(t => (t.realized_pnl ?? 0) < 0).length;
  const winRate = plSummary != null ? plSummary.win_rate : (tradesWithPnl.length > 0 ? (winningTrades / tradesWithPnl.length) * 100 : 0);
  const totalClosedTrades = plSummary?.total_trades_with_pnl ?? tradesWithPnl.length;

  const calculateDTE = (expirationDate: string | undefined): number | null => {
    if (!expirationDate) return null;
    const exp = new Date(expirationDate);
    const today = new Date();
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedPositions = [...positions].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: any, bVal: any;
    switch (sortColumn) {
      case 'symbol':
        aVal = a.symbol;
        bVal = b.symbol;
        break;
      case 'quantity':
        aVal = a.quantity;
        bVal = b.quantity;
        break;
      case 'entry_price':
        aVal = a.entry_price;
        bVal = b.entry_price;
        break;
      case 'current_price':
        aVal = a.current_price || 0;
        bVal = b.current_price || 0;
        break;
      case 'expiration':
        aVal = a.expiration_date ? new Date(a.expiration_date).getTime() : 0;
        bVal = b.expiration_date ? new Date(b.expiration_date).getTime() : 0;
        break;
      case 'pnl':
        aVal = a.unrealized_pnl || 0;
        bVal = b.unrealized_pnl || 0;
        break;
      case 'pnl_percent':
        aVal = a.unrealized_pnl_percent || 0;
        bVal = b.unrealized_pnl_percent || 0;
        break;
      default:
        return 0;
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortArrow = ({ column }: { column: string }) => {
    if (sortColumn !== column) {
      return <span className="text-gray-400 ml-1">↕</span>;
    }
    return <span className="text-primary ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  // Calculate performance trend - group trades by date and calculate daily P/L
  const calculatePerformanceTrend = () => {
    // Get all trades with realized P/L (closed positions) - use allTrades, not just recentTrades
    const closedTrades = allTrades
      .filter(t => t.realized_pnl !== null && t.realized_pnl !== undefined)
      .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
    
    if (closedTrades.length === 0) {
      // If no closed trades, show empty state
      return {
        labels: ['No data'],
        datasets: [{
          label: 'Cumulative P/L',
          data: [0],
          borderColor: 'rgb(79, 70, 229)',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
        }],
      };
    }
    
    // Group trades by date (using ISO date string for proper sorting)
    const tradesByDate: { [key: string]: { pnl: number; displayDate: string } } = {};
    closedTrades.forEach(trade => {
      const tradeDate = new Date(trade.trade_date);
      const dateKey = tradeDate.toISOString().split('T')[0]; // YYYY-MM-DD for sorting
      const displayDate = tradeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!tradesByDate[dateKey]) {
        tradesByDate[dateKey] = { pnl: 0, displayDate };
      }
      tradesByDate[dateKey].pnl += (trade.realized_pnl || 0);
    });
    
    // Sort dates chronologically (by dateKey)
    const sortedDateKeys = Object.keys(tradesByDate).sort();
    
    // Calculate cumulative P/L
    let cumulativePnl = 0;
    const cumulativeData = sortedDateKeys.map(dateKey => {
      cumulativePnl += tradesByDate[dateKey].pnl;
      return cumulativePnl;
    });
    
    // Use display dates for labels
    const labels = sortedDateKeys.map(dateKey => tradesByDate[dateKey].displayDate);
    
    return {
      labels: labels,
      datasets: [
        {
          label: 'Cumulative P/L ($)',
          data: cumulativeData,
          borderColor: 'rgb(79, 70, 229)',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    };
  };

  const performanceData = calculatePerformanceTrend();
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y;
            return `$${value.toFixed(2)}`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toFixed(0);
          }
        },
        title: {
          display: true,
          text: 'Cumulative P/L ($)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    },
  };

  const positionsBySymbol = positions.reduce((acc: { [key: string]: number }, pos) => {
    acc[pos.symbol] = (acc[pos.symbol] || 0) + 1;
    return acc;
  }, {});

  const positionsChartData = {
    labels: Object.keys(positionsBySymbol),
    datasets: [
      {
        label: 'Positions',
        data: Object.values(positionsBySymbol),
        backgroundColor: 'rgba(79, 70, 229, 0.5)',
      },
    ],
  };

  // Show loading screen while waiting for initial data (no cached data available)
  if (initialLoading && accountBalance === null) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          {/* Animated spinner */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-700">Loading your dashboard...</h2>
          <p className="text-gray-500 text-sm">Fetching positions, trades, and account data</p>
          {/* Subtle progress indicator */}
          <div className="w-48 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    );
  }

  const handleOnboardingComplete = () => {
    localStorage.setItem('has_seen_onboarding', 'true');
    setShowOnboarding(false);
    toast.success('Welcome to OptionsEdge! 🎉');
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('has_seen_onboarding', 'true');
    setShowOnboarding(false);
  };

  const formatTimeAgo = (timestamp: Date): string => {
    const seconds = Math.floor((new Date().getTime() - timestamp.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const handleManualRefresh = async () => {
    toast.loading('Refreshing dashboard data...', { id: 'refresh' });
    await loadDashboardData(true, false); // Update prices on manual refresh, show loading
    setLastUpdated(new Date());
    toast.success('Dashboard refreshed!', { id: 'refresh' });
  };

  const handleRefreshPrices = async () => {
    try {
      setRefreshingPrices(true);
      toast.loading('Fetching fresh prices from Tradier...', { id: 'refresh-prices' });
      
      // Call backend to refresh all positions from Tradier
      // Axios automatically throws on non-2xx status, so no need to check response.ok
      const response = await api.post('/trades/positions/refresh-all');
      
      const result = response.data;
      
      // Reload positions to get updated prices
      await loadDashboardData(false, false);
      setLastUpdated(new Date());
      
      // Show success message
      if (result.updated > 0) {
        toast.success(
          `Updated prices for ${result.updated} position${result.updated > 1 ? 's' : ''}`,
          { id: 'refresh-prices', duration: 3000 }
        );
      } else {
        toast.success('No positions to update', { id: 'refresh-prices', duration: 2000 });
      }
      
      // Show errors if any
      if (result.errors && result.errors.length > 0) {
        console.warn('Some positions failed to update:', result.errors);
        toast.error(
          `${result.errors.length} position${result.errors.length > 1 ? 's' : ''} failed to update`,
          { id: 'refresh-prices-errors', duration: 4000 }
        );
      }
      
    } catch (error: any) {
      console.error('Error refreshing prices:', error);
      toast.error(
        error.response?.data?.error || 'Failed to refresh prices. Please try again.',
        { id: 'refresh-prices', duration: 5000 }
      );
    } finally {
      setRefreshingPrices(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      {/* Header with auto-refresh indicator */}
      <div className={`${isMobile ? 'space-y-3' : 'flex items-center justify-between'} mb-4 md:mb-6`}>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-secondary`}>Dashboard</h1>
        
        <div className={`flex items-center ${isMobile ? 'justify-between' : 'gap-4'}`}>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Auto-updating</span>
            </div>
            {lastUpdated && (
              <span className="text-gray-400">
                • Updated {formatTimeAgo(lastUpdated)}
              </span>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Subtle manual refresh button (reload from DB) */}
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh dashboard data"
            >
              {refreshing ? (
                <span className="animate-spin text-lg">⏳</span>
              ) : (
                <span className="text-lg">🔄</span>
              )}
            </button>
            
            {/* Refresh Prices button (fetch from Tradier) */}
            <button
              onClick={handleRefreshPrices}
              disabled={refreshingPrices}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                refreshingPrices
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              title="Fetch fresh prices from Tradier API"
            >
              {refreshingPrices ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span className="text-sm hidden sm:inline">Updating...</span>
                </>
              ) : (
                <>
                  <span className="text-sm">💰</span>
                  <span className="text-sm hidden sm:inline">Refresh Prices</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Links to Opportunities Page */}
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} gap-4 mb-4 md:mb-6`}>
        <Link
          to="/opportunities?tab=signals"
          className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg shadow-md p-6 border border-indigo-200 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            <div>
              <h3 className="text-lg font-bold text-secondary">Trading Signals</h3>
              <p className="text-sm text-gray-600">High-confidence opportunities</p>
            </div>
          </div>
        </Link>
        <Link
          to="/opportunities?tab=movers"
          className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">📈</span>
            <div>
              <h3 className="text-lg font-bold text-secondary">Market Movers</h3>
              <p className="text-sm text-gray-600">High volume & volatility stocks</p>
            </div>
          </div>
        </Link>
        <Link
          to="/opportunities?tab=for-you"
          className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-md p-6 border border-purple-200 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🤖</span>
            <div>
              <h3 className="text-lg font-bold text-secondary">For You</h3>
              <p className="text-sm text-gray-600">Personalized recommendations</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Account Balance Card */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-lg shadow-lg p-4 md:p-6">
        <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'}`}>
          <div>
            <p className="text-sm opacity-90 mb-1">Paper Trading Balance</p>
            {accountBalance !== null ? (
              <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold`}>
                ${accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
            ) : (
              <div className={`${isMobile ? 'h-8' : 'h-12'} flex items-center`}>
                <div className="animate-pulse bg-white/30 rounded h-8 w-40"></div>
              </div>
            )}
            <p className="text-sm opacity-75 mt-2">Virtual funds for testing strategies</p>
          </div>
          {!isMobile && <div className="text-6xl opacity-20">💰</div>}
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-4'} gap-4 md:gap-6`}>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-500 mb-2`}>Total Positions</h3>
          <p className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-secondary`}>{positions.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-500 mb-2`}>Unrealized P/L</h3>
          <p className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold ${totalUnrealizedPnl >= 0 ? 'text-success' : 'text-error'}`}>
            ${totalUnrealizedPnl.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-500 mb-2`}>Realized P/L (30d)</h3>
          <p className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold ${totalRealizedPnl >= 0 ? 'text-success' : 'text-error'}`}>
            ${totalRealizedPnl.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h3 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-500 mb-2`}>Win Rate</h3>
          <p className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-primary`}>{winRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Earnings & Unusual Activity Widgets */}
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4 md:gap-6`}>
        <EarningsWidget />
        <UnusualOptionsWidget />
      </div>

      {/* Charts */}
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4 md:gap-6`}>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-secondary mb-4`}>Performance Trend</h2>
          {performanceData.labels.length > 0 && performanceData.labels[0] !== 'No data' ? (
            <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
              <Line data={performanceData} options={chartOptions} />
            </div>
          ) : (
            <div className={`${isMobile ? 'h-48' : 'h-64'} flex items-center justify-center text-gray-500`}>
              <div className="text-center">
                <p className={`${isMobile ? 'text-base' : 'text-lg'} mb-2`}>No performance data yet</p>
                <p className="text-sm">Close some positions to see your performance trend</p>
              </div>
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-secondary mb-4`}>Positions by Symbol</h2>
          {Object.keys(positionsBySymbol).length > 0 ? (
            <div className={`${isMobile ? 'h-48' : 'h-64'}`}>
              <Bar data={positionsChartData} options={{ 
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    display: false,
                  }
                }
              }} />
            </div>
          ) : (
            <div className={`${isMobile ? 'h-48' : 'h-64'} flex items-center justify-center text-gray-500`}>
              <p>No positions to display</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Positions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className={`${isMobile ? 'text-base' : 'text-lg md:text-xl'} font-bold text-secondary`}>Active Positions</h2>
        </div>
        <div className={`overflow-x-auto ${isMobile ? '-mx-4 px-4' : 'md:mx-0'}`}>
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('symbol')}
                >
                  Symbol <SortArrow column="symbol" />
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Type</th>
                <th 
                  className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 hidden md:table-cell"
                  onClick={() => handleSort('quantity')}
                >
                  Qty <SortArrow column="quantity" />
                </th>
                <th 
                  className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 hidden lg:table-cell"
                  onClick={() => handleSort('entry_price')}
                >
                  Entry <SortArrow column="entry_price" />
                </th>
                <th 
                  className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('current_price')}
                >
                  Current <SortArrow column="current_price" />
                </th>
                <th 
                  className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 hidden lg:table-cell"
                  onClick={() => handleSort('expiration')}
                >
                  Exp <SortArrow column="expiration" />
                </th>
                <th 
                  className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('pnl')}
                >
                  P/L <SortArrow column="pnl" />
                </th>
                <th 
                  className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 hidden md:table-cell"
                  onClick={() => handleSort('pnl_percent')}
                >
                  P/L % <SortArrow column="pnl_percent" />
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPositions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    No active positions. <a href="/trade" className="text-primary hover:underline">Start trading</a> or <a href="/automations" className="text-primary hover:underline">create an automation</a>.
                  </td>
                </tr>
              ) : (
                sortedPositions.map((position) => {
                  const dte = calculateDTE(position.expiration_date);
                  return (
                    <tr key={position.id} className="hover:bg-gray-50">
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {position.symbol}
                        {position.is_spread ? (
                          <span className="text-xs text-gray-500 block">
                            Spread: ${position.long_strike}/${position.short_strike}
                          </span>
                        ) : position.strike_price ? (
                          <span className="text-xs text-gray-500 block">${position.strike_price}</span>
                        ) : null}
                        <span className="text-xs text-gray-500 sm:hidden block">
                          {position.is_spread ? 'SPREAD' : (position.contract_type?.toUpperCase() || 'STOCK')}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                        {position.is_spread ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            SPREAD
                          </span>
                        ) : (
                          position.contract_type?.toUpperCase() || 'STOCK'
                        )}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                        {position.quantity}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                        ${position.entry_price.toFixed(2)}
                        {position.contract_type && (
                          <span className="text-xs text-gray-500 ml-1">(premium)</span>
                        )}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {position.current_price !== null && position.current_price !== undefined
                          ? `$${position.current_price.toFixed(2)}`
                          : <span className="text-gray-400">Not loaded</span>
                        }
                        {position.contract_type && position.current_price !== null && position.current_price !== undefined && (
                          <span className="text-xs text-gray-500 ml-1 hidden lg:inline">(premium)</span>
                        )}
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                        {position.expiration_date ? (
                          <div>
                            <div>{formatDate(position.expiration_date)}</div>
                            {dte !== null && (
                              <div className={`text-xs ${dte <= 7 ? 'text-error font-semibold' : dte <= 21 ? 'text-warning' : 'text-gray-500'}`}>
                                {dte} {dte === 1 ? 'day' : 'days'} left
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className={`px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        (position.unrealized_pnl || 0) >= 0 ? 'text-success' : 'text-error'
                      }`}>
                        ${(position.unrealized_pnl || 0).toFixed(2)}
                        <span className="text-xs md:hidden block">({(position.unrealized_pnl_percent || 0).toFixed(2)}%)</span>
                      </td>
                      <td className={`px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium hidden md:table-cell ${
                        (position.unrealized_pnl_percent || 0) >= 0 ? 'text-success' : 'text-error'
                      }`}>
                        {(position.unrealized_pnl_percent || 0).toFixed(2)}%
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm space-x-1 md:space-x-2">
                        <button
                          onClick={() => setSelectedPosition(position)}
                          className="text-primary hover:text-indigo-700 font-medium"
                        >
                          Details
                        </button>
                        {position.is_spread ? (
                          <button
                            onClick={async () => {
                              if (window.confirm(`Close spread: ${position.quantity} ${position.symbol} ${position.spread_type?.replace('_', ' ').toUpperCase()}?`)) {
                                try {
                                  const token = localStorage.getItem('access_token');
                                  if (!token) {
                                    toast.error('You are not logged in. Please log in again.');
                                    window.location.href = '/login';
                                    return;
                                  }
                                  
                                  await api.post(`/spreads/${position.spread_id}/close`);
                                  toast.success('Spread closed');
                                  loadDashboardData();
                                } catch (error: any) {
                                  console.error('Close spread error:', error);
                                  toast.error(error.response?.data?.error || 'Failed to close spread');
                                }
                              }
                            }}
                            className="text-error hover:text-red-700 font-medium"
                          >
                            Close
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              if (window.confirm(`Close position: ${position.quantity} ${position.symbol} ${position.contract_type?.toUpperCase()}?`)) {
                                try {
                                  // Check if user is logged in before making request
                                  const token = localStorage.getItem('access_token');
                                  if (!token) {
                                    toast.error('You are not logged in. Please log in again.');
                                    window.location.href = '/login';
                                    return;
                                  }
                                  
                                  const positionId = typeof position.id === 'string' ? position.id.replace('spread_', '') : position.id;
                                  await api.post(`/trades/positions/${positionId}/close`);
                                  toast.success('Position closed');
                                  loadDashboardData();
                                } catch (error: any) {
                                  console.error('Close position error:', error);
                                  console.error('Error response:', error.response?.data);
                                  console.error('Error status:', error.response?.status);
                                  if (error.response?.status === 401) {
                                    // Token refresh should have been attempted automatically
                                    // If we still get 401, the refresh failed or the new token is invalid
                                    const errorMsg = error.response?.data?.error || 'Authentication failed';
                                    console.error('401 error details:', {
                                      error: errorMsg,
                                      hasToken: !!localStorage.getItem('access_token'),
                                      tokenLength: localStorage.getItem('access_token')?.length
                                    });
                                    if (errorMsg.includes('refresh') || errorMsg.includes('expired') || errorMsg.includes('Missing Authorization')) {
                                      toast.error('Session expired. Please log in again.');
                                      setTimeout(() => {
                                        localStorage.removeItem('access_token');
                                        localStorage.removeItem('refresh_token');
                                        window.location.href = '/login';
                                      }, 2000);
                                    } else {
                                      toast.error(`Authentication error: ${errorMsg}. Please try logging in again.`);
                                    }
                                  } else {
                                    toast.error(error.response?.data?.error || 'Failed to close position');
                                  }
                                }
                              }
                            }}
                          className="text-error hover:text-red-700 font-medium"
                        >
                          Close
                        </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className={`${isMobile ? 'text-base' : 'text-lg md:text-xl'} font-bold text-secondary`}>Recent Trades</h2>
            <p className="text-xs text-gray-500 mt-1">
              {allTrades.length} trades in last 30 days • {totalClosedTrades} closed all-time ({winningTrades}W / {losingTrades}L)
            </p>
          </div>
          <a href="/history" className="text-sm text-primary hover:text-indigo-700 font-medium">
            View All →
          </a>
        </div>
        <div className={`overflow-x-auto ${isMobile ? '-mx-4 px-4' : 'md:mx-0'}`}>
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P/L</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No recent trades
                  </td>
                </tr>
              ) : (
                recentTrades.map((trade) => {
                  const tradeDTE = calculateDTE(trade.expiration_date);
                  return (
                    <tr key={trade.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          {new Date(trade.trade_date).toLocaleDateString()}
                          {trade.automation_id && (
                            <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded font-medium" title="Automated trade">
                              🤖
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(trade.trade_date).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {trade.symbol}
                        {trade.strike_price && (
                          <span className="text-xs text-gray-500 block">${trade.strike_price}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          trade.action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {trade.action.toUpperCase()}
                        </span>
                        {trade.contract_type && (
                          <div className="text-xs text-gray-500 mt-1">{trade.contract_type.toUpperCase()}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${trade.price.toFixed(2)}
                        {trade.contract_type && (
                          <span className="text-xs text-gray-500 ml-1">(premium)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.expiration_date ? (
                          <div>
                            <div>{formatDate(trade.expiration_date)}</div>
                            {tradeDTE !== null && (
                              <div className="text-xs text-gray-500">
                                {tradeDTE} {tradeDTE === 1 ? 'day' : 'days'} left
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        (trade.realized_pnl || 0) >= 0 ? 'text-success' : 'text-error'
                      }`}>
                        {trade.realized_pnl ? `$${trade.realized_pnl.toFixed(2)}` : '-'}
                        {trade.realized_pnl_percent && (
                          <div className={`text-xs ${(trade.realized_pnl || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                            ({trade.realized_pnl_percent.toFixed(2)}%)
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedTrade(trade)}
                          className="text-primary hover:text-indigo-700 font-medium"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {/* Position Details Modal */}
      {selectedPosition && (
        <ResponsiveModal
          isOpen={!!selectedPosition}
          onClose={() => setSelectedPosition(null)}
          title={`Position Details: ${selectedPosition.symbol} ${selectedPosition.is_spread ? selectedPosition.spread_type?.replace('_', ' ').toUpperCase() || 'SPREAD' : selectedPosition.contract_type?.toUpperCase() || 'STOCK'}`}
        >
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 md:gap-6`}>
              {/* Basic Info - Different for spreads vs single options */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-2">Basic Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Symbol:</span>
                    <span className="font-medium">{selectedPosition.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">
                      {selectedPosition.is_spread ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {selectedPosition.spread_type?.replace('_', ' ').toUpperCase() || 'SPREAD'}
                        </span>
                      ) : (
                        selectedPosition.contract_type?.toUpperCase() || 'STOCK'
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium">{selectedPosition.quantity} {selectedPosition.is_spread ? 'spreads' : 'contracts'}</span>
                  </div>
                  
                  {/* Spread-specific strike information */}
                  {selectedPosition.is_spread ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Long Strike:</span>
                        <span className="font-medium text-success">${selectedPosition.long_strike?.toFixed(2) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Short Strike:</span>
                        <span className="font-medium text-error">${selectedPosition.short_strike?.toFixed(2) || 'N/A'}</span>
                      </div>
                      {selectedPosition.strike_width && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Strike Width:</span>
                          <span className="font-medium">${selectedPosition.strike_width.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  ) : selectedPosition.strike_price ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Strike Price:</span>
                      <span className="font-medium">${selectedPosition.strike_price.toFixed(2)}</span>
                    </div>
                  ) : null}
                  
                  {selectedPosition.expiration_date && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expiration:</span>
                        <span className="font-medium">{formatDate(selectedPosition.expiration_date)}</span>
                      </div>
                      {calculateDTE(selectedPosition.expiration_date) !== null && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Days to Expiration:</span>
                          <span className={`font-medium ${
                            (calculateDTE(selectedPosition.expiration_date) || 0) <= 7 ? 'text-error' : 
                            (calculateDTE(selectedPosition.expiration_date) || 0) <= 21 ? 'text-warning' : 
                            'text-success'
                          }`}>
                            {calculateDTE(selectedPosition.expiration_date)} days
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Entry Date:</span>
                    <span className="font-medium">{formatDate(selectedPosition.entry_date)}</span>
                  </div>
                  {!selectedPosition.is_spread && selectedPosition.option_symbol && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Option Symbol:</span>
                      <span className="font-medium text-xs">{selectedPosition.option_symbol}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing & P/L - Different for spreads vs single options */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-2">Pricing & P/L</h3>
                <div className="space-y-2 text-sm">
                  {selectedPosition.is_spread ? (
                    /* Spread-specific pricing */
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Net Debit:</span>
                        <span className="font-medium">${(selectedPosition.net_debit || selectedPosition.entry_price * selectedPosition.quantity * 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Value:</span>
                        <span className="font-medium">
                          {selectedPosition.current_price !== null && selectedPosition.current_price !== undefined
                            ? `$${(selectedPosition.current_price * selectedPosition.quantity * 100).toFixed(2)}`
                            : <span className="text-gray-400">Not loaded</span>
                          }
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-600">Max Profit:</span>
                        <span className="font-medium text-success">${selectedPosition.max_profit?.toFixed(2) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max Loss:</span>
                        <span className="font-medium text-error">${selectedPosition.max_loss?.toFixed(2) || 'N/A'}</span>
                      </div>
                      {selectedPosition.breakeven && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Breakeven:</span>
                          <span className="font-medium">${selectedPosition.breakeven.toFixed(2)}</span>
                        </div>
                      )}
                      <div className={`flex justify-between pt-2 border-t ${
                        (selectedPosition.unrealized_pnl || 0) >= 0 ? 'text-success' : 'text-error'
                      }`}>
                        <span className="font-semibold">Unrealized P/L:</span>
                        <span className="font-bold text-lg">
                          ${(selectedPosition.unrealized_pnl || 0).toFixed(2)} 
                          ({(selectedPosition.unrealized_pnl_percent || 0).toFixed(2)}%)
                        </span>
                      </div>
                    </>
                  ) : (
                    /* Single option pricing */
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Entry Price:</span>
                        <span className="font-medium">${selectedPosition.entry_price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Price:</span>
                        <span className="font-medium">
                          {selectedPosition.current_price !== null && selectedPosition.current_price !== undefined
                            ? `$${selectedPosition.current_price.toFixed(2)}`
                            : <span className="text-gray-400">Not loaded</span>
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Cost:</span>
                        <span className="font-medium">
                          ${(() => {
                            const isOption = selectedPosition.contract_type && 
                              ['call', 'put', 'option'].includes(selectedPosition.contract_type.toLowerCase());
                            const multiplier = isOption ? 100 : 1;
                            return (selectedPosition.entry_price * selectedPosition.quantity * multiplier).toFixed(2);
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Value:</span>
                        <span className="font-medium">
                          {selectedPosition.current_price !== null && selectedPosition.current_price !== undefined
                            ? `$${(() => {
                                const isOption = selectedPosition.contract_type && 
                                  ['call', 'put', 'option'].includes(selectedPosition.contract_type.toLowerCase());
                                const multiplier = isOption ? 100 : 1;
                                return (selectedPosition.current_price * selectedPosition.quantity * multiplier).toFixed(2);
                              })()}`
                            : <span className="text-gray-400">$0.00</span>
                          }
                        </span>
                      </div>
                      <div className={`flex justify-between pt-2 border-t ${
                        (selectedPosition.unrealized_pnl || 0) >= 0 ? 'text-success' : 'text-error'
                      }`}>
                        <span className="font-semibold">Unrealized P/L:</span>
                        <span className="font-bold text-lg">
                          ${(selectedPosition.unrealized_pnl || 0).toFixed(2)} 
                          ({(selectedPosition.unrealized_pnl_percent || 0).toFixed(2)}%)
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* AI Analysis */}
              <div className={`space-y-4 ${isMobile ? '' : 'col-span-2'}`}>
                <h3 className="font-semibold text-gray-700 border-b pb-2">AI Analysis</h3>
                <div className="bg-blue-50 rounded-lg p-4 text-sm">
                  {(() => {
                    const isSpread = selectedPosition.is_spread;
                    const isOption = selectedPosition.contract_type && 
                      ['call', 'put', 'option'].includes(selectedPosition.contract_type.toLowerCase());
                    const pnlPercent = selectedPosition.unrealized_pnl_percent || 0;
                    const dte = calculateDTE(selectedPosition.expiration_date);
                    const currentDelta = selectedPosition.current_delta || selectedPosition.entry_delta;
                    const currentIV = selectedPosition.current_iv || selectedPosition.entry_iv;
                    
                    let analysis = [];
                    
                    // P/L Analysis
                    if (pnlPercent > 25) {
                      analysis.push(`📈 Strong profit: Position is up ${pnlPercent.toFixed(1)}%. Consider taking profits if you've reached your target.`);
                    } else if (pnlPercent > 10) {
                      analysis.push(`📊 Moderate profit: Position is up ${pnlPercent.toFixed(1)}%. Monitor for profit target.`);
                    } else if (pnlPercent < -10) {
                      analysis.push(`⚠️ Significant loss: Position is down ${Math.abs(pnlPercent).toFixed(1)}%. Review stop-loss settings and consider exiting if risk management rules apply.`);
                    } else if (pnlPercent < -5) {
                      analysis.push(`📉 Moderate loss: Position is down ${Math.abs(pnlPercent).toFixed(1)}%. Monitor closely and consider stop-loss.`);
                    } else {
                      analysis.push(`➡️ Flat position: Currently ${pnlPercent >= 0 ? 'up' : 'down'} ${Math.abs(pnlPercent).toFixed(1)}%. Continue monitoring.`);
                    }
                    
                    // Spread-specific analysis
                    if (isSpread) {
                      const maxProfit = selectedPosition.max_profit || 0;
                      const maxLoss = selectedPosition.max_loss || 0;
                      const currentPnl = selectedPosition.unrealized_pnl || 0;
                      
                      // Check profit proximity
                      if (maxProfit > 0 && currentPnl > 0) {
                        const profitPercent = (currentPnl / maxProfit) * 100;
                        if (profitPercent >= 75) {
                          analysis.push(`🎯 Near max profit: You've captured ${profitPercent.toFixed(0)}% of max profit ($${maxProfit.toFixed(2)}). Consider closing to lock in gains.`);
                        } else if (profitPercent >= 50) {
                          analysis.push(`📊 Good progress: You've captured ${profitPercent.toFixed(0)}% of max profit. Consider taking profits or letting it run.`);
                        }
                      }
                      
                      // Check loss proximity
                      if (maxLoss > 0 && currentPnl < 0) {
                        const lossPercent = (Math.abs(currentPnl) / maxLoss) * 100;
                        if (lossPercent >= 75) {
                          analysis.push(`⚠️ Near max loss: Loss is ${lossPercent.toFixed(0)}% of max loss ($${maxLoss.toFixed(2)}). Consider closing to limit further losses.`);
                        }
                      }
                      
                      // Breakeven analysis
                      if (selectedPosition.breakeven) {
                        analysis.push(`📍 Breakeven: Stock needs to reach $${selectedPosition.breakeven.toFixed(2)} at expiration for this spread to break even.`);
                      }
                    }
                    
                    // DTE Analysis (for options and spreads)
                    if ((isOption || isSpread) && dte !== null) {
                      if (dte <= 7) {
                        analysis.push(`⏰ Time decay risk: Only ${dte} days until expiration. ${isSpread ? 'Spread value will converge toward intrinsic value.' : 'Time decay (theta) will accelerate.'} Consider closing if near target.`);
                      } else if (dte <= 21) {
                        analysis.push(`⏱️ Approaching expiration: ${dte} days remaining. Time decay will increase.`);
                      }
                    }
                    
                    // Delta Analysis (for single options only)
                    if (!isSpread && isOption && currentDelta !== null && currentDelta !== undefined) {
                      const deltaPercent = Math.abs(currentDelta * 100);
                      if (deltaPercent > 70) {
                        analysis.push(`🎯 High delta (${(currentDelta * 100).toFixed(1)}%): Position behaves more like stock. Large price moves will have significant impact.`);
                      } else if (deltaPercent < 30) {
                        analysis.push(`🎲 Low delta (${(currentDelta * 100).toFixed(1)}%): Position is out-of-the-money. Lower probability of profit but higher leverage if it moves favorably.`);
                      }
                    }
                    
                    // IV Analysis (for single options only)
                    if (!isSpread && isOption && currentIV !== null && currentIV !== undefined) {
                      const ivPercent = currentIV * 100;
                      if (ivPercent > 50) {
                        analysis.push(`📊 High implied volatility (${ivPercent.toFixed(1)}%): Premiums are elevated. Good for selling, challenging for buying.`);
                      } else if (ivPercent < 20) {
                        analysis.push(`📉 Low implied volatility (${ivPercent.toFixed(1)}%): Premiums are relatively cheap. Good for buying, less attractive for selling.`);
                      }
                    }
                    
                    // Overall recommendation
                    if (analysis.length === 0) {
                      analysis.push(`📋 Position appears stable. Continue monitoring price action${isSpread ? '' : ' and Greeks'}.`);
                    }
                    
                    return analysis.map((item, idx) => (
                      <div key={idx} className="mb-2 text-gray-700">
                        {item}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Entry Greeks - Only for single options, not spreads */}
              {!selectedPosition.is_spread && selectedPosition.entry_delta !== null && selectedPosition.entry_delta !== undefined && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700 border-b pb-2">Greeks at Entry</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delta:</span>
                      <span className="font-medium">{selectedPosition.entry_delta?.toFixed(4) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gamma:</span>
                      <span className="font-medium">{selectedPosition.entry_gamma?.toFixed(4) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Theta:</span>
                      <span className="font-medium">{selectedPosition.entry_theta?.toFixed(4) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vega:</span>
                      <span className="font-medium">{selectedPosition.entry_vega?.toFixed(4) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Implied Volatility:</span>
                      <span className="font-medium">
                        {selectedPosition.entry_iv ? `${(selectedPosition.entry_iv * 100).toFixed(2)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Greeks - Only for single options, not spreads */}
              {!selectedPosition.is_spread && selectedPosition.current_delta !== null && selectedPosition.current_delta !== undefined && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700 border-b pb-2">Current Greeks</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delta:</span>
                      <span className="font-medium">{selectedPosition.current_delta?.toFixed(4) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gamma:</span>
                      <span className="font-medium">{selectedPosition.current_gamma?.toFixed(4) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Theta:</span>
                      <span className="font-medium">{selectedPosition.current_theta?.toFixed(4) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vega:</span>
                      <span className="font-medium">{selectedPosition.current_vega?.toFixed(4) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Implied Volatility:</span>
                      <span className="font-medium">
                        {selectedPosition.current_iv ? `${(selectedPosition.current_iv * 100).toFixed(2)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSelectedPosition(null)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
              {selectedPosition.status === 'open' && (
                <>
                  <button
                    onClick={async () => {
                      try {
                        toast.loading('Refreshing position...', { id: 'refresh-position' });
                        
                        // Handle spreads differently from single options
                        if (selectedPosition.is_spread && selectedPosition.spread_id) {
                          // Refresh spread
                          const result = await api.post(`/spreads/${selectedPosition.spread_id}/refresh`);
                          toast.success('Spread refreshed successfully', { id: 'refresh-position' });
                          
                          // Update the selected position with new spread data
                          if (result.data.spread) {
                            setSelectedPosition({
                              ...selectedPosition,
                              current_price: result.data.spread.current_value / (selectedPosition.quantity * 100),
                              unrealized_pnl: result.data.spread.unrealized_pnl,
                              unrealized_pnl_percent: result.data.spread.unrealized_pnl_percent
                            });
                          }
                        } else {
                          // Handle single option position
                          let positionId: number;
                          if (typeof selectedPosition.id === 'string') {
                            // If it's a string like "spread_X", extract the number
                            const match = selectedPosition.id.match(/\d+/);
                            if (!match) {
                              throw new Error('Invalid position ID format');
                            }
                            positionId = parseInt(match[0], 10);
                          } else {
                            positionId = selectedPosition.id;
                          }
                          
                          const result = await tradesService.refreshPosition(positionId);
                          toast.success('Position refreshed successfully', { id: 'refresh-position' });
                          
                          // Update the selected position with new data
                          setSelectedPosition(result.position);
                        }
                        
                        // Also refresh the dashboard to update all positions
                        loadDashboardData(true);
                      } catch (error: any) {
                        console.error('Error refreshing position:', error);
                        toast.error(error.response?.data?.error || 'Failed to refresh position', { id: 'refresh-position' });
                      }
                    }}
                    className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium"
                  >
                    Refresh Price
                  </button>
                  <button
                    onClick={async () => {
                      const confirmMsg = selectedPosition.is_spread
                        ? `Close spread: ${selectedPosition.quantity} ${selectedPosition.symbol} ${selectedPosition.spread_type?.replace('_', ' ').toUpperCase()}?`
                        : `Close position: ${selectedPosition.quantity} ${selectedPosition.symbol} ${selectedPosition.contract_type?.toUpperCase()}?`;
                      
                      if (window.confirm(confirmMsg)) {
                        try {
                          // Handle spreads differently
                          if (selectedPosition.is_spread && selectedPosition.spread_id) {
                            await api.post(`/spreads/${selectedPosition.spread_id}/close`);
                          } else {
                            const positionId = typeof selectedPosition.id === 'string' 
                              ? parseInt(selectedPosition.id.replace('spread_', ''), 10) 
                              : selectedPosition.id;
                            await api.post(`/trades/positions/${positionId}/close`);
                          }
                          toast.success(selectedPosition.is_spread ? 'Spread closed' : 'Position closed');
                          setSelectedPosition(null);
                          loadDashboardData();
                        } catch (error: any) {
                          if (error.response?.status === 401) {
                            // Token refresh should have been attempted automatically
                            // If we still get 401, the refresh failed
                            const errorMsg = error.response?.data?.error || 'Authentication failed';
                            if (errorMsg.includes('refresh') || errorMsg.includes('expired')) {
                              toast.error('Session expired. Please log in again.');
                              setTimeout(() => {
                                localStorage.removeItem('access_token');
                                localStorage.removeItem('refresh_token');
                                window.location.href = '/login';
                              }, 2000);
                            } else {
                              toast.error('Authentication error. Please try again.');
                            }
                          } else {
                            toast.error(error.response?.data?.error || `Failed to close ${selectedPosition.is_spread ? 'spread' : 'position'}`);
                          }
                        }
                      }
                    }}
                    className="flex-1 bg-error text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium"
                  >
                    {selectedPosition.is_spread ? 'Close Spread' : 'Close Position'}
                  </button>
                </>
              )}
            </div>
        </ResponsiveModal>
      )}

      {/* Trade Details Modal */}
      {selectedTrade && (
        <ResponsiveModal
          isOpen={!!selectedTrade}
          onClose={() => setSelectedTrade(null)}
          title={`Trade Details: ${selectedTrade.symbol} ${selectedTrade.contract_type?.toUpperCase()}`}
        >
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4 md:gap-6`}>
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-2">Trade Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Symbol:</span>
                    <span className="font-medium">{selectedTrade.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Action:</span>
                    <span className={`font-medium px-2 py-1 rounded text-xs ${
                      selectedTrade.action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedTrade.action.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contract Type:</span>
                    <span className="font-medium">{selectedTrade.contract_type?.toUpperCase() || 'STOCK'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium">{selectedTrade.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-medium">${selectedTrade.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Value:</span>
                    <span className="font-medium">
                      ${(() => {
                        const isOption = selectedTrade.contract_type && 
                          ['call', 'put', 'option'].includes(selectedTrade.contract_type.toLowerCase());
                        const multiplier = isOption ? 100 : 1;
                        return (selectedTrade.price * selectedTrade.quantity * multiplier).toFixed(2);
                      })()}
                    </span>
                  </div>
                  {selectedTrade.strike_price && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Strike Price:</span>
                      <span className="font-medium">${selectedTrade.strike_price.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedTrade.expiration_date && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expiration:</span>
                        <span className="font-medium">{formatDate(selectedTrade.expiration_date)}</span>
                      </div>
                      {calculateDTE(selectedTrade.expiration_date) !== null && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Days to Expiration:</span>
                          <span className="font-medium">
                            {calculateDTE(selectedTrade.expiration_date)} days
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trade Date:</span>
                    <span className="font-medium">
                      {new Date(selectedTrade.trade_date).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Source:</span>
                    <span className="font-medium capitalize">{selectedTrade.strategy_source}</span>
                  </div>
                </div>
              </div>

              {/* P/L & Greeks - Only show if we have data */}
              {((selectedTrade.realized_pnl !== null && selectedTrade.realized_pnl !== undefined) ||
                (selectedTrade.delta !== null && selectedTrade.delta !== undefined) ||
                (selectedTrade.commission > 0) ||
                selectedTrade.notes) && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-700 border-b pb-2">Performance & Greeks</h3>
                  <div className="space-y-2 text-sm">
                    {selectedTrade.realized_pnl !== null && selectedTrade.realized_pnl !== undefined && (
                      <div className={`flex justify-between pt-2 border-t ${
                        (selectedTrade.realized_pnl || 0) >= 0 ? 'text-success' : 'text-error'
                      }`}>
                        <span className="font-semibold">Realized P/L:</span>
                        <span className="font-bold text-lg">
                          ${selectedTrade.realized_pnl.toFixed(2)}
                          {selectedTrade.realized_pnl_percent !== null && selectedTrade.realized_pnl_percent !== undefined && (
                            <span className="text-sm ml-1">
                              ({selectedTrade.realized_pnl_percent.toFixed(2)}%)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {selectedTrade.delta !== null && selectedTrade.delta !== undefined && (
                      <>
                        <div className="flex justify-between pt-2">
                          <span className="text-gray-600">Delta:</span>
                          <span className="font-medium">{selectedTrade.delta.toFixed(4)}</span>
                        </div>
                        {selectedTrade.gamma !== null && selectedTrade.gamma !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Gamma:</span>
                            <span className="font-medium">{selectedTrade.gamma.toFixed(4)}</span>
                          </div>
                        )}
                        {selectedTrade.theta !== null && selectedTrade.theta !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Theta:</span>
                            <span className="font-medium">{selectedTrade.theta.toFixed(4)}</span>
                          </div>
                        )}
                        {selectedTrade.vega !== null && selectedTrade.vega !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Vega:</span>
                            <span className="font-medium">{selectedTrade.vega.toFixed(4)}</span>
                          </div>
                        )}
                        {selectedTrade.implied_volatility !== null && selectedTrade.implied_volatility !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Implied Volatility:</span>
                            <span className="font-medium">
                              {(selectedTrade.implied_volatility * 100).toFixed(2)}%
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    {selectedTrade.commission > 0 && (
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-600">Commission:</span>
                        <span className="font-medium">${selectedTrade.commission.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedTrade.notes && (
                      <div className="pt-2 border-t">
                        <span className="text-gray-600 block mb-1">Notes:</span>
                        <span className="text-sm text-gray-700">{selectedTrade.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setSelectedTrade(null)}
                className={`${isMobile ? 'w-full' : ''} bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium min-h-[48px]`}
              >
                Close
              </button>
            </div>
        </ResponsiveModal>
      )}
    </div>
  );
};

export default Dashboard;

