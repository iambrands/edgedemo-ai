import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

type TabType = 'signals' | 'movers' | 'for-you';

const Opportunities: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get initial tab from URL query param, default to 'signals'
  const tabFromUrl = searchParams.get('tab') as TabType;
  const [activeTab, setActiveTab] = useState<TabType>(
    tabFromUrl && ['signals', 'movers', 'for-you'].includes(tabFromUrl) 
      ? tabFromUrl 
      : 'signals'
  );
  
  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);
  
  // Signals data (from Discover)
  const [signals, setSignals] = useState<any[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [quickScanResults, setQuickScanResults] = useState<any[]>([]);
  const [loadingQuickScan, setLoadingQuickScan] = useState(false);
  
  // Market Movers data
  const [marketMovers, setMarketMovers] = useState<any[]>([]);
  const [loadingMovers, setLoadingMovers] = useState(false);
  
  // AI Recommendations data
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'signals') {
      loadSignals();
    } else if (activeTab === 'movers') {
      loadMarketMovers();
    } else if (activeTab === 'for-you') {
      loadAiRecommendations();
    }
  }, [activeTab]);

  const loadSignals = async () => {
    setLoadingSignals(true);
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 15000);
      });
      
      const response = await Promise.race([
        api.get('/opportunities/today'),
        timeoutPromise
      ]) as any;
      
      if (response && response.data && response.data.opportunities) {
        setSignals(response.data.opportunities);
      }
    } catch (error: any) {
      if (!error?.message?.includes('Timeout')) {
        console.error('Failed to load signals:', error);
        toast.error('Failed to load trading signals. Please try again.');
      }
      setSignals([]);
    } finally {
      setLoadingSignals(false);
    }
  };

  const handleQuickScan = async () => {
    setLoadingQuickScan(true);
    try {
      const response = await api.post('/opportunities/quick-scan');
      const results = response.data.opportunities || [];
      setQuickScanResults(results);
      
      if (results.length > 0) {
        toast.success(`Found ${results.length} opportunity${results.length > 1 ? 'ies' : ''}!`, { duration: 3000 });
        const existingSymbols = new Set(signals.map((s: any) => s.symbol));
        const newSignals = results.filter((r: any) => !existingSymbols.has(r.symbol));
        setSignals([...signals, ...newSignals]);
      } else {
        toast('No opportunities found. Try adding symbols to your watchlist.', { 
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
    setLoadingMovers(true);
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 30000);
      });
      
      const response = await Promise.race([
        api.get('/opportunities/market-movers?limit=20'),
        timeoutPromise
      ]) as any;
      
      if (response && response.data && response.data.movers) {
        setMarketMovers(response.data.movers);
      }
    } catch (error: any) {
      console.error('Failed to load market movers:', error);
      if (error?.message?.includes('Timeout')) {
        toast.error('Market movers request timed out. Please try again.');
      } else {
        toast.error(error?.response?.data?.error || 'Failed to load market movers. Please try again.');
      }
      setMarketMovers([]);
    } finally {
      setLoadingMovers(false);
    }
  };

  const loadAiRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 30000);
      });
      
      const response = await Promise.race([
        api.get('/opportunities/ai-suggestions?limit=20'),
        timeoutPromise
      ]) as any;
      
      if (response && response.data && response.data.recommendations) {
        setAiRecommendations(response.data.recommendations);
      }
    } catch (error: any) {
      if (!error?.message?.includes('Timeout')) {
        console.error('Failed to load AI recommendations:', error);
        toast.error('Failed to load AI recommendations. Please try again.');
      }
      setAiRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleAnalyzeSymbol = (symbol: string) => {
    navigate('/analyzer', { state: { symbol }, replace: false });
  };

  const getCurrentData = () => {
    if (activeTab === 'signals') return signals;
    if (activeTab === 'movers') return marketMovers;
    return aiRecommendations;
  };

  const isLoading = () => {
    if (activeTab === 'signals') return loadingSignals;
    if (activeTab === 'movers') return loadingMovers;
    return loadingRecommendations;
  };

  const getEmptyMessage = () => {
    if (activeTab === 'signals') {
      return {
        title: 'No high-confidence signals found',
        description: 'Add symbols to your watchlist or try Quick Scan to find opportunities.',
        action: 'Run Quick Scan',
        actionHandler: handleQuickScan,
        actionLoading: loadingQuickScan
      };
    }
    if (activeTab === 'movers') {
      return {
        title: 'No market movers found',
        description: 'Try refreshing or check back later.',
        action: 'Refresh',
        actionHandler: loadMarketMovers,
        actionLoading: loadingMovers
      };
    }
    return {
      title: 'No AI recommendations available yet',
      description: 'Start trading to get personalized recommendations based on your patterns.',
      action: 'Refresh',
      actionHandler: loadAiRecommendations,
      actionLoading: loadingRecommendations
    };
  };

  const renderCard = (item: any, idx: number) => {
    if (activeTab === 'signals') {
      return (
        <div
          key={idx}
          onClick={() => handleAnalyzeSymbol(item.symbol)}
          className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 hover:border-indigo-300"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold text-lg text-secondary">{item.symbol}</h3>
              <p className="text-xs text-gray-500">{item.reason || 'High-confidence signal'}</p>
            </div>
            <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
              {Math.round((item.confidence || 0) * 100)}%
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {item.contract_type ? `${item.contract_type.toUpperCase()}` : 'OPTION'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAnalyzeSymbol(item.symbol);
              }}
              className="bg-indigo-600 text-white text-xs px-3 py-1 rounded hover:bg-indigo-700 transition-colors"
            >
              Analyze Options
            </button>
          </div>
        </div>
      );
    }

    if (activeTab === 'movers') {
      return (
        <div
          key={idx}
          onClick={() => handleAnalyzeSymbol(item.symbol)}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 hover:border-indigo-300"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold text-lg text-secondary">{item.symbol}</h3>
              {item.company_name && (
                <p className="text-xs text-gray-500 truncate">{item.company_name}</p>
              )}
            </div>
            {item.change_percent !== undefined && (
              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                item.change_percent >= 0 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {item.change_percent >= 0 ? '+' : ''}{item.change_percent?.toFixed(2)}%
              </span>
            )}
          </div>
          <div className="mt-3 space-y-1">
            {item.current_price !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Price:</span>
                <span className="font-semibold">${item.current_price.toFixed(2)}</span>
              </div>
            )}
            {item.volume !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Volume:</span>
                <span className="font-semibold">{item.volume.toLocaleString()}</span>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAnalyzeSymbol(item.symbol);
              }}
              className="mt-3 w-full bg-indigo-600 text-white text-xs px-3 py-2 rounded hover:bg-indigo-700 transition-colors"
            >
              Analyze Options
            </button>
          </div>
        </div>
      );
    }

    // AI Recommendations
    return (
      <div
        key={idx}
        onClick={() => handleAnalyzeSymbol(item.symbol)}
        className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 hover:border-purple-300"
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-bold text-lg text-secondary">{item.symbol}</h3>
            {(item.reason || item.reasoning) && (
              <p className="text-xs text-gray-500 mt-1">{item.reason || item.reasoning}</p>
            )}
          </div>
          {item.confidence && (
            <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">
              {Math.round(item.confidence * 100)}%
            </span>
          )}
        </div>
        {item.strategy && (
          <div className="mt-2 mb-3">
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
              {item.strategy}
            </span>
          </div>
        )}
        <div className="mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAnalyzeSymbol(item.symbol);
            }}
            className="w-full bg-purple-600 text-white text-xs px-3 py-2 rounded hover:bg-purple-700 transition-colors"
          >
            Analyze Options
          </button>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'signals' as TabType, label: '🎯 Signals', description: 'High-confidence trading signals from your watchlist' },
    { id: 'movers' as TabType, label: '📈 Market Movers', description: 'Stocks with high volume and volatility' },
    { id: 'for-you' as TabType, label: '🤖 For You', description: 'Personalized recommendations based on your patterns' },
  ];

  const currentData = getCurrentData();
  const emptyMessage = getEmptyMessage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary">🎯 Opportunities</h1>
          <p className="text-gray-600 mt-1">Discover trading opportunities across signals, market movers, and AI recommendations</p>
        </div>
        <div className="flex gap-3">
          {activeTab === 'signals' && (
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
          )}
          <button
            onClick={() => {
              if (activeTab === 'signals') loadSignals();
              else if (activeTab === 'movers') loadMarketMovers();
              else loadAiRecommendations();
            }}
            disabled={isLoading()}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading() ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 px-6 py-4 text-center font-medium transition-colors
                  ${activeTab === tab.id
                    ? 'border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <div className="text-lg mb-1">{tab.label.split(' ')[0]}</div>
                <div className="text-xs">{tab.description}</div>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {isLoading() ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 text-sm mt-4">Loading {tabs.find(t => t.id === activeTab)?.label}...</p>
            </div>
          ) : currentData.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentData.map((item, idx) => renderCard(item, idx))}
              </div>
              
              {/* Quick Scan Results Section (only for signals tab) */}
              {activeTab === 'signals' && quickScanResults.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-secondary mb-4">⚡ Quick Scan Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quickScanResults.map((result, idx) => renderCard(result, idx))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-2">{emptyMessage.title}</p>
              <p className="text-gray-400 text-sm mb-6">{emptyMessage.description}</p>
              <button
                onClick={emptyMessage.actionHandler}
                disabled={emptyMessage.actionLoading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {emptyMessage.actionLoading ? 'Loading...' : emptyMessage.action}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Opportunities;

