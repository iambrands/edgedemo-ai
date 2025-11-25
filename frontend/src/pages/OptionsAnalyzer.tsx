import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { optionsService } from '../services/options';
import { OptionContract } from '../types/options';
import { watchlistService } from '../services/watchlist';
import api from '../services/api';
import toast from 'react-hot-toast';
import OptionsChainTable from '../components/OptionsChain/OptionsChainTable';

const OptionsAnalyzer: React.FC = () => {
  const location = useLocation();
  const [symbol, setSymbol] = useState('AAPL');
  const [stockPrice, setStockPrice] = useState<number | null>(null);
  const [expiration, setExpiration] = useState('');
  const [preference, setPreference] = useState<'income' | 'growth' | 'balanced'>('balanced');
  const [expirations, setExpirations] = useState<string[]>([]);
  const [options, setOptions] = useState<OptionContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingExpirations, setLoadingExpirations] = useState(false);

  const fetchExpirations = async () => {
    if (!symbol) return;
    setLoadingExpirations(true);
    try {
      const data = await optionsService.getExpirations(symbol);
      setExpirations(data.expirations);
      if (data.expirations.length > 0 && !expiration) {
        setExpiration(data.expirations[0]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to fetch expirations');
    } finally {
      setLoadingExpirations(false);
    }
  };

  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSymbol(e.target.value.toUpperCase());
    setExpiration('');
    setOptions([]);
  };

  const handleSymbolSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExpirations();
  };

  const analyzeOptions = async () => {
    if (!symbol || !expiration) {
      toast.error('Please select a symbol and expiration');
      return;
    }

    setLoading(true);
    try {
      const data = await optionsService.analyze(symbol, expiration, preference);
      setOptions(data.options);
      toast.success(`Found ${data.count} options`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to analyze options');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    // Check if symbol was passed from navigation
    if (location.state && location.state.symbol) {
      setSymbol(location.state.symbol);
    }
  }, [location.state]);

  React.useEffect(() => {
    if (symbol) {
      fetchExpirations();
      fetchStockPrice();
    }
  }, [symbol]);

  const fetchStockPrice = async () => {
    if (!symbol) return;
    try {
      const response = await api.get(`/watchlist/quote/${symbol}`);
      if (response.data && response.data.current_price) {
        setStockPrice(response.data.current_price);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const handleAddToWatchlist = async () => {
    try {
      await watchlistService.addStock(symbol);
      toast.success(`${symbol} added to watchlist!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add to watchlist');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-secondary">Options Chain Analyzer</h1>
          {stockPrice !== null && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Stock Price</p>
                <p className="text-xl font-bold text-secondary">${stockPrice.toFixed(2)}</p>
              </div>
              <button
                onClick={handleAddToWatchlist}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium text-sm"
              >
                Add to Watchlist
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
            <form onSubmit={handleSymbolSubmit}>
              <input
                type="text"
                value={symbol}
                onChange={handleSymbolChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter symbol (e.g., AAPL)"
                maxLength={10}
              />
            </form>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expiration</label>
            <select
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              disabled={loadingExpirations || expirations.length === 0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select expiration</option>
              {expirations.map((exp) => (
                <option key={exp} value={exp}>
                  {exp}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Strategy Preference</label>
            <select
              value={preference}
              onChange={(e) => setPreference(e.target.value as 'income' | 'growth' | 'balanced')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="income">Income</option>
              <option value="balanced">Balanced</option>
              <option value="growth">Growth</option>
            </select>
          </div>
        </div>

        <button
          onClick={analyzeOptions}
          disabled={loading || !symbol || !expiration}
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : 'Analyze Options'}
        </button>
      </div>

      {options.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <OptionsChainTable options={options} symbol={symbol} expiration={expiration} />
        </div>
      )}
    </div>
  );
};

export default OptionsAnalyzer;

