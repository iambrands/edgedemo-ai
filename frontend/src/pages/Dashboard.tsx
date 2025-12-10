import React, { useState, useEffect } from 'react';
import { tradesService } from '../services/trades';
import { watchlistService } from '../services/watchlist';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Position, Trade } from '../types/trades';
import { Stock } from '../types/watchlist';
import { Line, Bar } from 'react-chartjs-2';
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
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
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

  useEffect(() => {
    loadDashboardData();
    
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
      
      // Create timeout promise (10 seconds for normal, 30 seconds if updating prices)
      const timeoutMs = updatePrices ? 30000 : 10000;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
      });

      // Fetch all data with individual error handling
      const fetchWithTimeout = async <T,>(promise: Promise<T>, defaultValue: T, name: string, customTimeout?: number): Promise<T> => {
        const timeout = customTimeout ? new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), customTimeout);
        }) : timeoutPromise;
        try {
          return await Promise.race([promise, timeout as Promise<T>]);
        } catch (error) {
          console.error(`Failed to load ${name}:`, error);
          if (!updatePrices || name !== 'positions') {
            toast.error(`Failed to load ${name}. Using default values.`, { duration: 3000 });
          }
          return defaultValue;
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
          updatePrices ? 30000 : 10000 // Longer timeout if updating prices
        ),
        fetchWithTimeout(
          tradesService.getHistory({ start_date: thirtyDaysAgo }),
          { trades: [], count: 0 },
          'trade history'
        ),
        fetchWithTimeout(
          watchlistService.getWatchlist(),
          { watchlist: [], count: 0 },
          'watchlist'
        ),
        fetchWithTimeout(
          api.get('/auth/user').catch(() => ({ data: { user: { paper_balance: 100000 } } } as any)),
          { data: { user: { paper_balance: 100000 } } } as any,
          'user data'
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-secondary">Dashboard</h1>
        <button
          onClick={refreshData}
          disabled={forcePriceUpdate}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {forcePriceUpdate ? 'Updating Prices...' : 'Refresh'}
        </button>
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

      {/* Active Positions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-secondary">Active Positions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P/L</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P/L %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {positions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    No active positions. <a href="/trade" className="text-primary hover:underline">Start trading</a> or create an automation.
                  </td>
                </tr>
              ) : (
                positions.map((position) => {
                  const dte = calculateDTE(position.expiration_date);
                  return (
                    <tr key={position.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {position.symbol}
                        {position.strike_price && (
                          <span className="text-xs text-gray-500 block">${position.strike_price}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {position.contract_type?.toUpperCase() || 'STOCK'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {position.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${position.entry_price.toFixed(2)}
                        {position.contract_type && (
                          <span className="text-xs text-gray-500 ml-1">(premium)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${position.current_price?.toFixed(2) || 'N/A'}
                        {position.contract_type && (
                          <span className="text-xs text-gray-500 ml-1">(premium)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        (position.unrealized_pnl || 0) >= 0 ? 'text-success' : 'text-error'
                      }`}>
                        ${(position.unrealized_pnl || 0).toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        (position.unrealized_pnl_percent || 0) >= 0 ? 'text-success' : 'text-error'
                      }`}>
                        {(position.unrealized_pnl_percent || 0).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
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

      {/* Recent Trades */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-secondary">Recent Trades</h2>
        </div>
        <div className="overflow-x-auto">
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

      {/* Position Details Modal */}
      {selectedPosition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
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
                    <span className="font-medium">${(selectedPosition.entry_price * selectedPosition.quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Value:</span>
                    <span className="font-medium">
                      ${((selectedPosition.current_price || 0) * selectedPosition.quantity).toFixed(2)}
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
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trade Details Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
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
                    <span className="font-medium">${(selectedTrade.price * selectedTrade.quantity).toFixed(2)}</span>
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

              {/* P/L & Greeks */}
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
                        {selectedTrade.realized_pnl_percent && (
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
                      <div className="flex justify-between">
                        <span className="text-gray-600">Gamma:</span>
                        <span className="font-medium">{selectedTrade.gamma?.toFixed(4) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Theta:</span>
                        <span className="font-medium">{selectedTrade.theta?.toFixed(4) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Vega:</span>
                        <span className="font-medium">{selectedTrade.vega?.toFixed(4) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Implied Volatility:</span>
                        <span className="font-medium">
                          {selectedTrade.implied_volatility ? `${(selectedTrade.implied_volatility * 100).toFixed(2)}%` : 'N/A'}
                        </span>
                      </div>
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

