import React, { useState, useEffect } from 'react';
import { tradesService } from '../services/trades';
import { Trade } from '../types/trades';
import toast from 'react-hot-toast';

const History: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    symbol: '',
    start_date: '',
    end_date: '',
    strategy_source: '',
  });
  const [expandedTrade, setExpandedTrade] = useState<number | null>(null);

  const setQuickDateRange = (range: 'today' | 'week' | 'month' | 'year') => {
    const today = new Date();
    let startDate = new Date();
    
    switch (range) {
      case 'today':
        startDate = new Date(today);
        break;
      case 'week':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
    }
    
    setFilters({
      ...filters,
      start_date: startDate.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0]
    });
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await tradesService.getHistory(filters);
      setTrades(data.trades);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load trade history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const applyFilters = () => {
    loadHistory();
  };

  const clearFilters = () => {
    setFilters({
      symbol: '',
      start_date: '',
      end_date: '',
      strategy_source: '',
    });
    setTimeout(loadHistory, 100);
  };

  const totalPnl = trades
    .filter(t => t.realized_pnl)
    .reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  const winRate = trades.length > 0
    ? (trades.filter(t => (t.realized_pnl || 0) > 0).length / trades.length) * 100
    : 0;
  const avgReturn = trades.filter(t => t.realized_pnl_percent).length > 0
    ? trades
        .filter(t => t.realized_pnl_percent)
        .reduce((sum, t) => sum + (t.realized_pnl_percent || 0), 0) /
      trades.filter(t => t.realized_pnl_percent).length
    : 0;

  if (loading) {
    return <div className="text-center py-12">Loading trade history...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-secondary">Trade History</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Trades</h3>
          <p className="text-3xl font-bold text-secondary">{trades.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total P/L</h3>
          <p className={`text-3xl font-bold ${totalPnl >= 0 ? 'text-success' : 'text-error'}`}>
            ${totalPnl.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Win Rate</h3>
          <p className="text-3xl font-bold text-primary">{winRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Return</h3>
          <p className={`text-3xl font-bold ${avgReturn >= 0 ? 'text-success' : 'text-error'}`}>
            {avgReturn.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-secondary">Filters</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setQuickDateRange('today')}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
            >
              Today
            </button>
            <button
              onClick={() => setQuickDateRange('week')}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
            >
              This Week
            </button>
            <button
              onClick={() => setQuickDateRange('month')}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
            >
              This Month
            </button>
            <button
              onClick={() => setQuickDateRange('year')}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium"
            >
              This Year
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
            <input
              type="text"
              value={filters.symbol}
              onChange={(e) => handleFilterChange('symbol', e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
              placeholder="Filter by symbol"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
            <select
              value={filters.strategy_source}
              onChange={(e) => handleFilterChange('strategy_source', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
            >
              <option value="">All Sources</option>
              <option value="manual">Manual</option>
              <option value="automation">Automation</option>
              <option value="signal">Signal</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={applyFilters}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium"
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">P/L</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    No trades found
                  </td>
                </tr>
              ) : (
                trades.map((trade) => (
                  <React.Fragment key={trade.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(trade.trade_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {trade.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          trade.action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {trade.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.contract_type?.toUpperCase() || 'STOCK'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${trade.price.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        (trade.realized_pnl || 0) >= 0 ? 'text-success' : 'text-error'
                      }`}>
                        {trade.realized_pnl ? `$${trade.realized_pnl.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.strategy_source}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setExpandedTrade(expandedTrade === trade.id ? null : trade.id)}
                          className="text-primary hover:text-indigo-600 font-medium"
                        >
                          {expandedTrade === trade.id ? 'Hide' : 'Show'}
                        </button>
                      </td>
                    </tr>
                    {expandedTrade === trade.id && (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 bg-gray-50">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {trade.strike_price && (
                              <div>
                                <strong>Strike:</strong> ${trade.strike_price.toFixed(2)}
                              </div>
                            )}
                            {trade.expiration_date && (
                              <div>
                                <strong>Expiration:</strong> {new Date(trade.expiration_date).toLocaleDateString()}
                              </div>
                            )}
                            {trade.delta !== undefined && trade.delta !== null && (
                              <div>
                                <strong>Delta:</strong> {trade.delta.toFixed(4)}
                              </div>
                            )}
                            {trade.theta !== undefined && trade.theta !== null && (
                              <div>
                                <strong>Theta:</strong> {trade.theta.toFixed(4)}
                              </div>
                            )}
                            {trade.gamma !== undefined && trade.gamma !== null && (
                              <div>
                                <strong>Gamma:</strong> {trade.gamma.toFixed(4)}
                              </div>
                            )}
                            {trade.vega !== undefined && trade.vega !== null && (
                              <div>
                                <strong>Vega:</strong> {trade.vega.toFixed(4)}
                              </div>
                            )}
                            {trade.implied_volatility !== undefined && (
                              <div>
                                <strong>IV:</strong> {(trade.implied_volatility * 100).toFixed(2)}%
                              </div>
                            )}
                            {trade.realized_pnl_percent !== undefined && (
                              <div>
                                <strong>Return %:</strong> {trade.realized_pnl_percent.toFixed(2)}%
                              </div>
                            )}
                          </div>
                          {trade.notes && (
                            <div className="mt-4">
                              <strong>Notes:</strong> {trade.notes}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default History;

