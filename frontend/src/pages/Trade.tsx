import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Expiration {
  date: string;
}

const Trade: React.FC = () => {
  const location = useLocation();
  const [symbol, setSymbol] = useState('');
  const [expiration, setExpiration] = useState('');
  const [expirations, setExpirations] = useState<Expiration[]>([]);
  const [strike, setStrike] = useState('');
  const [contractType, setContractType] = useState<'call' | 'put'>('call');
  const [quantity, setQuantity] = useState(1);
  const [action, setAction] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingExpirations, setLoadingExpirations] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [accountBalance, setAccountBalance] = useState<number | null>(null);
  const [stockPrice, setStockPrice] = useState<number | null>(null);

  useEffect(() => {
    loadAccountBalance();
    
    // Check if symbol was passed from navigation
    if (location.state && location.state.symbol) {
      setSymbol(location.state.symbol);
    }
    
    // Check if trade data was passed from Options Analyzer
    const tradeDataStr = sessionStorage.getItem('tradeData');
    if (tradeDataStr) {
      try {
        const tradeData = JSON.parse(tradeDataStr);
        console.log('Loading trade data from sessionStorage:', tradeData);
        if (tradeData.symbol) {
          setSymbol(tradeData.symbol);
        }
        if (tradeData.expiration) {
          setExpiration(tradeData.expiration);
        }
        if (tradeData.strike) {
          setStrike(tradeData.strike.toString());
        }
        if (tradeData.contractType) {
          setContractType(tradeData.contractType);
        }
        if (tradeData.price) {
          setPrice(parseFloat(tradeData.price));
        }
        if (tradeData.quantity) {
          setQuantity(tradeData.quantity);
        }
        // Clear the stored data after using it
        sessionStorage.removeItem('tradeData');
        console.log('Trade data loaded successfully');
      } catch (error) {
        console.error('Failed to parse trade data:', error);
        toast.error('Failed to load trade data');
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (symbol) {
      fetchExpirations();
      fetchStockPrice();
    }
  }, [symbol]);

  useEffect(() => {
    // Auto-fetch option price when symbol, expiration, strike, and contract type are all set
    if (symbol && expiration && strike && contractType) {
      fetchOptionPrice();
    }
  }, [symbol, expiration, strike, contractType]);

  const loadAccountBalance = async () => {
    try {
      const response = await api.get('/auth/user');
      setAccountBalance(response.data.user.paper_balance || 0);
    } catch (error) {
      console.error('Failed to load account balance:', error);
    }
  };

  const fetchExpirations = async () => {
    if (!symbol) return;
    setLoadingExpirations(true);
    try {
      const response = await api.get(`/options/expirations/${symbol}`);
      const expirationsList = response.data.expirations || [];
      setExpirations(expirationsList.map((exp: string) => ({ date: exp })));
      // Only auto-set expiration if we don't already have one from tradeData
      if (expirationsList.length > 0 && !expiration) {
        setExpiration(expirationsList[0]);
      }
    } catch (error: any) {
      // Don't show error toast - expirations are optional if we already have one
      if (!expiration) {
        console.error('Failed to fetch expirations:', error);
        // Only show error if we don't have an expiration already set
        if (error.response?.status !== 404 && error.response?.status !== 400) {
          toast.error(error.response?.data?.error || 'Failed to fetch expirations');
        }
      }
    } finally {
      setLoadingExpirations(false);
    }
  };

  const fetchStockPrice = async () => {
    if (!symbol) return;
    try {
      const response = await api.get(`/options/quote/${symbol}`);
      if (response.data && response.data.current_price) {
        setStockPrice(response.data.current_price);
      }
    } catch (error) {
      // Silently fail - stock price is optional
      console.error('Failed to fetch stock price:', error);
    }
  };

  const fetchOptionPrice = async () => {
    if (!symbol || !expiration || !strike) return;
    
    setLoadingPrice(true);
    try {
      const response = await api.get(`/options/chain/${symbol}/${expiration}`);
      const chain = response.data.chain || [];
      
      // Find the matching option
      const strikeNum = parseFloat(strike);
      const matchingOption = chain.find((opt: any) => {
        const optStrike = parseFloat(opt.strike || 0);
        const optType = (opt.type || '').toLowerCase();
        return Math.abs(optStrike - strikeNum) < 0.01 && optType === contractType;
      });
      
      if (matchingOption) {
        // Use mid price if available, otherwise last price
        const midPrice = matchingOption.bid && matchingOption.ask 
          ? (parseFloat(matchingOption.bid) + parseFloat(matchingOption.ask)) / 2
          : parseFloat(matchingOption.last || 0);
        
        if (midPrice > 0) {
          setPrice(midPrice);
        }
      }
    } catch (error: any) {
      // Silently fail - user can still enter price manually
      console.error('Failed to fetch option price:', error);
    } finally {
      setLoadingPrice(false);
    }
  };

  const calculateCost = () => {
    if (!price || !quantity) return 0;
    return price * quantity * 100; // Options are 100 shares per contract
  };

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!symbol || !expiration || !strike || !quantity || price === null) {
      toast.error('Please fill in all required fields including price');
      return;
    }

    const cost = calculateCost();
    if (action === 'buy' && accountBalance !== null && cost > accountBalance) {
      toast.error(`Insufficient balance. Need $${cost.toFixed(2)}, have $${accountBalance.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/trades/execute', {
        symbol: symbol.toUpperCase(),
        action: action,
        quantity: quantity,
        strike: parseFloat(strike),
        expiration_date: expiration,
        contract_type: contractType,
        price: price,
        strategy_source: 'manual'
      });

      toast.success(`${action === 'buy' ? 'Bought' : 'Sold'} ${quantity} ${contractType} contract(s)`);
      
      // Signal that a trade was executed (for Dashboard auto-refresh)
      sessionStorage.setItem('tradeExecuted', 'true');
      window.dispatchEvent(new CustomEvent('tradeExecuted'));
      
      // Reload balance
      await loadAccountBalance();
      
      // Reset form
      setSymbol('');
      setExpiration('');
      setStrike('');
      setQuantity(1);
      setPrice(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Trade execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Trade Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-secondary mb-6">Manual Trade</h1>

        <form onSubmit={handleTrade} className="space-y-6">
          {/* Action Selection */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setAction('buy')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                action === 'buy'
                  ? 'bg-success text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setAction('sell')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                action === 'sell'
                  ? 'bg-error text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Sell
            </button>
          </div>

          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Symbol *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., AAPL"
                maxLength={10}
                required
              />
              {stockPrice !== null && (
                <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
                  ${stockPrice.toFixed(2)}
                </div>
              )}
            </div>
            {stockPrice !== null && (
              <p className="mt-1 text-xs text-gray-500">Current stock price</p>
            )}
          </div>

          {/* Contract Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contract Type *</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setContractType('call')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  contractType === 'call'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Call
              </button>
              <button
                type="button"
                onClick={() => setContractType('put')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  contractType === 'put'
                    ? 'bg-error text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Put
              </button>
            </div>
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expiration *</label>
            <select
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              disabled={loadingExpirations || expirations.length === 0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
              required
            >
              <option value="">Select expiration</option>
              {expirations.map((exp) => (
                <option key={exp.date} value={exp.date}>
                  {exp.date}
                </option>
              ))}
            </select>
          </div>

          {/* Strike Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Strike Price *</label>
            <input
              type="number"
              step="0.01"
              value={strike}
              onChange={(e) => setStrike(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., 150.00"
              required
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (Contracts) *</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* Price (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price per Contract (Premium) *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={price || ''}
                onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., 2.50"
                required
              />
              <button
                type="button"
                onClick={fetchOptionPrice}
                disabled={loadingPrice || !symbol || !expiration || !strike}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loadingPrice ? '...' : 'Fetch'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {loadingPrice ? 'Fetching current market price...' : 'Click "Fetch" to get current market price, or enter manually'}
            </p>
          </div>

          {/* Cost Calculation */}
          {price && quantity && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Total Cost:</span>
                <span className="text-2xl font-bold text-secondary">
                  ${calculateCost().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {quantity} contract(s) × ${price.toFixed(2)} × 100 shares = ${calculateCost().toFixed(2)}
              </p>
              {action === 'buy' && accountBalance !== null && (
                <p className={`text-sm mt-2 ${calculateCost() > accountBalance ? 'text-error' : 'text-success'}`}>
                  Balance after: ${(accountBalance - calculateCost()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !symbol || !expiration || !strike || !quantity || price === null}
            className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-colors ${
              action === 'buy'
                ? 'bg-success hover:bg-green-600'
                : 'bg-error hover:bg-red-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? 'Executing...' : `${action === 'buy' ? 'Buy' : 'Sell'} ${quantity} ${contractType.toUpperCase()} Contract(s)`}
          </button>
        </form>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📝 Paper Trading Info</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• All trades use virtual money - no real funds at risk</li>
          <li>• Starting balance: $100,000</li>
          <li>• Each contract represents 100 shares</li>
          <li>• Prices use real market data</li>
          <li>• Check your positions on the Dashboard</li>
        </ul>
      </div>
    </div>
  );
};

export default Trade;

