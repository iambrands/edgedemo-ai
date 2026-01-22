import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { optionsService } from '../services/options';
import { OptionContract } from '../types/options';
import { watchlistService } from '../services/watchlist';
import api from '../services/api';
import toast from 'react-hot-toast';
import OptionsChainTable from '../components/OptionsChain/OptionsChainTable';
import { useDevice } from '../hooks/useDevice';

type AnalyzerTab = 'single' | 'debit-spread' | 'credit-spread';

// Spread Analysis Interface - supports both debit and credit spreads
interface SpreadAnalysis {
  symbol: string;
  spread_type: string;
  long_strike: number;
  short_strike: number;
  expiration: string;
  long_price: number;
  short_price: number;
  net_debit?: number;   // For debit spreads
  net_credit?: number;  // For credit spreads
  max_profit: number;
  max_loss: number;
  breakeven: number;
  strike_width: number;
  quantity: number;
  total_cost?: number;   // For debit spreads
  total_credit?: number; // For credit spreads
  total_max_profit: number;
  total_max_loss: number;
  ai_analysis?: string;
  is_credit?: boolean;
}

const OptionsAnalyzer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useDevice();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<AnalyzerTab>('single');
  
  // Single options state
  const [symbol, setSymbol] = useState('AAPL');
  const [stockPrice, setStockPrice] = useState<number | null>(null);
  const [expiration, setExpiration] = useState('');
  const [preference, setPreference] = useState<'income' | 'growth' | 'balanced'>('balanced');
  const [expirations, setExpirations] = useState<string[]>([]);
  const [options, setOptions] = useState<OptionContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingExpirations, setLoadingExpirations] = useState(false);
  const [expandedOption, setExpandedOption] = useState<string | null>(null);
  
  // Debit Spread analyzer state
  const [spreadSymbol, setSpreadSymbol] = useState('');
  const [spreadExpiration, setSpreadExpiration] = useState('');
  const [spreadExpirations, setSpreadExpirations] = useState<string[]>([]);
  const [spreadType, setSpreadType] = useState<'bull_call' | 'bear_put'>('bull_call');
  const [longStrike, setLongStrike] = useState('');
  const [shortStrike, setShortStrike] = useState('');
  const [spreadQuantity, setSpreadQuantity] = useState(1);
  const [spreadAnalysis, setSpreadAnalysis] = useState<SpreadAnalysis | null>(null);
  const [spreadLoading, setSpreadLoading] = useState(false);
  const [spreadError, setSpreadError] = useState('');
  const [loadingSpreadExpirations, setLoadingSpreadExpirations] = useState(false);
  const [spreadStockPrice, setSpreadStockPrice] = useState<number | null>(null);
  
  // Credit Spread analyzer state
  const [creditSymbol, setCreditSymbol] = useState('');
  const [creditExpiration, setCreditExpiration] = useState('');
  const [creditExpirations, setCreditExpirations] = useState<string[]>([]);
  const [creditSpreadType, setCreditSpreadType] = useState<'bull_put' | 'bear_call'>('bull_put');
  const [creditLongStrike, setCreditLongStrike] = useState('');
  const [creditShortStrike, setCreditShortStrike] = useState('');
  const [creditQuantity, setCreditQuantity] = useState(1);
  const [creditAnalysis, setCreditAnalysis] = useState<SpreadAnalysis | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditError, setCreditError] = useState('');
  const [loadingCreditExpirations, setLoadingCreditExpirations] = useState(false);
  const [creditStockPrice, setCreditStockPrice] = useState<number | null>(null);

  const fetchExpirations = async () => {
    if (!symbol || symbol.trim().length < 1) return;
    
    const trimmedSymbol = symbol.trim().toUpperCase();
    // Validate symbol format (1-5 uppercase letters)
    if (!/^[A-Z]{1,5}$/.test(trimmedSymbol)) {
      return;
    }
    
    setLoadingExpirations(true);
    try {
      const data = await optionsService.getExpirations(trimmedSymbol);
      console.log('Expirations data:', data);
      console.log('Expirations data type:', typeof data);
      console.log('Expirations data.expirations:', data?.expirations);
      console.log('Is array?', Array.isArray(data?.expirations));
      
      if (data && data.expirations) {
        const expArray = Array.isArray(data.expirations) ? data.expirations : [];
        console.log('Setting expirations:', expArray);
        setExpirations(expArray);
        // Always set the first expiration if available and none is selected
        if (expArray.length > 0) {
          console.log('Setting first expiration to:', expArray[0]);
          setExpiration(prev => {
            if (!prev) {
              console.log('No previous expiration, setting to:', expArray[0]);
              return expArray[0];
            }
            return prev;
          });
        } else {
          console.warn('No expirations in array');
        }
      } else {
        console.warn('Invalid expirations data:', data);
        setExpirations([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch expirations:', error);
      // Only show error if it's not a 404 or validation error
      if (error.response?.status !== 404 && error.response?.status !== 400) {
        toast.error(error.response?.data?.error || 'Failed to fetch expirations');
      }
      setExpirations([]);
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
    setOptions([]); // Clear previous results
    try {
      console.log('Starting analysis for:', { symbol, expiration, preference });
      const data = await optionsService.analyze(symbol, expiration, preference);
      console.log('Analysis response:', data);
      console.log('Options array:', data.options);
      console.log('Options count:', data.count);
      console.log('Options length:', data.options?.length);
      
      if (data.options && Array.isArray(data.options)) {
        setOptions(data.options);
        if (data.options.length > 0) {
          toast.success(`Found ${data.count || data.options.length} options`);
        } else {
          toast('No options found for this expiration', { icon: '⚠️' });
        }
      } else {
        console.error('Invalid response format:', data);
        toast.error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      console.error('Error response:', error.response);
      toast.error(error.response?.data?.error || 'Failed to analyze options');
    } finally {
      setLoading(false);
    }
  };

  const [isInitialMount, setIsInitialMount] = React.useState(true);
  const [symbolFromNav, setSymbolFromNav] = React.useState<string | null>(null);

  // Handle symbol from navigation (runs once when component mounts or location.state changes)
  React.useEffect(() => {
    // Check if symbol was passed from navigation
    if (location.state && location.state.symbol) {
      const navSymbol = location.state.symbol.trim().toUpperCase();
      console.log('Symbol from navigation:', navSymbol);
      if (navSymbol && /^[A-Z]{1,5}$/.test(navSymbol)) {
        setSymbolFromNav(navSymbol);
        setSymbol(navSymbol);
        setIsInitialMount(true); // Set to true so the next useEffect will fetch immediately
      }
    }
  }, [location.state]);

  // Fetch data when symbol changes (including from navigation)
  React.useEffect(() => {
    // Only fetch if symbol is at least 1 character and not just whitespace
    if (symbol && symbol.trim().length >= 1) {
      const trimmedSymbol = symbol.trim().toUpperCase();
      if (trimmedSymbol.length >= 1 && trimmedSymbol.length <= 5 && /^[A-Z]+$/.test(trimmedSymbol)) {
        // On initial mount or when symbol comes from navigation, fetch immediately (no debounce)
        // For subsequent changes, debounce to avoid excessive API calls
        if (isInitialMount || symbolFromNav === trimmedSymbol) {
          console.log('Fetching data for symbol from navigation:', trimmedSymbol);
          fetchExpirations();
          fetchStockPrice();
          setIsInitialMount(false);
          setSymbolFromNav(null); // Clear the flag after first fetch
        } else {
          // Debounce: wait 500ms after user stops typing
          const timeoutId = setTimeout(() => {
            fetchExpirations();
            fetchStockPrice();
          }, 500);
          
          return () => clearTimeout(timeoutId);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, isInitialMount, symbolFromNav]);
  
  // Separate effect to set expiration when expirations are loaded
  React.useEffect(() => {
    console.log('Expirations effect triggered:', { 
      expirations, 
      expiration, 
      expirationsLength: expirations.length,
      firstExpiration: expirations[0],
      currentExpirationValue: expiration
    });
    if (expirations.length > 0) {
      // If no expiration is set, or current expiration is not in the list, set to first
      if (!expiration || !expirations.includes(expiration)) {
        console.log('Auto-selecting first expiration:', expirations[0]);
        setExpiration(expirations[0]);
      }
    } else {
      // Clear expiration if no expirations available
      if (expiration) {
        setExpiration('');
      }
    }
  }, [expirations]); // Remove expiration from dependencies to avoid loops

  const fetchStockPrice = async () => {
    if (!symbol || symbol.trim().length < 1) return;
    
    const trimmedSymbol = symbol.trim().toUpperCase();
    // Validate symbol format (1-5 uppercase letters)
    if (!/^[A-Z]{1,5}$/.test(trimmedSymbol)) {
      return;
    }
    
    try {
      const response = await api.get(`/options/quote/${trimmedSymbol}`);
      if (response.data && response.data.current_price) {
        setStockPrice(response.data.current_price);
      }
    } catch (error: any) {
      // Log the error for debugging but don't show toast for 404s (expected for invalid symbols)
      const status = error.response?.status;
      const errorMsg = error.response?.data?.error || error.message;
      
      if (status === 404) {
        // 404 is expected for invalid symbols or when quote service is unavailable
        console.debug(`Quote not available for ${trimmedSymbol}:`, errorMsg);
      } else if (status === 401) {
        // 401 means user needs to authenticate - this shouldn't happen on Options Analyzer
        console.warn('Authentication required for quote:', errorMsg);
      } else if (status === 500) {
        // Server error - might be Tradier/Yahoo issue
        console.warn('Quote service error:', errorMsg);
      } else if (status) {
        // Other HTTP errors
        console.warn(`Failed to fetch stock price (${status}):`, errorMsg);
      }
      // Don't set stockPrice to null on error - keep previous value if available
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

  const handleTradeFromRecommendation = (option: OptionContract) => {
    // Extract symbol from option_symbol if needed
    let stockSymbol = symbol;
    if (!stockSymbol && option.option_symbol) {
      // Try to extract symbol from option_symbol (format: SYMBOL_DATE_TYPE_STRIKE)
      const parts = option.option_symbol.split('_');
      if (parts.length > 0) {
        stockSymbol = parts[0];
      }
    }
    
    // Store trade data in sessionStorage to pass to Trade page
    const tradeData = {
      symbol: stockSymbol || 'AAPL', // Fallback to AAPL if can't determine
      expiration: option.expiration_date || expiration,
      strike: option.strike ? option.strike.toString() : '',
      contractType: option.contract_type || 'call',
      price: option.mid_price || option.last_price || 0,
      quantity: 1
    };
    
    console.log('Storing trade data:', tradeData);
    sessionStorage.setItem('tradeData', JSON.stringify(tradeData));
    navigate('/trade');
    toast.success('Trade details loaded! Review and execute on the Trade page.');
  };

  const handleAddToWatchlistFromRecommendation = async (option: OptionContract) => {
    const stockSymbol = symbol || option.option_symbol.split('_')[0];
    try {
      await watchlistService.addStock(stockSymbol);
      toast.success(`${stockSymbol} added to watchlist!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add to watchlist');
    }
  };

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  // ============ SPREAD ANALYZER FUNCTIONS ============
  
  const fetchSpreadExpirations = async () => {
    if (!spreadSymbol || spreadSymbol.trim().length < 1) return;
    
    const trimmedSymbol = spreadSymbol.trim().toUpperCase();
    if (!/^[A-Z]{1,5}$/.test(trimmedSymbol)) return;
    
    setLoadingSpreadExpirations(true);
    try {
      const data = await optionsService.getExpirations(trimmedSymbol);
      if (data && data.expirations) {
        const expArray = Array.isArray(data.expirations) ? data.expirations : [];
        setSpreadExpirations(expArray);
        if (expArray.length > 0 && !spreadExpiration) {
          setSpreadExpiration(expArray[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch spread expirations:', error);
      setSpreadExpirations([]);
    } finally {
      setLoadingSpreadExpirations(false);
    }
  };

  const fetchSpreadStockPrice = async () => {
    if (!spreadSymbol || spreadSymbol.trim().length < 1) return;
    
    const trimmedSymbol = spreadSymbol.trim().toUpperCase();
    if (!/^[A-Z]{1,5}$/.test(trimmedSymbol)) return;
    
    try {
      const response = await api.get(`/options/quote/${trimmedSymbol}`);
      if (response.data && response.data.current_price) {
        setSpreadStockPrice(response.data.current_price);
      }
    } catch (error) {
      console.error('Failed to fetch spread stock price:', error);
    }
  };

  // Fetch spread expirations when symbol changes
  useEffect(() => {
    if (spreadSymbol && spreadSymbol.trim().length >= 1) {
      const trimmedSymbol = spreadSymbol.trim().toUpperCase();
      if (/^[A-Z]+$/.test(trimmedSymbol)) {
        const timeoutId = setTimeout(() => {
          fetchSpreadExpirations();
          fetchSpreadStockPrice();
        }, 500);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [spreadSymbol]);

  const analyzeSpread = async () => {
    if (!spreadSymbol || !spreadExpiration || !longStrike || !shortStrike) {
      setSpreadError('Please fill in all fields');
      return;
    }

    const long = parseFloat(longStrike);
    const short = parseFloat(shortStrike);

    // Validate spread structure
    if (spreadType === 'bull_call') {
      if (long >= short) {
        setSpreadError('For bull call spread, long strike must be lower than short strike');
        return;
      }
    } else {
      if (long <= short) {
        setSpreadError('For bear put spread, long strike must be higher than short strike');
        return;
      }
    }

    setSpreadLoading(true);
    setSpreadError('');
    setSpreadAnalysis(null);

    try {
      // Use the existing /spreads/calculate endpoint
      const response = await api.post('/spreads/calculate', {
        symbol: spreadSymbol.toUpperCase(),
        option_type: spreadType === 'bull_call' ? 'call' : 'put',
        long_strike: long,
        short_strike: short,
        expiration: spreadExpiration,
        quantity: spreadQuantity
      });

      if (response.data.success) {
        // Now get AI analysis for the spread
        let aiAnalysis = '';
        try {
          const aiResponse = await api.post('/options/analyze-spread-ai', {
            symbol: spreadSymbol.toUpperCase(),
            spread_type: spreadType,
            long_strike: long,
            short_strike: short,
            expiration: spreadExpiration,
            net_debit: response.data.net_debit,
            max_profit: response.data.max_profit,
            max_loss: response.data.max_loss,
            breakeven: response.data.breakeven,
            current_price: spreadStockPrice,
            long_price: response.data.long_premium,
            short_price: response.data.short_premium
          });
          aiAnalysis = aiResponse.data.analysis || '';
        } catch (aiError) {
          console.warn('AI analysis not available:', aiError);
        }

        setSpreadAnalysis({
          symbol: spreadSymbol.toUpperCase(),
          spread_type: spreadType,
          long_strike: long,
          short_strike: short,
          expiration: spreadExpiration,
          long_price: response.data.long_premium || 0,
          short_price: response.data.short_premium || 0,
          net_debit: response.data.net_debit || 0,
          max_profit: response.data.max_profit || 0,
          max_loss: response.data.max_loss || 0,
          breakeven: response.data.breakeven || 0,
          strike_width: response.data.strike_width || Math.abs(short - long),
          quantity: spreadQuantity,
          total_cost: (response.data.net_debit || 0) * spreadQuantity * 100,
          total_max_profit: (response.data.max_profit || 0) * spreadQuantity * 100,
          total_max_loss: (response.data.max_loss || 0) * spreadQuantity * 100,
          ai_analysis: aiAnalysis
        });
      } else {
        setSpreadError(response.data.error || 'Failed to analyze spread');
      }
    } catch (error: any) {
      console.error('Spread analysis error:', error);
      setSpreadError(error.response?.data?.error || 'Failed to analyze spread');
    } finally {
      setSpreadLoading(false);
    }
  };

  const handleCreateSpread = () => {
    if (!spreadAnalysis) return;

    // Store spread data to pass to Trade page
    const tradeData = {
      symbol: spreadAnalysis.symbol,
      expiration: spreadAnalysis.expiration,
      isSpread: true,
      spreadType: spreadAnalysis.spread_type,
      longStrike: spreadAnalysis.long_strike.toString(),
      shortStrike: spreadAnalysis.short_strike.toString(),
      contractType: spreadAnalysis.spread_type === 'bull_call' ? 'call' : 'put',
      quantity: spreadAnalysis.quantity
    };

    sessionStorage.setItem('spreadTradeData', JSON.stringify(tradeData));
    navigate('/trade');
    toast.success('Spread details loaded! Review and execute on the Trade page.');
  };

  // ============ END DEBIT SPREAD ANALYZER FUNCTIONS ============

  // ============ CREDIT SPREAD ANALYZER FUNCTIONS ============
  
  const fetchCreditExpirations = async () => {
    if (!creditSymbol || creditSymbol.trim().length < 1) return;
    
    const trimmedSymbol = creditSymbol.trim().toUpperCase();
    if (!/^[A-Z]{1,5}$/.test(trimmedSymbol)) return;
    
    setLoadingCreditExpirations(true);
    try {
      const data = await optionsService.getExpirations(trimmedSymbol);
      if (data && data.expirations) {
        const expArray = Array.isArray(data.expirations) ? data.expirations : [];
        setCreditExpirations(expArray);
        if (expArray.length > 0 && !creditExpiration) {
          setCreditExpiration(expArray[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch credit expirations:', error);
      setCreditExpirations([]);
    } finally {
      setLoadingCreditExpirations(false);
    }
  };

  const fetchCreditStockPrice = async () => {
    if (!creditSymbol || creditSymbol.trim().length < 1) return;
    
    const trimmedSymbol = creditSymbol.trim().toUpperCase();
    if (!/^[A-Z]{1,5}$/.test(trimmedSymbol)) return;
    
    try {
      const response = await api.get(`/options/quote/${trimmedSymbol}`);
      if (response.data && response.data.current_price) {
        setCreditStockPrice(response.data.current_price);
      }
    } catch (error) {
      console.error('Failed to fetch credit stock price:', error);
    }
  };

  // Fetch credit expirations when symbol changes
  useEffect(() => {
    if (creditSymbol && creditSymbol.trim().length >= 1) {
      const trimmedSymbol = creditSymbol.trim().toUpperCase();
      if (/^[A-Z]+$/.test(trimmedSymbol)) {
        const timeoutId = setTimeout(() => {
          fetchCreditExpirations();
          fetchCreditStockPrice();
        }, 500);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [creditSymbol]);

  const analyzeCreditSpread = async () => {
    if (!creditSymbol || !creditExpiration || !creditLongStrike || !creditShortStrike) {
      setCreditError('Please fill in all fields');
      return;
    }

    const long = parseFloat(creditLongStrike);
    const short = parseFloat(creditShortStrike);

    // Validate credit spread structure
    if (creditSpreadType === 'bull_put') {
      // Bull Put: Sell higher put, buy lower put for protection
      if (short <= long) {
        setCreditError('For bull put spread, short strike must be higher than long strike');
        return;
      }
    } else {
      // Bear Call: Sell lower call, buy higher call for protection
      if (short >= long) {
        setCreditError('For bear call spread, short strike must be lower than long strike');
        return;
      }
    }

    setCreditLoading(true);
    setCreditError('');
    setCreditAnalysis(null);

    try {
      // Use the /spreads/calculate-credit endpoint
      const response = await api.post('/spreads/calculate-credit', {
        symbol: creditSymbol.toUpperCase(),
        option_type: creditSpreadType === 'bull_put' ? 'put' : 'call',
        spread_type: creditSpreadType,
        long_strike: long,
        short_strike: short,
        expiration: creditExpiration,
        quantity: creditQuantity
      });

      if (response.data.success) {
        // Get AI analysis for the credit spread
        let aiAnalysis = '';
        try {
          const aiResponse = await api.post('/options/analyze-spread-ai', {
            symbol: creditSymbol.toUpperCase(),
            spread_type: creditSpreadType,
            long_strike: long,
            short_strike: short,
            expiration: creditExpiration,
            net_credit: response.data.net_credit,
            max_profit: response.data.max_profit,
            max_loss: response.data.max_loss,
            breakeven: response.data.breakeven,
            current_price: creditStockPrice,
            long_price: response.data.long_premium,
            short_price: response.data.short_premium,
            is_credit: true
          });
          aiAnalysis = aiResponse.data.analysis || '';
        } catch (aiError) {
          console.warn('AI analysis not available:', aiError);
        }

        setCreditAnalysis({
          symbol: creditSymbol.toUpperCase(),
          spread_type: creditSpreadType,
          long_strike: long,
          short_strike: short,
          expiration: creditExpiration,
          long_price: response.data.long_premium || 0,
          short_price: response.data.short_premium || 0,
          net_credit: response.data.net_credit || 0,
          max_profit: response.data.max_profit || 0,
          max_loss: response.data.max_loss || 0,
          breakeven: response.data.breakeven || 0,
          strike_width: response.data.strike_width || Math.abs(short - long),
          quantity: creditQuantity,
          total_credit: (response.data.net_credit || 0) * creditQuantity * 100,
          total_max_profit: (response.data.max_profit || 0) * creditQuantity * 100,
          total_max_loss: (response.data.max_loss || 0) * creditQuantity * 100,
          ai_analysis: aiAnalysis,
          is_credit: true
        });
      } else {
        setCreditError(response.data.error || 'Failed to analyze credit spread');
      }
    } catch (error: any) {
      console.error('Credit spread analysis error:', error);
      setCreditError(error.response?.data?.error || 'Failed to analyze credit spread');
    } finally {
      setCreditLoading(false);
    }
  };

  const handleCreateCreditSpread = () => {
    if (!creditAnalysis) return;

    // Store credit spread data to pass to Trade page
    const tradeData = {
      symbol: creditAnalysis.symbol,
      expiration: creditAnalysis.expiration,
      isSpread: true,
      isCreditSpread: true,
      spreadType: creditAnalysis.spread_type,
      longStrike: creditAnalysis.long_strike.toString(),
      shortStrike: creditAnalysis.short_strike.toString(),
      contractType: creditAnalysis.spread_type === 'bull_put' ? 'put' : 'call',
      quantity: creditAnalysis.quantity
    };

    sessionStorage.setItem('creditSpreadTradeData', JSON.stringify(tradeData));
    navigate('/trade');
    toast.success('Credit spread details loaded! Review and execute on the Trade page.');
  };

  // ============ END CREDIT SPREAD ANALYZER FUNCTIONS ============

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-secondary mb-4`}>Options Analyzer</h1>
        
        {/* Tab Navigation */}
        <div className="flex gap-1 md:gap-2 border-b-2 border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-3 md:px-6 py-2 md:py-3 font-medium text-sm md:text-base border-b-3 transition-colors ${
              activeTab === 'single'
                ? 'text-primary border-b-2 border-primary -mb-[2px]'
                : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent -mb-[2px]'
            }`}
          >
            Single Options
          </button>
          <button
            onClick={() => setActiveTab('debit-spread')}
            className={`px-3 md:px-6 py-2 md:py-3 font-medium text-sm md:text-base border-b-3 transition-colors ${
              activeTab === 'debit-spread'
                ? 'text-primary border-b-2 border-primary -mb-[2px]'
                : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent -mb-[2px]'
            }`}
          >
            Debit Spreads
          </button>
          <button
            onClick={() => setActiveTab('credit-spread')}
            className={`px-3 md:px-6 py-2 md:py-3 font-medium text-sm md:text-base border-b-3 transition-colors ${
              activeTab === 'credit-spread'
                ? 'text-primary border-b-2 border-primary -mb-[2px]'
                : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent -mb-[2px]'
            }`}
          >
            Credit Spreads
          </button>
        </div>
      </div>

      {/* Single Options Tab */}
      {activeTab === 'single' && (
      <>
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} mb-4 md:mb-6 gap-4`}>
          <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-secondary`}>Options Chain Analyzer</h2>
          {stockPrice !== null && (
            <div className={`flex ${isMobile ? 'flex-col' : 'items-center'} gap-4`}>
              <div className={`text-${isMobile ? 'left' : 'right'}`}>
                <p className="text-sm text-gray-500">Stock Price</p>
                <p className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-secondary`}>${stockPrice.toFixed(2)}</p>
              </div>
              <button
                onClick={handleAddToWatchlist}
                className={`${isMobile ? 'w-full' : ''} px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors font-medium text-sm min-h-[44px]`}
              >
                Add to Watchlist
              </button>
            </div>
          )}
        </div>

        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'} gap-4 mb-4 md:mb-6`}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
            <form onSubmit={handleSymbolSubmit}>
              <input
                type="text"
                value={symbol}
                onChange={handleSymbolChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                placeholder="Enter symbol (e.g., AAPL)"
                maxLength={10}
                style={{ fontSize: '16px' }} // Prevent iOS zoom
              />
            </form>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expiration</label>
            <select
              value={expiration}
              onChange={(e) => {
                console.log('Expiration changed to:', e.target.value);
                setExpiration(e.target.value);
              }}
              disabled={loadingExpirations || expirations.length === 0}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 text-base min-h-[48px]"
              style={{ fontSize: '16px' }} // Prevent iOS zoom
            >
              {loadingExpirations ? (
                <option value="">Loading...</option>
              ) : expirations.length === 0 ? (
                <option value="">No expirations available</option>
              ) : (
                <>
                  {!expiration && <option value="">Select expiration</option>}
                  {expirations.map((exp) => (
                    <option key={exp} value={exp}>
                      {exp}
                    </option>
                  ))}
                </>
              )}
            </select>
            {expiration && (
              <p className="mt-1 text-xs text-gray-500">
                Selected: {expiration}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Strategy Preference</label>
            <select
              value={preference}
              onChange={(e) => setPreference(e.target.value as 'income' | 'growth' | 'balanced')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
              style={{ fontSize: '16px' }} // Prevent iOS zoom
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
          className={`${isMobile ? 'w-full' : ''} bg-primary text-white px-6 py-3 rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-base`}
        >
          {loading ? 'Analyzing...' : 'Analyze Options'}
        </button>
      </div>

      {options.length > 0 && (
        <>
          {/* Top Recommendations Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">🎯 Top Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {options
                .sort((a, b) => b.score - a.score)
                .slice(0, 6)
                .map((option) => (
                  <div
                    key={option.option_symbol}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          option.contract_type === 'call' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {option.contract_type.toUpperCase()}
                        </span>
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          ${option.strike.toFixed(2)}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-primary">
                        {(option.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    
                    {option.ai_analysis && option.ai_analysis.recommendation ? (
                      <>
                        <div className="mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-600">Recommendation:</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              option.ai_analysis.recommendation.action === 'buy'
                                ? 'bg-green-100 text-green-800'
                                : option.ai_analysis.recommendation.action === 'consider'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {option.ai_analysis.recommendation.action.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {option.ai_analysis.recommendation.reasoning}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          <div>
                            <span className="text-gray-500">Risk:</span>
                            <span className={`ml-1 font-semibold ${
                              option.ai_analysis.risk_assessment?.overall_risk_level === 'high'
                                ? 'text-red-600'
                                : option.ai_analysis.risk_assessment?.overall_risk_level === 'moderate'
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}>
                              {option.ai_analysis.risk_assessment?.overall_risk_level?.toUpperCase() || 'MODERATE'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Price:</span>
                            <span className="ml-1 font-semibold">${option.mid_price.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        {option.ai_analysis.trade_analysis?.best_case && (
                          <div className="text-xs text-gray-500 line-clamp-1 mb-3">
                            {option.ai_analysis.trade_analysis.best_case}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="mb-2">
                        <div className="text-xs text-gray-600 mb-2">
                          <span className="font-semibold">Category:</span> {option.category || 'N/A'}
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {option.explanation || 'Analysis available in details view.'}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                          <div>
                            <span className="text-gray-500">Price:</span>
                            <span className="ml-1 font-semibold">${option.mid_price.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Volume:</span>
                            <span className="ml-1 font-semibold">{option.volume || 0}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => setExpandedOption(expandedOption === option.option_symbol ? null : option.option_symbol)}
                      className="w-full px-3 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 font-medium text-xs transition-colors mt-2"
                    >
                      {expandedOption === option.option_symbol ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                ))}
            </div>
            
            {options.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                No options found for this expiration date.
              </p>
            )}

            {/* Expanded Details for Top Recommendations */}
            {expandedOption && options.find(opt => opt.option_symbol === expandedOption) && (() => {
              const option = options.find(opt => opt.option_symbol === expandedOption)!;
              return (
                <div className="mt-6 bg-gray-50 rounded-lg p-6 border-2 border-primary">
                  <div className="space-y-4">
                    {/* Quick Analysis - Formatted */}
                    {option.ai_analysis && option.ai_analysis.recommendation ? (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-lg border-2 border-blue-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-lg text-secondary flex items-center gap-2">
                            <span className="text-2xl">🤖</span>
                            AI-Powered Quick Analysis
                          </h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            option.ai_analysis.recommendation.action === 'buy'
                              ? 'bg-green-500 text-white'
                              : option.ai_analysis.recommendation.action === 'consider'
                              ? 'bg-blue-500 text-white'
                              : option.ai_analysis.recommendation.action === 'consider_carefully'
                              ? 'bg-yellow-500 text-white'
                              : 'bg-red-500 text-white'
                          }`}>
                            {option.ai_analysis.recommendation.action.toUpperCase().replace('_', ' ')}
                          </span>
                        </div>
                        
                        {/* Recommendation Card */}
                        <div className="bg-white rounded-lg p-4 mb-4 border-l-4 border-blue-500">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-semibold text-gray-700">Recommendation:</span>
                                <span className="text-sm font-bold text-blue-600">
                                  {option.ai_analysis.recommendation.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                                <span className="text-xs text-gray-500">
                                  (Confidence: {option.ai_analysis.recommendation.confidence.charAt(0).toUpperCase() + option.ai_analysis.recommendation.confidence.slice(1)})
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {option.ai_analysis.recommendation.reasoning}
                              </p>
                              <div className="mt-2 text-xs text-gray-600">
                                <span className="font-medium">Suitability:</span> {option.ai_analysis.recommendation.suitability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Key Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">Risk Level</div>
                            <div className={`text-sm font-bold ${
                              option.ai_analysis.risk_assessment?.overall_risk_level === 'high'
                                ? 'text-red-600'
                                : option.ai_analysis.risk_assessment?.overall_risk_level === 'moderate'
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}>
                              {option.ai_analysis.risk_assessment?.overall_risk_level?.toUpperCase() || 'MODERATE'}
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">Score</div>
                            <div className="text-sm font-bold text-blue-600">
                              {(option.score * 100).toFixed(1)}%
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">Days to Expiry</div>
                            <div className="text-sm font-bold text-gray-700">
                              {option.days_to_expiration} days
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs text-gray-500 mb-1">Break-Even</div>
                            <div className="text-sm font-bold text-gray-700">
                              {option.ai_analysis.trade_analysis?.break_even?.split(':')[1]?.trim().split(' ')[0] || 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* Quick Summary */}
                        {option.ai_analysis.trade_analysis && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h5 className="font-semibold text-sm text-gray-700 mb-2">📋 Quick Summary</h5>
                            <div className="space-y-2 text-sm">
                              {option.ai_analysis.trade_analysis.best_case && (
                                <div className="flex items-start gap-2">
                                  <span className="text-green-600 font-semibold min-w-[80px]">✓ Best Case:</span>
                                  <span className="text-gray-700">{option.ai_analysis.trade_analysis.best_case}</span>
                                </div>
                              )}
                              {option.ai_analysis.trade_analysis.worst_case && (
                                <div className="flex items-start gap-2">
                                  <span className="text-red-600 font-semibold min-w-[80px]">✗ Worst Case:</span>
                                  <span className="text-gray-700">{option.ai_analysis.trade_analysis.worst_case}</span>
                                </div>
                              )}
                              {option.ai_analysis.trade_analysis.time_considerations && (
                                <div className="flex items-start gap-2">
                                  <span className="text-orange-600 font-semibold min-w-[80px]">⏰ Time:</span>
                                  <span className="text-gray-700">{option.ai_analysis.trade_analysis.time_considerations}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Detailed AI Analysis Sections */}
                    {option.ai_analysis && option.ai_analysis.greeks_explanation ? (
                      <>
                        {/* Greeks Explanation */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h4 className="font-semibold text-secondary mb-3">📚 Understanding the Greeks</h4>
                          <div className="space-y-3 text-sm">
                            <div className="border-l-4 border-blue-500 pl-3">
                              <strong className="text-blue-700">Delta ({option.delta.toFixed(4)}):</strong>
                              <p className="text-gray-700 mt-1">{option.ai_analysis.greeks_explanation.delta}</p>
                            </div>
                            <div className="border-l-4 border-purple-500 pl-3">
                              <strong className="text-purple-700">Gamma ({option.gamma.toFixed(4)}):</strong>
                              <p className="text-gray-700 mt-1">{option.ai_analysis.greeks_explanation.gamma}</p>
                            </div>
                            <div className="border-l-4 border-red-500 pl-3">
                              <strong className="text-red-700">Theta ({option.theta.toFixed(4)}):</strong>
                              <p className="text-gray-700 mt-1">{option.ai_analysis.greeks_explanation.theta}</p>
                            </div>
                            <div className="border-l-4 border-green-500 pl-3">
                              <strong className="text-green-700">Vega ({option.vega.toFixed(4)}):</strong>
                              <p className="text-gray-700 mt-1">{option.ai_analysis.greeks_explanation.vega}</p>
                            </div>
                            <div className="border-l-4 border-orange-500 pl-3">
                              <strong className="text-orange-700">Implied Volatility ({formatPercent(option.implied_volatility * 100)}):</strong>
                              <p className="text-gray-700 mt-1">{option.ai_analysis.greeks_explanation.implied_volatility}</p>
                            </div>
                          </div>
                        </div>

                        {/* Trade Analysis */}
                        {option.ai_analysis.trade_analysis && (
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <h4 className="font-semibold text-secondary mb-3">💡 Trade Analysis</h4>
                            <div className="space-y-2 text-sm">
                              <p><strong>Overview:</strong> {option.ai_analysis.trade_analysis.overview}</p>
                              <p className="text-green-700"><strong>Best Case:</strong> {option.ai_analysis.trade_analysis.best_case}</p>
                              <p className="text-red-700"><strong>Worst Case:</strong> {option.ai_analysis.trade_analysis.worst_case}</p>
                              <p><strong>Break-Even:</strong> {option.ai_analysis.trade_analysis.break_even}</p>
                              <p><strong>Profit Potential:</strong> {option.ai_analysis.trade_analysis.profit_potential}</p>
                              <p className="text-orange-700"><strong>Time:</strong> {option.ai_analysis.trade_analysis.time_considerations}</p>
                            </div>
                          </div>
                        )}

                        {/* Risk Assessment */}
                        {option.ai_analysis.risk_assessment && (
                          <div className={`p-4 rounded-lg border ${
                            option.ai_analysis.risk_assessment.overall_risk_level === 'high'
                              ? 'bg-red-50 border-red-300'
                              : option.ai_analysis.risk_assessment.overall_risk_level === 'moderate'
                              ? 'bg-yellow-50 border-yellow-300'
                              : 'bg-green-50 border-green-300'
                          }`}>
                            <h4 className="font-semibold mb-2">
                              ⚠️ Risk Assessment: {option.ai_analysis.risk_assessment.overall_risk_level.toUpperCase()}
                            </h4>
                            {option.ai_analysis.risk_assessment.warnings && option.ai_analysis.risk_assessment.warnings.length > 0 && (
                              <div className="mb-2">
                                {option.ai_analysis.risk_assessment.warnings.map((warning, idx) => (
                                  <p key={idx} className="text-sm text-red-700 mb-1">{warning}</p>
                                ))}
                              </div>
                            )}
                            {option.ai_analysis.risk_assessment.risk_factors && (
                              <div className="text-sm">
                                <strong>Risk Factors:</strong>
                                <ul className="list-disc list-inside mt-1">
                                  {option.ai_analysis.risk_assessment.risk_factors.map((factor, idx) => (
                                    <li key={idx} className="text-gray-700">{factor}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-secondary mb-3">📊 Option Details</h4>
                        <div className="space-y-3 text-sm">
                          <div>
                            <strong>Category:</strong> {option.category || 'N/A'}
                          </div>
                          <div>
                            <strong>Explanation:</strong> {option.explanation || 'No detailed explanation available.'}
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <strong>Delta:</strong> {option.delta.toFixed(4)}
                            </div>
                            <div>
                              <strong>Gamma:</strong> {option.gamma.toFixed(4)}
                            </div>
                            <div>
                              <strong>Theta:</strong> {option.theta.toFixed(4)}
                            </div>
                            <div>
                              <strong>Vega:</strong> {option.vega.toFixed(4)}
                            </div>
                            <div>
                              <strong>IV:</strong> {formatPercent(option.implied_volatility * 100)}
                            </div>
                            <div>
                              <strong>Volume:</strong> {option.volume || 0}
                            </div>
                          </div>
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <p className="text-sm text-yellow-800">
                              <strong>Note:</strong> AI-powered analysis is currently unavailable. Basic analysis and scoring are still provided.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => handleTradeFromRecommendation(option)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 text-sm font-medium transition-colors"
                      >
                        Trade
                      </button>
                      <button 
                        onClick={() => handleAddToWatchlistFromRecommendation(option)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium transition-colors"
                      >
                        Add to Watchlist
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Full Options Chain Table */}
          <div className="bg-white rounded-lg shadow">
            <OptionsChainTable 
              options={options} 
              symbol={symbol} 
              expiration={expiration}
              stockPrice={stockPrice}
            />
          </div>
        </>
      )}
      </>
      )}

      {/* Debit Spread Tab */}
      {activeTab === 'debit-spread' && (
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} mb-4 md:mb-6 gap-4`}>
            <div>
              <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-secondary`}>Debit Spread Analyzer</h2>
              <p className="text-sm text-gray-500 mt-1">Analyze bull call or bear put spreads with defined risk/reward</p>
            </div>
            {spreadStockPrice !== null && (
              <div className={`text-${isMobile ? 'left' : 'right'}`}>
                <p className="text-sm text-gray-500">Stock Price</p>
                <p className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-secondary`}>${spreadStockPrice.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Spread Form */}
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-4 mb-6`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
              <input
                type="text"
                value={spreadSymbol}
                onChange={(e) => {
                  setSpreadSymbol(e.target.value.toUpperCase());
                  setSpreadExpiration('');
                  setSpreadAnalysis(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                placeholder="TSLA"
                maxLength={5}
                style={{ fontSize: '16px' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expiration</label>
              <select
                value={spreadExpiration}
                onChange={(e) => setSpreadExpiration(e.target.value)}
                disabled={loadingSpreadExpirations || spreadExpirations.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 text-base min-h-[48px]"
                style={{ fontSize: '16px' }}
              >
                {loadingSpreadExpirations ? (
                  <option value="">Loading...</option>
                ) : spreadExpirations.length === 0 ? (
                  <option value="">Enter symbol first</option>
                ) : (
                  <>
                    {!spreadExpiration && <option value="">Select expiration</option>}
                    {spreadExpirations.map((exp) => (
                      <option key={exp} value={exp}>{exp}</option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Spread Type</label>
              <select
                value={spreadType}
                onChange={(e) => {
                  setSpreadType(e.target.value as 'bull_call' | 'bear_put');
                  setLongStrike('');
                  setShortStrike('');
                  setSpreadAnalysis(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                style={{ fontSize: '16px' }}
              >
                <option value="bull_call">Bull Call Spread (Bullish)</option>
                <option value="bear_put">Bear Put Spread (Bearish)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Long Strike (BUY) 
                <span className="text-green-600 ml-1">▲</span>
              </label>
              <input
                type="number"
                value={longStrike}
                onChange={(e) => setLongStrike(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                placeholder={spreadType === 'bull_call' ? '430 (lower)' : '440 (higher)'}
                step="0.50"
                style={{ fontSize: '16px' }}
              />
              <p className="text-xs text-gray-500 mt-1">
                {spreadType === 'bull_call' ? 'Lower strike (you buy this call)' : 'Higher strike (you buy this put)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Short Strike (SELL)
                <span className="text-red-600 ml-1">▼</span>
              </label>
              <input
                type="number"
                value={shortStrike}
                onChange={(e) => setShortStrike(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                placeholder={spreadType === 'bull_call' ? '440 (higher)' : '430 (lower)'}
                step="0.50"
                style={{ fontSize: '16px' }}
              />
              <p className="text-xs text-gray-500 mt-1">
                {spreadType === 'bull_call' ? 'Higher strike (you sell this call)' : 'Lower strike (you sell this put)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                value={spreadQuantity}
                onChange={(e) => setSpreadQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                min={1}
                max={100}
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          {spreadError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {spreadError}
            </div>
          )}

          <button
            onClick={analyzeSpread}
            disabled={spreadLoading || !spreadSymbol || !spreadExpiration || !longStrike || !shortStrike}
            className={`${isMobile ? 'w-full' : ''} bg-primary text-white px-6 py-3 rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-base`}
          >
            {spreadLoading ? 'Analyzing...' : 'Analyze Spread'}
          </button>

          {/* Spread Analysis Results */}
          {spreadAnalysis && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-bold text-secondary mb-4">Spread Analysis Results</h3>
              
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-6`}>
                {/* Position Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Position Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Symbol:</span>
                      <span className="font-medium">{spreadAnalysis.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">
                        <span className={`px-2 py-1 rounded text-xs ${
                          spreadAnalysis.spread_type === 'bull_call' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {spreadAnalysis.spread_type === 'bull_call' ? 'Bull Call Spread' : 'Bear Put Spread'}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Long Strike:</span>
                      <span className="font-medium text-green-600">${spreadAnalysis.long_strike.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Short Strike:</span>
                      <span className="font-medium text-red-600">${spreadAnalysis.short_strike.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Strike Width:</span>
                      <span className="font-medium">${spreadAnalysis.strike_width.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expiration:</span>
                      <span className="font-medium">{spreadAnalysis.expiration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="font-medium">{spreadAnalysis.quantity} spread(s)</span>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Pricing</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Long Leg Cost:</span>
                      <span className="font-medium">${spreadAnalysis.long_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Short Leg Credit:</span>
                      <span className="font-medium">-${spreadAnalysis.short_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-700 font-semibold">Net Debit (per spread):</span>
                      <span className="font-bold">${(spreadAnalysis.net_debit || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between bg-blue-50 p-2 rounded -mx-2 mt-2">
                      <span className="text-blue-700 font-semibold">Total Cost:</span>
                      <span className="font-bold text-blue-700">${(spreadAnalysis.total_cost || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Risk/Reward */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Risk/Reward</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Profit (per spread):</span>
                      <span className="font-medium text-green-600">${spreadAnalysis.max_profit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Loss (per spread):</span>
                      <span className="font-medium text-red-600">${spreadAnalysis.max_loss.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600">ROI if Max Profit:</span>
                      <span className="font-bold text-green-600">
                        {(spreadAnalysis.net_debit || 0) > 0 
                          ? `${((spreadAnalysis.max_profit / (spreadAnalysis.net_debit || 1)) * 100).toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Risk/Reward Ratio:</span>
                      <span className="font-medium">
                        1:{(spreadAnalysis.net_debit || 0) > 0 
                          ? (spreadAnalysis.max_profit / (spreadAnalysis.net_debit || 1)).toFixed(2)
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between bg-yellow-50 p-2 rounded -mx-2 mt-2">
                      <span className="text-yellow-700 font-semibold">Breakeven:</span>
                      <span className="font-bold text-yellow-700">${spreadAnalysis.breakeven.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Total Position ({spreadAnalysis.quantity} spreads)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Max Profit:</span>
                      <span className="font-bold text-green-600">${spreadAnalysis.total_max_profit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Max Loss:</span>
                      <span className="font-bold text-red-600">${spreadAnalysis.total_max_loss.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600">Total Investment:</span>
                      <span className="font-bold">${(spreadAnalysis.total_cost || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Analysis */}
              {spreadAnalysis.ai_analysis && (
                <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <span>🤖</span> AI Analysis
                  </h4>
                  <p className="text-sm text-blue-900 leading-relaxed">
                    {spreadAnalysis.ai_analysis}
                  </p>
                </div>
              )}

              {/* Quick Summary */}
              <div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                <h4 className="font-semibold text-indigo-800 mb-2">📋 Quick Summary</h4>
                <div className="text-sm text-indigo-900 space-y-1">
                  <p>
                    <strong>Strategy:</strong> {spreadAnalysis.spread_type === 'bull_call' 
                      ? `Bullish on ${spreadAnalysis.symbol}. Stock needs to rise above $${spreadAnalysis.breakeven.toFixed(2)} by expiration.`
                      : `Bearish on ${spreadAnalysis.symbol}. Stock needs to fall below $${spreadAnalysis.breakeven.toFixed(2)} by expiration.`}
                  </p>
                  <p>
                    <strong>Risk:</strong> You can lose at most ${spreadAnalysis.total_max_loss.toFixed(2)} (your total investment).
                  </p>
                  <p>
                    <strong>Reward:</strong> You can gain at most ${spreadAnalysis.total_max_profit.toFixed(2)} if the stock is {spreadAnalysis.spread_type === 'bull_call' ? 'above' : 'below'} ${spreadAnalysis.short_strike.toFixed(2)} at expiration.
                  </p>
                </div>
              </div>

              {/* Create Spread Button */}
              <div className="mt-6">
                <button
                  onClick={handleCreateSpread}
                  className="w-full bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 transition-colors font-bold text-lg"
                >
                  Create This Spread →
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Opens the Trade page with this spread pre-filled
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Credit Spread Tab */}
      {activeTab === 'credit-spread' && (
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} mb-4 md:mb-6 gap-4`}>
            <div>
              <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-secondary`}>Credit Spread Analyzer</h2>
              <p className="text-sm text-gray-500 mt-1">Analyze bull put or bear call spreads - collect premium upfront</p>
            </div>
            {creditStockPrice !== null && (
              <div className={`text-${isMobile ? 'left' : 'right'}`}>
                <p className="text-sm text-gray-500">Stock Price</p>
                <p className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-secondary`}>${creditStockPrice.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Credit Spread Form */}
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'} gap-4 mb-6`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
              <input
                type="text"
                value={creditSymbol}
                onChange={(e) => {
                  setCreditSymbol(e.target.value.toUpperCase());
                  setCreditExpiration('');
                  setCreditAnalysis(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                placeholder="SPY"
                maxLength={5}
                style={{ fontSize: '16px' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expiration</label>
              <select
                value={creditExpiration}
                onChange={(e) => setCreditExpiration(e.target.value)}
                disabled={loadingCreditExpirations || creditExpirations.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 text-base min-h-[48px]"
                style={{ fontSize: '16px' }}
              >
                {loadingCreditExpirations ? (
                  <option value="">Loading...</option>
                ) : creditExpirations.length === 0 ? (
                  <option value="">Enter symbol first</option>
                ) : (
                  <>
                    {!creditExpiration && <option value="">Select expiration</option>}
                    {creditExpirations.map((exp) => (
                      <option key={exp} value={exp}>{exp}</option>
                    ))}
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Spread Type</label>
              <select
                value={creditSpreadType}
                onChange={(e) => {
                  setCreditSpreadType(e.target.value as 'bull_put' | 'bear_call');
                  setCreditLongStrike('');
                  setCreditShortStrike('');
                  setCreditAnalysis(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                style={{ fontSize: '16px' }}
              >
                <option value="bull_put">Bull Put Spread (Bullish/Neutral)</option>
                <option value="bear_call">Bear Call Spread (Bearish/Neutral)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Short Strike (SELL)
                <span className="text-green-600 ml-1">$</span>
              </label>
              <input
                type="number"
                value={creditShortStrike}
                onChange={(e) => setCreditShortStrike(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                placeholder={creditSpreadType === 'bull_put' ? '600 (higher)' : '440 (lower)'}
                step="0.50"
                style={{ fontSize: '16px' }}
              />
              <p className="text-xs text-gray-500 mt-1">
                {creditSpreadType === 'bull_put' 
                  ? 'Higher strike put (you sell this for premium)' 
                  : 'Lower strike call (you sell this for premium)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Long Strike (BUY)
                <span className="text-red-600 ml-1">↓</span>
              </label>
              <input
                type="number"
                value={creditLongStrike}
                onChange={(e) => setCreditLongStrike(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                placeholder={creditSpreadType === 'bull_put' ? '590 (lower)' : '450 (higher)'}
                step="0.50"
                style={{ fontSize: '16px' }}
              />
              <p className="text-xs text-gray-500 mt-1">
                {creditSpreadType === 'bull_put' 
                  ? 'Lower strike put (protection if stock drops)' 
                  : 'Higher strike call (protection if stock rises)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                value={creditQuantity}
                onChange={(e) => setCreditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base min-h-[48px]"
                min={1}
                max={100}
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          {creditError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {creditError}
            </div>
          )}

          <button
            onClick={analyzeCreditSpread}
            disabled={creditLoading || !creditSymbol || !creditExpiration || !creditLongStrike || !creditShortStrike}
            className={`${isMobile ? 'w-full' : ''} bg-primary text-white px-6 py-3 rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-base`}
          >
            {creditLoading ? 'Analyzing...' : 'Analyze Credit Spread'}
          </button>

          {/* Credit Spread Analysis Results */}
          {creditAnalysis && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-bold text-secondary mb-4">Credit Spread Analysis Results</h3>
              
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-6`}>
                {/* Position Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Position Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Symbol:</span>
                      <span className="font-medium">{creditAnalysis.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">
                        <span className={`px-2 py-1 rounded text-xs ${
                          creditAnalysis.spread_type === 'bull_put' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {creditAnalysis.spread_type === 'bull_put' ? 'Bull Put Spread' : 'Bear Call Spread'}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Short Strike (SELL):</span>
                      <span className="font-medium text-green-600">${creditAnalysis.short_strike.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Long Strike (BUY):</span>
                      <span className="font-medium text-red-600">${creditAnalysis.long_strike.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Strike Width:</span>
                      <span className="font-medium">${creditAnalysis.strike_width.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expiration:</span>
                      <span className="font-medium">{creditAnalysis.expiration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Quantity:</span>
                      <span className="font-medium">{creditAnalysis.quantity} spread(s)</span>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Pricing</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Short Leg Premium (SELL):</span>
                      <span className="font-medium text-green-600">+${creditAnalysis.short_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Long Leg Cost (BUY):</span>
                      <span className="font-medium text-red-600">-${creditAnalysis.long_price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-700 font-semibold">Net Credit (per spread):</span>
                      <span className="font-bold text-green-600">${creditAnalysis.net_credit?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between bg-green-50 p-2 rounded -mx-2 mt-2 border border-green-200">
                      <span className="text-green-700 font-semibold">Total Credit Received:</span>
                      <span className="font-bold text-green-700">${creditAnalysis.total_credit?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Risk/Reward */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Risk/Reward</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Profit (Keep Credit):</span>
                      <span className="font-medium text-green-600">${creditAnalysis.max_profit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Max Loss (Width - Credit):</span>
                      <span className="font-medium text-red-600">${creditAnalysis.max_loss.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600">ROI if Max Profit:</span>
                      <span className="font-bold text-green-600">
                        {creditAnalysis.max_loss > 0 
                          ? `${((creditAnalysis.max_profit / creditAnalysis.max_loss) * 100).toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Risk/Reward Ratio:</span>
                      <span className="font-medium">
                        {creditAnalysis.max_loss > 0 
                          ? `1:${(creditAnalysis.max_profit / creditAnalysis.max_loss).toFixed(2)}`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between bg-yellow-50 p-2 rounded -mx-2 mt-2">
                      <span className="text-yellow-700 font-semibold">Breakeven:</span>
                      <span className="font-bold text-yellow-700">${creditAnalysis.breakeven.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 mb-3 border-b pb-2">Total Position ({creditAnalysis.quantity} spreads)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Max Profit:</span>
                      <span className="font-bold text-green-600">${creditAnalysis.total_max_profit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Max Loss:</span>
                      <span className="font-bold text-red-600">${creditAnalysis.total_max_loss.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600">Collateral Required:</span>
                      <span className="font-bold">${creditAnalysis.total_max_loss.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Analysis */}
              {creditAnalysis.ai_analysis && (
                <div className="mt-4 bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <span>🤖</span> AI Analysis
                  </h4>
                  <p className="text-sm text-blue-900 leading-relaxed">
                    {creditAnalysis.ai_analysis}
                  </p>
                </div>
              )}

              {/* Quick Summary */}
              <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">📋 Credit Spread Summary</h4>
                <div className="text-sm text-green-900 space-y-1">
                  <p>
                    <strong>Strategy:</strong> {creditAnalysis.spread_type === 'bull_put' 
                      ? `Neutral-to-bullish on ${creditAnalysis.symbol}. You profit if the stock stays above $${creditAnalysis.breakeven.toFixed(2)} by expiration.`
                      : `Neutral-to-bearish on ${creditAnalysis.symbol}. You profit if the stock stays below $${creditAnalysis.breakeven.toFixed(2)} by expiration.`}
                  </p>
                  <p>
                    <strong>Credit Received:</strong> You collect ${creditAnalysis.total_credit?.toFixed(2)} upfront - this is yours to keep if the spread expires worthless.
                  </p>
                  <p>
                    <strong>Max Risk:</strong> If the stock moves against you, you can lose up to ${creditAnalysis.total_max_loss.toFixed(2)}.
                  </p>
                  <p>
                    <strong>Time Decay:</strong> <span className="text-green-700 font-medium">Works in your favor!</span> As time passes, option premiums decay, benefiting the seller.
                  </p>
                </div>
              </div>

              {/* Create Credit Spread Button */}
              <div className="mt-6">
                <button
                  onClick={handleCreateCreditSpread}
                  className="w-full bg-green-600 text-white px-6 py-4 rounded-lg hover:bg-green-700 transition-colors font-bold text-lg"
                >
                  Create This Credit Spread →
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Opens the Trade page with this spread pre-filled
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OptionsAnalyzer;

