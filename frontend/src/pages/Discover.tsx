import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const Discover: React.FC = () => {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickScanResults, setQuickScanResults] = useState<any[]>([]);
  const [loadingQuickScan, setLoadingQuickScan] = useState(false);
  const [showOpportunities, setShowOpportunities] = useState(true);

  useEffect(() => {
    loadOpportunities();
    
    // Load user preference for showing opportunities
    const savedPreference = localStorage.getItem('showOpportunities');
    if (savedPreference !== null) {
      setShowOpportunities(savedPreference === 'true');
    }
  }, []);

  const loadOpportunities = async () => {
    setLoading(true);
    try {
      // Use shorter timeout for opportunities
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 15000); // 15 second timeout
      });
      
      const response = await Promise.race([
        api.get('/opportunities/today'),
        timeoutPromise
      ]) as any;
      
      if (response && response.data && response.data.opportunities) {
        setOpportunities(response.data.opportunities);
      }
    } catch (error: any) {
      if (!error?.message?.includes('Timeout')) {
        console.error('Failed to load opportunities:', error);
        toast.error('Failed to load opportunities. Please try again.');
      }
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeOpportunity = (symbol: string) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary">🎯 Discover Opportunities</h1>
          <p className="text-gray-600 mt-1">High-confidence trading signals from your watchlist and popular symbols</p>
        </div>
        <div className="flex gap-3">
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
            onClick={loadOpportunities}
            disabled={loading}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Refresh'}
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
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 text-sm mt-2">Loading opportunities...</p>
          </div>
        ) : showOpportunities && opportunities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunities.map((opp, idx) => (
              <div
                key={idx}
                onClick={() => handleAnalyzeOpportunity(opp.symbol)}
                className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 hover:border-indigo-300"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-secondary">{opp.symbol}</h3>
                    <p className="text-xs text-gray-500">{opp.reason || 'High-confidence signal'}</p>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                    {Math.round((opp.confidence || 0) * 100)}%
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {opp.contract_type ? `${opp.contract_type.toUpperCase()}` : 'OPTION'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalyzeOpportunity(opp.symbol);
                    }}
                    className="bg-indigo-600 text-white text-xs px-3 py-1 rounded hover:bg-indigo-700 transition-colors"
                  >
                    Analyze Options
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : showOpportunities ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm mb-4">
              No high-confidence opportunities (70%+) found. Add symbols to your watchlist or try Quick Scan.
            </p>
            <button
              onClick={handleQuickScan}
              disabled={loadingQuickScan}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loadingQuickScan ? 'Scanning...' : 'Run Quick Scan'}
            </button>
          </div>
        ) : null}

        {/* Quick Scan Results */}
        {quickScanResults.length > 0 && (
          <div className="mt-6 pt-6 border-t border-indigo-200">
            <h3 className="text-lg font-semibold text-secondary mb-3">⚡ Quick Scan Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickScanResults.map((result, idx) => (
                <div
                  key={idx}
                  onClick={() => handleAnalyzeOpportunity(result.symbol)}
                  className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 hover:border-indigo-300"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-secondary">{result.symbol}</h3>
                      <p className="text-xs text-gray-500">{result.reason || 'Quick scan result'}</p>
                    </div>
                    {result.confidence && (
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyzeOpportunity(result.symbol);
                      }}
                      className="bg-indigo-600 text-white text-xs px-3 py-1 rounded hover:bg-indigo-700 transition-colors w-full"
                    >
                      Analyze Options
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Discover;

