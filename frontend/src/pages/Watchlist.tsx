import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { watchlistService } from '../services/watchlist';
import { Stock } from '../types/watchlist';
import toast from 'react-hot-toast';
import BulkAddStocksModal from '../components/BulkAddStocksModal';

type SortField = 'symbol' | 'company_name' | 'current_price' | 'change_percent' | 'volume';
type SortDirection = 'asc' | 'desc';

const Watchlist: React.FC = () => {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSymbol, setNewSymbol] = useState('');
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      const data = await watchlistService.getWatchlist();
      setWatchlist(data.watchlist);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    try {
      await watchlistService.addStock(newSymbol.toUpperCase());
      toast.success('Stock added to watchlist');
      setNewSymbol('');
      setShowAddModal(false);
      loadWatchlist();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add stock');
    }
  };

  const handleRemoveStock = async (symbol: string) => {
    if (!window.confirm(`Remove ${symbol} from watchlist?`)) return;

    try {
      await watchlistService.removeStock(symbol);
      toast.success('Stock removed from watchlist');
      loadWatchlist();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to remove stock');
    }
  };

  const handleRefreshPrices = async () => {
    try {
      const result = await watchlistService.refreshPrices();
      toast.success(`Refreshed ${result.updated} stocks`);
      loadWatchlist();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to refresh prices');
    }
  };

  const handleUpdateNotes = async (symbol: string, notes: string) => {
    try {
      await watchlistService.updateNotes(symbol, notes);
      toast.success('Notes updated');
      loadWatchlist();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update notes');
    }
  };

  const handleAnalyze = (symbol: string) => {
    navigate('/analyzer', { state: { symbol } });
  };

  const handleTrade = (symbol: string) => {
    navigate('/trade', { state: { symbol } });
  };

  const handleBulkAdd = async (symbols: string[]) => {
    try {
      const result = await watchlistService.bulkAdd(symbols);
      
      if (result.added > 0) {
        toast.success(`Added ${result.added} stock${result.added !== 1 ? 's' : ''} to watchlist`);
      }
      
      if (result.failed > 0) {
        toast.error(`Failed to add: ${result.failed_symbols.join(', ')}`);
      }
      
      loadWatchlist();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add stocks');
      throw error;
    }
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending (except for change_percent and volume which default to desc)
      setSortField(field);
      setSortDirection(field === 'change_percent' || field === 'volume' ? 'desc' : 'asc');
    }
  };

  // Sorted watchlist
  const sortedWatchlist = useMemo(() => {
    const sorted = [...watchlist].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) aVal = sortDirection === 'asc' ? Infinity : -Infinity;
      if (bVal === null || bVal === undefined) bVal = sortDirection === 'asc' ? Infinity : -Infinity;

      // String comparison for symbol and company_name
      if (sortField === 'symbol' || sortField === 'company_name') {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }

      // Numeric comparison for price, change_percent, volume
      const aNum = typeof aVal === 'number' ? aVal : 0;
      const bNum = typeof bVal === 'number' ? bVal : 0;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
    return sorted;
  }, [watchlist, sortField, sortDirection]);

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-300">↕</span>;
    }
    return (
      <span className="ml-1 text-primary">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // Sortable header component
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center">
        {children}
        <SortIndicator field={field} />
      </div>
    </th>
  );

  if (loading) {
    return <div className="text-center py-12">Loading watchlist...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-secondary">Watchlist</h1>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleRefreshPrices}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Refresh Prices
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium"
          >
            Add Stock
          </button>
          <button
            onClick={() => setShowBulkAddModal(true)}
            className="bg-success text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
          >
            Bulk Add
          </button>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-secondary mb-4">Add Stock to Watchlist</h2>
            <form onSubmit={handleAddStock}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
                <input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter stock symbol (e.g., AAPL)"
                  maxLength={10}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setNewSymbol('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Watchlist Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader field="symbol">Symbol</SortableHeader>
                <SortableHeader field="company_name">Company</SortableHeader>
                <SortableHeader field="current_price">Price</SortableHeader>
                <SortableHeader field="change_percent">Change %</SortableHeader>
                <SortableHeader field="volume">Volume</SortableHeader>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedWatchlist.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No stocks in watchlist. Add some stocks to get started!
                  </td>
                </tr>
              ) : (
                sortedWatchlist.map((stock) => (
                  <tr key={stock.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stock.symbol}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {stock.company_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stock.current_price ? `$${stock.current_price.toFixed(2)}` : '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      (stock.change_percent || 0) >= 0 ? 'text-success' : 'text-error'
                    }`}>
                      {stock.change_percent !== undefined ? (
                        <div className="flex items-center gap-1">
                          {(stock.change_percent || 0) >= 0 ? '↑' : '↓'}
                          <span>{Math.abs(stock.change_percent).toFixed(2)}%</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stock.volume ? stock.volume.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex flex-wrap gap-1">
                        {stock.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleAnalyze(stock.symbol)}
                          className="px-2 py-1 bg-primary text-white rounded hover:bg-indigo-600 text-xs font-medium"
                          title="Analyze Options"
                        >
                          Analyze
                        </button>
                        <button
                          onClick={() => handleTrade(stock.symbol)}
                          className="px-2 py-1 bg-success text-white rounded hover:bg-green-600 text-xs font-medium"
                          title="Trade"
                        >
                          Trade
                        </button>
                        <button
                          onClick={() => setEditingStock(stock)}
                          className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs font-medium"
                          title="Edit Notes"
                        >
                          Notes
                        </button>
                        <button
                          onClick={() => handleRemoveStock(stock.symbol)}
                          className="px-2 py-1 bg-error text-white rounded hover:bg-red-600 text-xs font-medium"
                          title="Remove"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-secondary mb-4">Edit {editingStock.symbol}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  defaultValue={editingStock.notes || ''}
                  onBlur={(e) => handleUpdateNotes(editingStock.symbol, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={4}
                  placeholder="Add notes about this stock..."
                />
              </div>
              <button
                onClick={() => setEditingStock(null)}
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      <BulkAddStocksModal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        onAdd={handleBulkAdd}
        existingSymbols={watchlist.map(s => s.symbol)}
      />
    </div>
  );
};

export default Watchlist;

