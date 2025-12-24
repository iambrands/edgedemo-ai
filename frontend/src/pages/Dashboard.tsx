import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tradesService } from '../services/trades';
import { watchlistService } from '../services/watchlist';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Position, Trade } from '../types/trades';
import { Stock } from '../types/watchlist';
import { Line, Bar } from 'react-chartjs-2';
import OnboardingModal from '../components/OnboardingModal';
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

const Dashboard: React.FC = () => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [forcePriceUpdate, setForcePriceUpdate] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [quickScanResults, setQuickScanResults] = useState<any[]>([]);
  const [loadingQuickScan, setLoadingQuickScan] = useState(false);
  const [marketMovers, setMarketMovers] = useState<any[]>([]);
  const [loadingMarketMovers, setLoadingMarketMovers] = useState(false);
  const [showOpportunities, setShowOpportunities] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [loadingAiSuggestions, setLoadingAiSuggestions] = useState(false);
  const [checkingExits, setCheckingExits] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
    loadOpportunities();
    loadMarketMovers();
    loadAiSuggestions();
    
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
      }, 1000);
    }
    
    // Auto-refresh when page becomes visible (user navigates back to Dashboard)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDashboardData();
      }
    };
    
    // Listen for custom event when a trade is executed
    const handleTradeExecuted = () => {
      loadDashboardData();
    };
    
    // Listen for focus event (user switches back to tab)
    const handleFocus = () => {
      loadDashboardData();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('tradeExecuted', handleTradeExecuted);
    window.addEventListener('focus', handleFocus);
    
    // Also check sessionStorage for trade execution flag
    const checkTradeFlag = setInterval(() => {
      const tradeExecuted = sessionStorage.getItem('tradeExecuted');
      if (tradeExecuted === 'true') {
        sessionStorage.removeItem('tradeExecuted');
        loadDashboardData();
      }
    }, 1000); // Check every second
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('tradeExecuted', handleTradeExecuted);
      window.removeEventListener('focus', handleFocus);
      clearInterval(checkTradeFlag);
    };
  }, []);

  const loadDashboardData = async (updatePrices: boolean = false) => {
    setLoading(true);
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Create timeout promise (60 seconds for normal, 90 seconds if updating prices)
      // Increased timeouts significantly to handle large datasets and slow API responses
      const timeoutMs = updatePrices ? 90000 : 60000;
      
      // Fetch all data with individual error handling
      const fetchWithTimeout = async <T,>(promise: Promise<T>, defaultValue: T, name: string, customTimeout?: number): Promise<T> => {
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
              console.warn(`⏱️ Timeout loading ${name} (${timeoutDuration}ms), using cached/default data`);
            }
            // Don't show error toasts for background timeouts - they're expected in slow network conditions
            return defaultValue;
          } else {
            // For non-timeout errors, log but still return default
            console.warn(`⚠️ Error loading ${name}:`, errorMessage);
            return defaultValue;
          }
        }
      };

      // Fetch all data in parallel, but handle each failure independently
      // Only update prices if explicitly requested (manual refresh) or if forcePriceUpdate is true
      const positionsUrl = updatePrices || forcePriceUpdate 
        ? '/trades/positions?update_prices=true' 
        : '/trades/positions';
      
      const [positionsData, tradesData, watchlistData, userDataResponse] = await Promise.all([
        fetchWithTimeout(
          api.get(positionsUrl).then(res => res.data),
          { positions: [], count: 0 },
          'positions',
          updatePrices ? 90000 : 60000 // Longer timeout for positions (60s normal, 90s with price updates)
        ),
        fetchWithTimeout(
          tradesService.getHistory({ start_date: thirtyDaysAgo }),
          { trades: [], count: 0 },
          'trade history',
          20000 // 20 second timeout
        ),
        fetchWithTimeout(
          watchlistService.getWatchlist(),
          { watchlist: [], count: 0 },
          'watchlist',
          20000 // 20 second timeout
        ),
        fetchWithTimeout(
          api.get('/auth/user').catch(() => ({ data: { user: { paper_balance: 100000 } } } as any)),
          { data: { user: { paper_balance: 100000 } } } as any,
          'user data',
          20000 // 20 second timeout
        ),
      ]);
      
      const userData = userDataResponse;

      setPositions(positionsData.positions || []);
      setAllTrades(tradesData.trades || []); // Store all trades for performance trend
      setRecentTrades((tradesData.trades || []).slice(0, 10)); // Show only 10 in table
      setWatchlist(watchlistData.watchlist || []);
      setAccountBalance(userData.data?.user?.paper_balance || 100000);
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load some dashboard data. Please refresh the page.', { duration: 5000 });
      // Set defaults so page can still render
      setPositions([]);
      setAllTrades([]);
      setRecentTrades([]);
      setWatchlist([]);
      setAccountBalance(100000);
    } finally {
      setLoading(false);
    }
  };

  const loadOpportunities = async () => {
    setLoadingOpportunities(true);
    try {
      const response = await api.get('/opportunities/today');
      setOpportunities(response.data.opportunities || []);
    } catch (error: any) {
      // Silently fail - opportunities are optional
      console.error('Failed to load opportunities:', error);
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

  const handleQuickScan = async () => {
    setLoadingQuickScan(true);
    try {
      const response = await api.post('/opportunities/quick-scan');
      const results = response.data.opportunities || [];
      setQuickScanResults(results);
      
      if (results.length > 0) {
        toast.success(`Found ${results.length} opportunity${results.length > 1 ? 'ies' : ''}!`, { duration: 3000 });
        // Merge with existing opportunities (avoid duplicates)
        const existingSymbols = new Set(opportunities.map(o => o.symbol));
        const newOpportunities = results.filter((r: any) => !existingSymbols.has(r.symbol));
        setOpportunities([...opportunities, ...newOpportunities]);
      } else {
        toast('No opportunities found in popular symbols. Try adding symbols to your watchlist.', { 
          duration: 4000,
          icon: 'ℹ️'
        });
      }
    } catch (error: any) {
      console.error('Quick scan failed:', error);
      toast.error('Quick scan failed. Please try again.', { duration: 3000 });
    } finally {
      setLoadingQuickScan(false);
    }
  };

  const loadMarketMovers = async () => {
    setLoadingMarketMovers(true);
    try {
      const response = await api.get('/opportunities/market-movers?limit=8');
      setMarketMovers(response.data.movers || []);
    } catch (error: any) {
      console.error('Failed to load market movers:', error);
      setMarketMovers([]);
    } finally {
      setLoadingMarketMovers(false);
    }
  };

  const loadAiSuggestions = async () => {
    setLoadingAiSuggestions(true);
    try {
      const response = await api.get('/opportunities/ai-suggestions?limit=8');
      setAiSuggestions(response.data.recommendations || []);
    } catch (error: any) {
      console.error('Failed to load AI suggestions:', error);
      setAiSuggestions([]);
    } finally {
      setLoadingAiSuggestions(false);
    }
  };

  const refreshData = async () => {
    // Force update prices when manually refreshing
    setForcePriceUpdate(true);
    try {
      await loadDashboardData(true);
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
  const totalRealizedPnl = recentTrades
    .filter(t => t.realized_pnl)
    .reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  const winRate = recentTrades.length > 0
    ? (recentTrades.filter(t => (t.realized_pnl || 0) > 0).length / recentTrades.length) * 100
    : 0;

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

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  const handleOnboardingComplete = () => {
    localStorage.setItem('has_seen_onboarding', 'true');
    setShowOnboarding(false);
    toast.success('Welcome to IAB OptionsBot! 🎉');
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('has_seen_onboarding', 'true');
    setShowOnboarding(false);
  };

  return (
    <div className="space-y-6">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-secondary">Dashboard</h1>
        <div className="flex gap-3">
          <button
            onClick={checkPositionExits}
            disabled={checkingExits}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
            title="Check all positions for exit conditions (profit targets and stop losses)"
          >
            {checkingExits ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Checking...</span>
              </>
            ) : (
              <>
                <span>🛡️</span>
                <span>Check Exits</span>
              </>
            )}
          </button>
          <button
            onClick={handleQuickScan}
            disabled={loadingQuickScan}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
          >
            {loadingQuickScan ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Quick Scan</span>
              </>
            )}
          </button>
          <button
            onClick={refreshData}
            disabled={forcePriceUpdate}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {forcePriceUpdate ? 'Updating Prices...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Today's Opportunities Widget */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg shadow-md p-6 border border-indigo-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-secondary">🎯 Today's Opportunities</h2>
            {opportunities.length > 0 && (
              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                {opportunities.length} high-confidence signal{opportunities.length > 1 ? 's' : ''} (70%+)
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const newValue = !showOpportunities;
                setShowOpportunities(newValue);
                localStorage.setItem('showOpportunities', String(newValue));
              }}
              className="text-sm text-gray-600 hover:text-gray-800 font-medium"
              title={showOpportunities ? 'Hide opportunities' : 'Show opportunities'}
            >
              {showOpportunities ? '👁️ Hide' : '👁️‍🗨️ Show'}
            </button>
            <button
              onClick={loadOpportunities}
              disabled={loadingOpportunities}
              className="text-sm text-primary hover:text-indigo-700 font-medium disabled:opacity-50"
            >
              {loadingOpportunities ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {showOpportunities && (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunities.map((opp, idx) => (
              <div
                key={idx}
                onClick={() => handleAnalyzeOpportunity(opp.symbol)}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-secondary">{opp.symbol}</h3>
                    {opp.current_price && (
                      <p className="text-sm text-gray-600">${opp.current_price.toFixed(2)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                      opp.signal_direction === 'bullish' 
                        ? 'bg-green-100 text-green-800' 
                        : opp.signal_direction === 'bearish'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {opp.signal_direction?.toUpperCase() || 'NEUTRAL'}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {(opp.confidence * 100).toFixed(0)}% confidence
                    </div>
                  </div>
                </div>
                {opp.reason && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">{opp.reason}</p>
                )}
                <div className="flex items-center justify-between text-xs">
                  {opp.iv_rank !== undefined && (
                    <span className={`px-2 py-1 rounded ${
                      opp.iv_rank > 70 ? 'bg-orange-100 text-orange-800' :
                      opp.iv_rank > 30 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      IV Rank: {opp.iv_rank.toFixed(0)}%
                    </span>
                  )}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalyzeOpportunity(opp.symbol);
                    }}
                    className="text-primary font-medium hover:text-indigo-700"
                  >
                    Analyze Options →
                  </button>
                </div>
              </div>
            ))}
          </div>
          {opportunities.length === 0 && !loadingOpportunities && (
            <p className="text-center text-gray-500 text-sm py-4">
              No high-confidence opportunities (70%+) found. Add symbols to your watchlist or try Quick Scan.
            </p>
          )}
          </>
        )}
        
        {!showOpportunities && (
          <p className="text-center text-gray-500 text-sm py-4 italic">
            Opportunities hidden. Click "Show" to display.
          </p>
        )}
      </div>

      {/* Account Balance Card */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 mb-1">Paper Trading Balance</p>
            <h2 className="text-4xl font-bold">
              ${accountBalance !== null ? accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Loading...'}
            </h2>
            <p className="text-sm opacity-75 mt-2">Virtual funds for testing strategies</p>
          </div>
          <div className="text-6xl opacity-20">💰</div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Positions</h3>
          <p className="text-3xl font-bold text-secondary">{positions.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Unrealized P/L</h3>
          <p className={`text-3xl font-bold ${totalUnrealizedPnl >= 0 ? 'text-success' : 'text-error'}`}>
            ${totalUnrealizedPnl.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Realized P/L (30d)</h3>
          <p className={`text-3xl font-bold ${totalRealizedPnl >= 0 ? 'text-success' : 'text-error'}`}>
            ${totalRealizedPnl.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Win Rate</h3>
          <p className="text-3xl font-bold text-primary">{winRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-secondary mb-4">Performance Trend</h2>
          {performanceData.labels.length > 0 && performanceData.labels[0] !== 'No data' ? (
            <div className="h-64">
              <Line data={performanceData} options={chartOptions} />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">No performance data yet</p>
                <p className="text-sm">Close some positions to see your performance trend</p>
              </div>
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-secondary mb-4">Positions by Symbol</h2>
          {Object.keys(positionsBySymbol).length > 0 ? (
            <div className="h-64">
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
            <div className="h-64 flex items-center justify-center text-gray-500">
              <p>No positions to display</p>
            </div>
          )}
        </div>
      </div>

      {/* Market Movers Widget */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-secondary">📈 Market Movers</h2>
            {marketMovers.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {marketMovers.length} high-activity stocks
              </span>
            )}
            {marketMovers.length === 0 && !loadingMarketMovers && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                High volume & volatility
              </span>
            )}
          </div>
          <button
            onClick={loadMarketMovers}
            disabled={loadingMarketMovers}
            className="text-sm text-primary hover:text-indigo-700 font-medium disabled:opacity-50"
          >
            {loadingMarketMovers ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {marketMovers.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {marketMovers.map((mover, idx) => (
              <div
                key={idx}
                onClick={() => handleAnalyzeOpportunity(mover.symbol)}
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-secondary">{mover.symbol}</h3>
                    <p className="text-sm text-gray-600">${mover.current_price?.toFixed(2) || 'N/A'}</p>
                  </div>
                  <div className={`text-right ${mover.movement_type === 'up' ? 'text-green-600' : mover.movement_type === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                    <div className="text-sm font-semibold">
                      {mover.change_percent > 0 ? '+' : ''}{mover.change_percent?.toFixed(2) || 0}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs mt-2">
                  <div className="flex flex-col gap-1">
                    {mover.volume_ratio > 1 && (
                      <span className="text-gray-600">
                        Vol: {mover.volume_ratio.toFixed(1)}x avg
                      </span>
                    )}
                    {mover.iv_rank > 0 && (
                      <span className={`px-2 py-0.5 rounded ${
                        mover.iv_rank > 70 ? 'bg-orange-100 text-orange-800' :
                        mover.iv_rank > 30 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        IV: {mover.iv_rank.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalyzeOpportunity(mover.symbol);
                    }}
                    className="text-primary font-medium hover:text-indigo-700 text-xs"
                  >
                    Analyze →
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            {loadingMarketMovers ? (
              <p className="text-gray-500 text-sm">Loading market movers...</p>
            ) : (
              <div>
                <p className="text-gray-500 text-sm mb-2">No market movers found at this time.</p>
                <p className="text-gray-400 text-xs">Click "Refresh" to scan again.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI-Powered Suggestions Widget */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-md p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-secondary">🤖 AI-Powered Suggestions</h2>
            {aiSuggestions.length > 0 && (
              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                {aiSuggestions.length} personalized recommendation{aiSuggestions.length > 1 ? 's' : ''}
              </span>
            )}
            {aiSuggestions.length === 0 && !loadingAiSuggestions && (
              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                Based on your trading patterns
              </span>
            )}
          </div>
          <button
            onClick={loadAiSuggestions}
            disabled={loadingAiSuggestions}
            className="text-sm text-primary hover:text-indigo-700 font-medium disabled:opacity-50"
          >
            {loadingAiSuggestions ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {aiSuggestions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {aiSuggestions.map((suggestion, idx) => (
              <div
                key={idx}
                onClick={() => handleAnalyzeOpportunity(suggestion.symbol)}
                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-secondary">{suggestion.symbol}</h3>
                    {suggestion.current_price && (
                      <p className="text-sm text-gray-600">${suggestion.current_price.toFixed(2)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                      suggestion.risk_level === 'high_opportunity' 
                        ? 'bg-green-100 text-green-800' 
                        : suggestion.risk_level === 'moderate_opportunity'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {suggestion.risk_level === 'high_opportunity' ? 'HIGH' : 
                       suggestion.risk_level === 'moderate_opportunity' ? 'MOD' : 'LOW'}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Score: {suggestion.score}/100
                    </div>
                  </div>
                </div>
                {suggestion.match_reasons && suggestion.match_reasons.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-600 font-medium mb-1">Why this symbol:</p>
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      {suggestion.match_reasons.slice(0, 2).map((reason: string, i: number) => (
                        <li key={i} className="flex items-start">
                          <span className="text-purple-500 mr-1">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {suggestion.iv_rank !== undefined && suggestion.iv_rank > 0 && (
                  <div className="mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      suggestion.iv_rank > 70 ? 'bg-orange-100 text-orange-800' :
                      suggestion.iv_rank > 30 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      IV Rank: {suggestion.iv_rank.toFixed(0)}%
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs mt-2">
                  <span className="text-gray-500">
                    {suggestion.confidence ? `${(suggestion.confidence * 100).toFixed(0)}% confidence` : 'Analyzing...'}
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalyzeOpportunity(suggestion.symbol);
                    }}
                    className="text-primary font-medium hover:text-indigo-700"
                  >
                    Analyze →
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            {loadingAiSuggestions ? (
              <p className="text-gray-500 text-sm">Analyzing your trading patterns...</p>
            ) : (
              <div>
                <p className="text-gray-500 text-sm mb-2">No personalized suggestions available yet.</p>
                <p className="text-gray-400 text-xs">Start trading to get AI-powered recommendations based on your patterns.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Positions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-lg md:text-xl font-bold text-secondary">Active Positions</h2>
        </div>
        <div className="overflow-x-auto -mx-4 md:mx-0">
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
                    No active positions. <a href="/trade" className="text-primary hover:underline">Start trading</a> or create an automation.
                  </td>
                </tr>
              ) : (
                sortedPositions.map((position) => {
                  const dte = calculateDTE(position.expiration_date);
                  return (
                    <tr key={position.id} className="hover:bg-gray-50">
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {position.symbol}
                        {position.strike_price && (
                          <span className="text-xs text-gray-500 block">${position.strike_price}</span>
                        )}
                        <span className="text-xs text-gray-500 sm:hidden block">{position.contract_type?.toUpperCase() || 'STOCK'}</span>
                      </td>
                      <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                        {position.contract_type?.toUpperCase() || 'STOCK'}
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
                        ${position.current_price?.toFixed(2) || 'N/A'}
                        {position.contract_type && (
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
                                
                                await api.post(`/trades/positions/${position.id}/close`);
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
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-lg md:text-xl font-bold text-secondary">Recent Trades</h2>
        </div>
        <div className="overflow-x-auto -mx-4 md:mx-0">
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
                        {new Date(trade.trade_date).toLocaleDateString()}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full h-full md:h-auto md:max-w-3xl md:max-h-[90vh] overflow-y-auto md:mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-secondary">
                Position Details: {selectedPosition.symbol} {selectedPosition.contract_type?.toUpperCase()}
              </h2>
              <button
                onClick={() => setSelectedPosition(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-2">Basic Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Symbol:</span>
                    <span className="font-medium">{selectedPosition.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contract Type:</span>
                    <span className="font-medium">{selectedPosition.contract_type?.toUpperCase() || 'STOCK'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium">{selectedPosition.quantity}</span>
                  </div>
                  {selectedPosition.strike_price && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Strike Price:</span>
                      <span className="font-medium">${selectedPosition.strike_price.toFixed(2)}</span>
                    </div>
                  )}
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
                  {selectedPosition.option_symbol && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Option Symbol:</span>
                      <span className="font-medium text-xs">{selectedPosition.option_symbol}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing & P/L */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-2">Pricing & P/L</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Entry Price:</span>
                    <span className="font-medium">${selectedPosition.entry_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Price:</span>
                    <span className="font-medium">${selectedPosition.current_price?.toFixed(2) || 'N/A'}</span>
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
                      ${(() => {
                        const isOption = selectedPosition.contract_type && 
                          ['call', 'put', 'option'].includes(selectedPosition.contract_type.toLowerCase());
                        const multiplier = isOption ? 100 : 1;
                        return ((selectedPosition.current_price || 0) * selectedPosition.quantity * multiplier).toFixed(2);
                      })()}
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
                </div>
              </div>

              {/* AI Analysis */}
              <div className="space-y-4 col-span-2">
                <h3 className="font-semibold text-gray-700 border-b pb-2">AI Analysis</h3>
                <div className="bg-blue-50 rounded-lg p-4 text-sm">
                  {(() => {
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
                    
                    // DTE Analysis (for options)
                    if (isOption && dte !== null) {
                      if (dte <= 7) {
                        analysis.push(`⏰ Time decay risk: Only ${dte} days until expiration. Time decay (theta) will accelerate. Consider closing if near target.`);
                      } else if (dte <= 21) {
                        analysis.push(`⏱️ Approaching expiration: ${dte} days remaining. Time decay will increase.`);
                      }
                    }
                    
                    // Delta Analysis (for options)
                    if (isOption && currentDelta !== null && currentDelta !== undefined) {
                      const deltaPercent = Math.abs(currentDelta * 100);
                      if (deltaPercent > 70) {
                        analysis.push(`🎯 High delta (${(currentDelta * 100).toFixed(1)}%): Position behaves more like stock. Large price moves will have significant impact.`);
                      } else if (deltaPercent < 30) {
                        analysis.push(`🎲 Low delta (${(currentDelta * 100).toFixed(1)}%): Position is out-of-the-money. Lower probability of profit but higher leverage if it moves favorably.`);
                      }
                    }
                    
                    // IV Analysis (for options)
                    if (isOption && currentIV !== null && currentIV !== undefined) {
                      const ivPercent = currentIV * 100;
                      if (ivPercent > 50) {
                        analysis.push(`📊 High implied volatility (${ivPercent.toFixed(1)}%): Premiums are elevated. Good for selling, challenging for buying.`);
                      } else if (ivPercent < 20) {
                        analysis.push(`📉 Low implied volatility (${ivPercent.toFixed(1)}%): Premiums are relatively cheap. Good for buying, less attractive for selling.`);
                      }
                    }
                    
                    // Overall recommendation
                    if (analysis.length === 0) {
                      analysis.push(`📋 Position appears stable. Continue monitoring price action and Greeks.`);
                    }
                    
                    return analysis.map((item, idx) => (
                      <div key={idx} className="mb-2 text-gray-700">
                        {item}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Entry Greeks */}
              {selectedPosition.entry_delta !== null && selectedPosition.entry_delta !== undefined && (
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

              {/* Current Greeks */}
              {selectedPosition.current_delta !== null && selectedPosition.current_delta !== undefined && (
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
                        const result = await tradesService.refreshPosition(selectedPosition.id);
                        toast.success('Position refreshed successfully', { id: 'refresh-position' });
                        // Update the selected position with new data
                        setSelectedPosition(result.position);
                        // Also refresh the dashboard
                        loadDashboardData(true);
                      } catch (error: any) {
                        toast.error(error.response?.data?.error || 'Failed to refresh position', { id: 'refresh-position' });
                      }
                    }}
                    className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium"
                  >
                    Refresh Price
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Close position: ${selectedPosition.quantity} ${selectedPosition.symbol} ${selectedPosition.contract_type?.toUpperCase()}?`)) {
                        try {
                          await api.post(`/trades/positions/${selectedPosition.id}/close`);
                          toast.success('Position closed');
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
                            toast.error(error.response?.data?.error || 'Failed to close position');
                          }
                        }
                      }
                    }}
                    className="flex-1 bg-error text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium"
                  >
                    Close Position
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trade Details Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full h-full md:h-auto md:max-w-3xl md:max-h-[90vh] overflow-y-auto md:mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-secondary">
                Trade Details: {selectedTrade.symbol} {selectedTrade.contract_type?.toUpperCase()}
              </h2>
              <button
                onClick={() => setSelectedTrade(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
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
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

