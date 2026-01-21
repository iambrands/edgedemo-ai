import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useDevice } from '../hooks/useDevice';

interface Expiration {
  date: string;
}

const Trade: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useDevice();
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
  
  // Spread state
  const [isSpread, setIsSpread] = useState(false);
  const [spreadAmount, setSpreadAmount] = useState<number | null>(null);
  const [baseStrike, setBaseStrike] = useState('');
  const [longStrike, setLongStrike] = useState('');
  const [shortStrike, setShortStrike] = useState('');
  const [spreadMetrics, setSpreadMetrics] = useState<any>(null);
  const [calculatingSpread, setCalculatingSpread] = useState(false);

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
    // Auto-fetch option price when symbol, expiration, strike, and contract type are all set (single option mode only)
    if (!isSpread && symbol && expiration && strike && contractType) {
      fetchOptionPrice();
    }
  }, [symbol, expiration, strike, contractType, isSpread]);
  
  // Auto-calculate strikes when base strike or spread amount changes
  useEffect(() => {
    if (isSpread && baseStrike && spreadAmount !== null) {
      const base = parseFloat(baseStrike);
      if (!isNaN(base)) {
        const long = base;
        const short = contractType === 'call' 
          ? base + spreadAmount 
          : base - spreadAmount;
        
        setLongStrike(long.toString());
        
        // Only set short strike if it's positive (for puts)
        if (short > 0) {
          setShortStrike(short.toString());
        } else {
          setShortStrike('');
          toast.error('Short strike cannot be negative for put spreads');
        }
      }
    }
  }, [baseStrike, spreadAmount, contractType, isSpread]);

  // Calculate spread metrics when strikes change
  useEffect(() => {
    if (isSpread && symbol && expiration && longStrike && shortStrike && contractType) {
      const debounce = setTimeout(() => {
        calculateSpreadMetrics();
      }, 500);
      
      return () => clearTimeout(debounce);
    } else {
      setSpreadMetrics(null);
    }
  }, [isSpread, symbol, expiration, longStrike, shortStrike, contractType, quantity]);

  const loadAccountBalance = async () => {
    try {
      const response = await api.get('/auth/user');
      setAccountBalance(response.data.user.paper_balance || 0);
    } catch (error) {
      console.error('Failed to load account balance:', error);
    }
  };

  const fetchExpirations = async () => {
    if (!symbol || symbol.length < 1) {
      setExpirations([]);
      setExpiration('');
      return;
    }
    
    setLoadingExpirations(true);
    try {
      const response = await api.get(`/options/expirations/${symbol}`);
      const expirationsList = response.data.expirations || [];
      
      if (expirationsList.length > 0) {
        setExpirations(expirationsList.map((exp: string) => ({ date: exp })));
        // Only auto-set expiration if we don't already have one from tradeData
        if (!expiration) {
          setExpiration(expirationsList[0]);
        }
      } else {
        setExpirations([]);
        if (!expiration) {
          toast.error('No expiration dates found for this symbol');
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch expirations:', error);
      setExpirations([]);
      // Only show error if we don't have an expiration already set
      if (!expiration) {
        const errorMsg = error.response?.data?.error || 'Failed to fetch expirations';
        toast.error(errorMsg);
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
    if (!symbol || !expiration || !strike || !contractType) {
      toast.error('Please fill in Symbol, Expiration, Strike, and Contract Type first');
      return;
    }
    
    setLoadingPrice(true);
    try {
      // Use new dedicated quote endpoint
      const response = await api.post('/options/quote', {
        symbol: symbol.toUpperCase(),
        option_type: contractType,
        strike: parseFloat(strike),
        expiration: expiration
      });
      
      if (response.data.success) {
        // Use mid price (average of bid/ask) or last price
        const midPrice = response.data.mid > 0 ? response.data.mid : response.data.last;
        
        if (midPrice > 0) {
          setPrice(midPrice);
          toast.success(`Fetched price: $${midPrice.toFixed(2)}`);
          
          // Log bid/ask spread for reference
          if (response.data.bid && response.data.ask) {
            const spread = response.data.ask - response.data.bid;
            console.log(`Bid: $${response.data.bid}, Ask: $${response.data.ask}, Spread: $${spread.toFixed(2)}`);
          }
        } else {
          toast.error('Unable to fetch valid option price');
        }
      } else {
        toast.error(response.data.error || 'Failed to fetch option price');
      }
    } catch (error: any) {
      console.error('Failed to fetch option price:', error);
      const errorMsg = error.response?.data?.error || 'Failed to fetch option price. Please try again or enter manually.';
      toast.error(errorMsg);
    } finally {
      setLoadingPrice(false);
    }
  };

  const calculateCost = () => {
    if (!price || !quantity) return 0;
    return price * quantity * 100; // Options are 100 shares per contract
  };

  const calculateSpreadMetrics = async () => {
    if (!symbol || !expiration || !longStrike || !shortStrike || !contractType) {
      return;
    }
    
    setCalculatingSpread(true);
    
    try {
      const response = await api.post('/spreads/calculate', {
        symbol: symbol.toUpperCase(),
        option_type: contractType,
        long_strike: parseFloat(longStrike),
        short_strike: parseFloat(shortStrike),
        expiration: expiration,
        quantity: quantity
      });
      
      if (response.data.success) {
        setSpreadMetrics(response.data);
      } else {
        setSpreadMetrics(null);
      }
    } catch (error: any) {
      console.error('Failed to calculate spread:', error);
      setSpreadMetrics(null);
    } finally {
      setCalculatingSpread(false);
    }
  };
  
  const executeSpread = async () => {
    if (!symbol || !expiration || !longStrike || !shortStrike || !contractType || spreadAmount === null) {
      toast.error('Please fill in all spread fields including spread amount');
      return;
    }

    // Validate strikes
    const long = parseFloat(longStrike);
    const short = parseFloat(shortStrike);
    
    if (isNaN(long) || isNaN(short)) {
      toast.error('Invalid strike prices');
      return;
    }

    // Validate strike increments (must be $0.50 or $1.00)
    if (long % 0.5 !== 0 || short % 0.5 !== 0) {
      toast.error('Strike prices must be in $0.50 increments');
      return;
    }

    // Validate put spread doesn't have negative short strike
    if (contractType === 'put' && short <= 0) {
      toast.error('Short strike cannot be negative for put spreads');
      return;
    }

    // Validate spread width matches
    const calculatedWidth = contractType === 'call' 
      ? short - long 
      : long - short;
    
    if (Math.abs(calculatedWidth - spreadAmount) > 0.01) {
      toast.error(`Spread width mismatch. Expected $${spreadAmount}, got $${calculatedWidth.toFixed(2)}`);
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.post('/spreads/execute', {
        symbol: symbol.toUpperCase(),
        option_type: contractType,
        long_strike: parseFloat(longStrike),
        short_strike: parseFloat(shortStrike),
        expiration: expiration,
        quantity: quantity,
        account_type: 'paper'
      });
      
      if (response.data.success) {
        toast.success(response.data.message || 'Spread executed successfully');
        
        // Reload balance
        await loadAccountBalance();
        
        // Reset form
        setSymbol('');
        setExpiration('');
        setBaseStrike('');
        setSpreadAmount(null);
        setLongStrike('');
        setShortStrike('');
        setStrike('');
        setQuantity(1);
        setPrice(null);
        setIsSpread(false);
        setSpreadMetrics(null);
        
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        toast.error(response.data.error || 'Failed to execute spread');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Spread execution failed';
      console.error('Spread execution error:', error);
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSpread) {
      return executeSpread();
    }
    
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
      
      // Reload balance
      await loadAccountBalance();
      
      // Reset form
      setSymbol('');
      setExpiration('');
      setStrike('');
      setQuantity(1);
      setPrice(null);
      
      // Navigate to Dashboard after successful trade
      // Don't trigger auto-refresh - let user manually refresh or wait 5 minutes
      setTimeout(() => {
        navigate('/');
      }, 1000); // Small delay to show success toast
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Trade execution failed';
      console.error('Trade execution error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Account Balance Card */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-lg shadow-lg p-4 md:p-6">
        <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'}`}>
          <div>
            <p className="text-sm opacity-90 mb-1">Paper Trading Balance</p>
            <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold`}>
              ${accountBalance !== null ? accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'Loading...'}
            </h2>
            <p className="text-sm opacity-75 mt-2">Virtual funds for testing strategies</p>
          </div>
          {!isMobile && <div className="text-6xl opacity-20">💰</div>}
        </div>
      </div>

      {/* Trade Form */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-secondary mb-4 md:mb-6`}>Manual Trade</h1>

        <form onSubmit={handleTrade} className="space-y-4 md:space-y-6">
          {/* Action Selection */}
          <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2'} gap-4`}>
            <button
              type="button"
              onClick={() => setAction('buy')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors min-h-[48px] ${
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
              className={`px-6 py-3 rounded-lg font-medium transition-colors min-h-[48px] ${
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                placeholder="e.g., AAPL"
                maxLength={10}
                required
                style={{ fontSize: '16px' }} // Prevent iOS zoom
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

          {/* Spread Toggle */}
          <div className="border-t pt-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isSpread}
                onChange={(e) => {
                  setIsSpread(e.target.checked);
                  if (e.target.checked) {
                    setPrice(null);
                    setStrike('');
                    setBaseStrike('');
                    setSpreadAmount(null);
                    setLongStrike('');
                    setShortStrike('');
                  } else {
                    setBaseStrike('');
                    setSpreadAmount(null);
                    setLongStrike('');
                    setShortStrike('');
                  }
                }}
                className="w-6 h-6 text-primary border-gray-300 rounded focus:ring-primary min-h-[44px] min-w-[44px]"
              />
              <span className="text-sm font-medium text-gray-700">
                Trade as Debit Spread
              </span>
            </label>
            {isSpread && (
              <p className="mt-1 text-xs text-gray-500">
                {contractType === 'put' 
                  ? 'Buy higher strike, sell lower strike'
                  : 'Buy lower strike, sell higher strike'
                }
              </p>
            )}
          </div>

          {/* Spread Amount Selector - Only show when spread is enabled */}
          {isSpread && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spread Amount *
              </label>
              <select
                value={spreadAmount !== null ? spreadAmount.toString() : ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : null;
                  setSpreadAmount(value);
                  // Recalculate strikes when spread amount changes
                  if (baseStrike && value !== null) {
                    const base = parseFloat(baseStrike);
                    if (!isNaN(base)) {
                      const long = base;
                      const short = contractType === 'call' 
                        ? base + value 
                        : base - value;
                      
                      setLongStrike(long.toString());
                      if (short > 0) {
                        setShortStrike(short.toString());
                      } else {
                        setShortStrike('');
                      }
                    }
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                required
                style={{ fontSize: '16px' }} // Prevent iOS zoom
              >
                <option value="">Select Spread Amount</option>
                <option value="5">$5 Spread</option>
                <option value="10">$10 Spread</option>
                <option value="15">$15 Spread</option>
                <option value="20">$20 Spread</option>
                <option value="25">$25 Spread</option>
                <option value="50">$50 Spread</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Select the width between long and short strikes
              </p>
            </div>
          )}

          {/* Contract Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contract Type *</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setContractType('call');
                  // Recalculate strikes if spread is enabled
                  if (isSpread && baseStrike && spreadAmount !== null) {
                    const base = parseFloat(baseStrike);
                    if (!isNaN(base)) {
                      setLongStrike(base.toString());
                      setShortStrike((base + spreadAmount).toString());
                    }
                  }
                }}
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
                onClick={() => {
                  setContractType('put');
                  // Recalculate strikes if spread is enabled
                  if (isSpread && baseStrike && spreadAmount !== null) {
                    const base = parseFloat(baseStrike);
                    if (!isNaN(base)) {
                      setLongStrike(base.toString());
                      const short = base - spreadAmount;
                      if (short > 0) {
                        setShortStrike(short.toString());
                      } else {
                        setShortStrike('');
                        toast.error('Short strike would be negative. Please adjust base strike or spread amount.');
                      }
                    }
                  }
                }}
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
              onChange={(e) => {
                const newExpiration = e.target.value;
                setExpiration(newExpiration);
                // Clear price when expiration changes to force re-fetch
                if (newExpiration !== expiration) {
                  setPrice(null);
                }
              }}
              disabled={loadingExpirations || !symbol || symbol.length < 1}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-base min-h-[48px]"
              required
              style={{ fontSize: '16px' }} // Prevent iOS zoom
            >
              {loadingExpirations ? (
                <option value="">Loading expiration dates...</option>
              ) : expirations.length === 0 ? (
                <option value="">{symbol ? 'No expirations available' : 'Enter symbol first'}</option>
              ) : (
                <>
                  <option value="">Select expiration</option>
                  {expirations.map((exp) => (
                    <option key={exp.date} value={exp.date}>
                      {exp.date}
                    </option>
                  ))}
                </>
              )}
            </select>
            {loadingExpirations && (
              <p className="mt-1 text-xs text-gray-500">Fetching available expiration dates...</p>
            )}
          </div>

          {/* Spread Fields or Single Strike */}
          {isSpread ? (
            <>
              {/* Base Strike Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Strike (Long Leg) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={baseStrike}
                  onChange={(e) => {
                    const value = e.target.value;
                    setBaseStrike(value);
                    // Auto-calculate strikes
                    if (value && spreadAmount !== null) {
                      const base = parseFloat(value);
                      if (!isNaN(base)) {
                        const long = base;
                        const short = contractType === 'call' 
                          ? base + spreadAmount 
                          : base - spreadAmount;
                        
                        setLongStrike(long.toString());
                        if (short > 0) {
                          setShortStrike(short.toString());
                        } else {
                          setShortStrike('');
                        }
                      }
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                  placeholder="e.g., 180.00"
                  required
                  inputMode="decimal"
                  style={{ fontSize: '16px' }} // Prevent iOS zoom
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the strike price for the long leg (the option you're buying)
                </p>
              </div>

              {/* Auto-Calculated Strikes Display */}
              {baseStrike && spreadAmount !== null && longStrike && shortStrike && (
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      Long Strike (Buy) <span className="text-xs bg-blue-200 px-2 py-1 rounded">Auto-calculated</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={longStrike}
                      readOnly
                      className="w-full px-4 py-2 bg-white border-2 border-blue-300 rounded-lg text-base min-h-[48px] font-semibold text-blue-900"
                      style={{ fontSize: '16px' }}
                    />
                    {spreadMetrics && (
                      <p className="mt-1 text-xs text-blue-700">
                        Premium: ${spreadMetrics.long_premium?.toFixed(2) || '0.00'}
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-green-900 mb-2">
                      Short Strike (Sell) <span className="text-xs bg-green-200 px-2 py-1 rounded">Auto-calculated</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={shortStrike}
                      readOnly
                      className="w-full px-4 py-2 bg-white border-2 border-green-300 rounded-lg text-base min-h-[48px] font-semibold text-green-900"
                      style={{ fontSize: '16px' }}
                    />
                    {spreadMetrics && (
                      <p className="mt-1 text-xs text-green-700">
                        Premium: ${spreadMetrics.short_premium?.toFixed(2) || '0.00'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Spread Preview */}
              {baseStrike && spreadAmount !== null && longStrike && shortStrike && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Spread Preview:</span>
                    <span className="font-semibold text-secondary">
                      Long: ${parseFloat(longStrike).toFixed(2)} | Short: ${parseFloat(shortStrike).toFixed(2)} | Width: ${spreadAmount}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Spread Metrics */}
              {calculatingSpread && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">Calculating spread metrics...</p>
                </div>
              )}
              
              {spreadMetrics && !calculatingSpread && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900">Spread Analysis</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Strike Width</p>
                      <p className="text-lg font-semibold">${spreadMetrics.strike_width?.toFixed(2) || '0.00'}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Net Debit</p>
                      <p className="text-lg font-semibold text-red-600">
                        -${Math.abs(spreadMetrics.net_debit || 0).toFixed(2)}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Max Profit</p>
                      <p className="text-lg font-semibold text-green-600">
                        +${spreadMetrics.max_profit?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Max Loss</p>
                      <p className="text-lg font-semibold text-red-600">
                        -${spreadMetrics.max_loss?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Breakeven</p>
                      <p className="text-lg font-semibold">${spreadMetrics.breakeven?.toFixed(2) || '0.00'}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500">Return on Risk</p>
                      <p className={`text-lg font-semibold ${(spreadMetrics.return_on_risk || 0) > 50 ? 'text-green-600' : 'text-gray-700'}`}>
                        {(spreadMetrics.return_on_risk || 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Strike Price *</label>
              <input
                type="number"
                step="0.01"
                value={strike}
                onChange={(e) => setStrike(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                placeholder="e.g., 150.00"
                required
                inputMode="decimal"
                style={{ fontSize: '16px' }} // Prevent iOS zoom
              />
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (Contracts) *</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
              required
              inputMode="numeric"
              style={{ fontSize: '16px' }} // Prevent iOS zoom
            />
          </div>

          {/* Price (Optional) - Only show for single options */}
          {!isSpread && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price per Contract (Premium) *
              </label>
              <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2`}>
                <input
                  type="number"
                  step="0.01"
                  value={price || ''}
                  onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                  placeholder="e.g., 2.50"
                  required
                  inputMode="decimal"
                  style={{ fontSize: '16px' }} // Prevent iOS zoom
                />
                <button
                  type="button"
                  onClick={fetchOptionPrice}
                  disabled={loadingPrice || !symbol || !expiration || !strike}
                  className={`${isMobile ? 'w-full' : ''} px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[48px]`}
                >
                  {loadingPrice ? '...' : 'Fetch'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {loadingPrice ? 'Fetching current market price...' : 'Click "Fetch" to get current market price, or enter manually'}
              </p>
            </div>
          )}

          {/* Cost Calculation */}
          {!isSpread && price && quantity && (
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
          
          {/* Spread Cost Display */}
          {isSpread && spreadMetrics && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Total Cost (Net Debit):</span>
                <span className="text-2xl font-bold text-secondary">
                  ${Math.abs(spreadMetrics.net_debit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {accountBalance !== null && (
                <p className={`text-sm mt-2 ${Math.abs(spreadMetrics.net_debit || 0) > accountBalance ? 'text-error' : 'text-success'}`}>
                  Balance after: ${(accountBalance - Math.abs(spreadMetrics.net_debit || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              loading || 
              !symbol || 
              !expiration || 
              !quantity || 
              (isSpread 
                ? (!baseStrike || spreadAmount === null || !longStrike || !shortStrike)
                : (!strike || price === null)
              )
            }
            className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-colors min-h-[56px] text-base ${
              isSpread
                ? 'bg-primary hover:bg-indigo-600'
                : action === 'buy'
                  ? 'bg-success hover:bg-green-600'
                  : 'bg-error hover:bg-red-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              'Executing...'
            ) : isSpread ? (
              <>
                Execute Spread
                {spreadMetrics && ` - Debit $${Math.abs(spreadMetrics.net_debit || 0).toFixed(2)}`}
              </>
            ) : (
              `${action === 'buy' ? 'Buy' : 'Sell'} ${quantity} ${contractType.toUpperCase()} Contract(s)`
            )}
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

