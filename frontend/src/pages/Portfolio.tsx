import React, { useState, useEffect } from 'react';
import { tradesService } from '../services/trades';
import api from '../services/api';
import TradingDisclaimer from '../components/TradingDisclaimer';
import toast from 'react-hot-toast';
import { Position, Trade } from '../types/trades';
import { Line, Bar } from 'react-chartjs-2';
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

const Portfolio: React.FC = () => {
  const { isMobile } = useDevice();
  const [positions, setPositions] = useState<Position[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);

  useEffect(() => {
    loadPortfolioData();
  }, []);

  const loadPortfolioData = async () => {
    setLoading(true);
    try {
      // Fetch positions
      const positionsResponse = await tradesService.getPositions();
      setPositions(positionsResponse.positions || []);

      // Fetch all trades (not just recent)
      const tradesResponse = await tradesService.getHistory();
      setAllTrades(tradesResponse.trades || []);

      // Fetch account balance
      try {
        const balanceResponse = await api.get('/account/balance');
        setAccountBalance(balanceResponse.data.balance || 100000);
      } catch (error) {
        setAccountBalance(100000); // Default fallback
      }
    } catch (error: any) {
      console.error('Failed to load portfolio data:', error);
      toast.error('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate portfolio metrics
  const totalUnrealizedPnl = positions.reduce((sum, pos) => sum + (pos.unrealized_pnl || 0), 0);
  const totalRealizedPnl = allTrades
    .filter(t => t.realized_pnl !== null && t.realized_pnl !== undefined)
    .reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  const totalPnl = totalUnrealizedPnl + totalRealizedPnl;

  const winningTrades = allTrades.filter(t => (t.realized_pnl || 0) > 0).length;
  const losingTrades = allTrades.filter(t => (t.realized_pnl || 0) < 0).length;
  const totalTrades = allTrades.length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  const totalPortfolioValue = accountBalance 
    ? accountBalance + totalUnrealizedPnl 
    : null;

  // Sort positions by unrealized P/L (highest first)
  const sortedPositions = [...positions].sort((a, b) => {
    return (b.unrealized_pnl || 0) - (a.unrealized_pnl || 0);
  });

  // Sort trades
  const sortedTrades = [...allTrades].sort((a, b) => {
    const aDate = new Date(a.trade_date).getTime();
    const bDate = new Date(b.trade_date).getTime();
    return bDate - aDate; // Most recent first
  });


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateDTE = (expirationDate: string | null | undefined): number | null => {
    if (!expirationDate) return null;
    const exp = new Date(expirationDate);
    const now = new Date();
    const diff = exp.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days >= 0 ? days : null;
  };

  // Performance chart data
  const performanceData = {
    labels: sortedTrades.slice(0, 30).reverse().map(t => formatDate(t.trade_date)),
    datasets: [
      {
        label: 'Cumulative P/L',
        data: sortedTrades.slice(0, 30).reverse().reduce((acc: number[], t) => {
          const last = acc.length > 0 ? acc[acc.length - 1] : 0;
          acc.push(last + (t.realized_pnl || 0));
          return acc;
        }, []),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TradingDisclaimer />
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-secondary">Portfolio</h1>
          <p className="text-gray-600 mt-1">Track your positions and performance</p>
        </div>
        <button
          onClick={loadPortfolioData}
          className="w-full md:w-auto px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium min-h-[48px]"
        >
          Refresh
        </button>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Portfolio Value</div>
          <div className="text-2xl font-bold text-secondary">
            {totalPortfolioValue !== null 
              ? `$${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : 'N/A'
            }
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total P/L</div>
          <div className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-success' : 'text-error'}`}>
            ${totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)} unrealized
            {' + '}
            {totalRealizedPnl >= 0 ? '+' : ''}${totalRealizedPnl.toFixed(2)} realized
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Win Rate</div>
          <div className="text-2xl font-bold text-secondary">
            {winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {winningTrades}W / {losingTrades}L ({totalTrades} total)
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Active Positions</div>
          <div className="text-2xl font-bold text-secondary">
            {positions.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {positions.filter(p => (p.unrealized_pnl || 0) > 0).length} profitable
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-secondary mb-4">Performance Trend</h2>
        {sortedTrades.length > 0 ? (
          <div className="h-64">
            <Line data={performanceData} options={chartOptions} />
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No trade data available
          </div>
        )}
      </div>

      {/* Active Positions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-lg md:text-xl font-bold text-secondary">Active Positions</h2>
        </div>
        {positions.length > 0 ? (
          <ResponsiveTable
            data={sortedPositions}
            columns={[
              { 
                key: 'symbol',
                label: 'Symbol', 
                sortable: true, 
                render: (value, pos) => (
                  <>
                    {pos.symbol}
                    {pos.strike_price && (
                      <span className="text-xs text-gray-500 block">${pos.strike_price}</span>
                    )}
                    <span className="text-xs text-gray-500 sm:hidden block">
                      {pos.contract_type?.toUpperCase() || 'STOCK'}
                    </span>
                  </>
                )
              },
              { 
                key: 'contract_type',
                label: 'Type', 
                render: (value, pos) => pos.contract_type?.toUpperCase() || 'STOCK' 
              },
              { key: 'quantity', label: 'Qty', sortable: true },
              { 
                key: 'entry_price',
                label: 'Entry', 
                sortable: true, 
                render: (value, pos) => `$${pos.entry_price.toFixed(2)}` 
              },
              { 
                key: 'current_price',
                label: 'Current', 
                sortable: true, 
                render: (value, pos) => `$${pos.current_price?.toFixed(2) || 'N/A'}` 
              },
              { 
                key: 'unrealized_pnl',
                label: 'P/L', 
                sortable: true, 
                render: (value, pos) => (
                  <span className={`${(pos.unrealized_pnl || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                    ${(pos.unrealized_pnl || 0).toFixed(2)}
                    <span className="text-xs md:hidden block">
                      ({(pos.unrealized_pnl_percent || 0).toFixed(2)}%)
                    </span>
                  </span>
                )
              },
              { 
                key: 'unrealized_pnl_percent',
                label: 'P/L %', 
                sortable: true, 
                render: (value, pos) => (
                  <span className={`${(pos.unrealized_pnl_percent || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                    {(pos.unrealized_pnl_percent || 0).toFixed(2)}%
                  </span>
                )
              },
              { 
                key: 'actions',
                label: 'Actions', 
                render: (value, pos) => (
                  <div className="flex space-x-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPosition(pos);
                      }} 
                      className="text-primary hover:text-indigo-700 font-medium text-sm"
                    >
                      Details
                    </button>
                  </div>
                )
              },
            ]}
            mobileCardRenderer={(position) => (
              <div 
                key={position.id} 
                className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 flex flex-col gap-2"
                onClick={() => setSelectedPosition(position)}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg text-secondary">{position.symbol}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    (position.unrealized_pnl || 0) >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {(position.unrealized_pnl_percent || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Qty: {position.quantity}</span>
                  <span>Type: {position.contract_type?.toUpperCase() || 'STOCK'}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Entry: ${position.entry_price.toFixed(2)}</span>
                  <span>Current: ${position.current_price?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-lg font-bold ${(position.unrealized_pnl || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                    ${(position.unrealized_pnl || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            onRowClick={(position) => setSelectedPosition(position)}
          />
        ) : (
          <div className="p-6 text-center text-gray-500">
            No active positions
          </div>
        )}
      </div>

      {/* Trade History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h2 className="text-lg md:text-xl font-bold text-secondary">Trade History</h2>
        </div>
        {sortedTrades.length > 0 ? (
          <ResponsiveTable
            data={sortedTrades.slice(0, 50)} // Show last 50 trades
            columns={[
              { 
                key: 'trade_date',
                label: 'Date', 
                render: (value, trade) => formatDate(trade.trade_date)
              },
              { 
                key: 'symbol',
                label: 'Symbol', 
                render: (value, trade) => (
                  <>
                    {trade.symbol}
                    {trade.strike_price && (
                      <span className="text-xs text-gray-500 block">${trade.strike_price}</span>
                    )}
                  </>
                )
              },
              { 
                key: 'action',
                label: 'Action', 
                render: (value, trade) => (
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    trade.action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {trade.action.toUpperCase()}
                  </span>
                )
              },
              { key: 'quantity', label: 'Qty' },
              { key: 'price', label: 'Price', render: (value, trade) => `$${trade.price.toFixed(2)}` },
              { 
                key: 'realized_pnl',
                label: 'P/L', 
                render: (value, trade) => (
                  <span className={`${(trade.realized_pnl || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                    {trade.realized_pnl !== null && trade.realized_pnl !== undefined
                      ? `$${trade.realized_pnl.toFixed(2)}`
                      : '-'
                    }
                  </span>
                )
              },
            ]}
            mobileCardRenderer={(trade) => (
              <div 
                key={trade.id} 
                className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 flex flex-col gap-2"
                onClick={() => setSelectedTrade(trade)}
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg text-secondary">{trade.symbol}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    trade.action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {trade.action.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Qty: {trade.quantity}</span>
                  <span>Price: ${trade.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">{formatDate(trade.trade_date)}</span>
                  <span className={`text-lg font-bold ${(trade.realized_pnl || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                    {trade.realized_pnl !== null && trade.realized_pnl !== undefined
                      ? `$${trade.realized_pnl.toFixed(2)}`
                      : '-'
                    }
                  </span>
                </div>
              </div>
            )}
            onRowClick={(trade) => setSelectedTrade(trade)}
          />
        ) : (
          <div className="p-6 text-center text-gray-500">
            No trade history
          </div>
        )}
      </div>

      {/* Position Details Modal */}
      {selectedPosition && (
        <ResponsiveModal
          isOpen={!!selectedPosition}
          onClose={() => setSelectedPosition(null)}
          title={`Position: ${selectedPosition.symbol} ${selectedPosition.is_spread ? selectedPosition.spread_type?.replace('_', ' ').toUpperCase() || 'SPREAD' : selectedPosition.contract_type?.toUpperCase() || ''}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Symbol:</span>
                <span className="font-medium ml-2">{selectedPosition.symbol}</span>
              </div>
              <div>
                <span className="text-gray-600">Type:</span>
                <span className="font-medium ml-2">
                  {selectedPosition.is_spread ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {selectedPosition.spread_type?.replace('_', ' ').toUpperCase() || 'SPREAD'}
                    </span>
                  ) : (
                    selectedPosition.contract_type?.toUpperCase() || 'STOCK'
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium ml-2">{selectedPosition.quantity} {selectedPosition.is_spread ? 'spreads' : 'contracts'}</span>
              </div>
              
              {/* Spread-specific fields */}
              {selectedPosition.is_spread ? (
                <>
                  <div>
                    <span className="text-gray-600">Long Strike:</span>
                    <span className="font-medium ml-2 text-success">${selectedPosition.long_strike?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Short Strike:</span>
                    <span className="font-medium ml-2 text-error">${selectedPosition.short_strike?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Net Debit:</span>
                    <span className="font-medium ml-2">${(selectedPosition.net_debit || selectedPosition.entry_price * selectedPosition.quantity * 100).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Max Profit:</span>
                    <span className="font-medium ml-2 text-success">${selectedPosition.max_profit?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Max Loss:</span>
                    <span className="font-medium ml-2 text-error">${selectedPosition.max_loss?.toFixed(2) || 'N/A'}</span>
                  </div>
                  {selectedPosition.breakeven && (
                    <div>
                      <span className="text-gray-600">Breakeven:</span>
                      <span className="font-medium ml-2">${selectedPosition.breakeven.toFixed(2)}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <span className="text-gray-600">Entry Price:</span>
                    <span className="font-medium ml-2">${selectedPosition.entry_price.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Current Price:</span>
                    <span className="font-medium ml-2">${selectedPosition.current_price?.toFixed(2) || 'N/A'}</span>
                  </div>
                </>
              )}
              
              <div className="col-span-2 pt-2 border-t">
                <span className="text-gray-600">Unrealized P/L:</span>
                <span className={`font-bold ml-2 text-lg ${(selectedPosition.unrealized_pnl || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                  ${(selectedPosition.unrealized_pnl || 0).toFixed(2)} ({(selectedPosition.unrealized_pnl_percent || 0).toFixed(2)}%)
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedPosition(null)}
              className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </ResponsiveModal>
      )}

      {/* Trade Details Modal */}
      {selectedTrade && (
        <ResponsiveModal
          isOpen={!!selectedTrade}
          onClose={() => setSelectedTrade(null)}
          title={`Trade: ${selectedTrade.symbol}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Symbol:</span>
                <span className="font-medium ml-2">{selectedTrade.symbol}</span>
              </div>
              <div>
                <span className="text-gray-600">Action:</span>
                <span className="font-medium ml-2">{selectedTrade.action.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium ml-2">{selectedTrade.quantity}</span>
              </div>
              <div>
                <span className="text-gray-600">Price:</span>
                <span className="font-medium ml-2">${selectedTrade.price.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-600">Date:</span>
                <span className="font-medium ml-2">{formatDate(selectedTrade.trade_date)}</span>
              </div>
              <div>
                <span className="text-gray-600">Realized P/L:</span>
                <span className={`font-medium ml-2 ${(selectedTrade.realized_pnl || 0) >= 0 ? 'text-success' : 'text-error'}`}>
                  {selectedTrade.realized_pnl !== null && selectedTrade.realized_pnl !== undefined
                    ? `$${selectedTrade.realized_pnl.toFixed(2)}`
                    : '-'
                  }
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedTrade(null)}
              className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </ResponsiveModal>
      )}
    </div>
  );
};

export default Portfolio;

