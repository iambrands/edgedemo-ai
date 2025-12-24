import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const Market: React.FC = () => {
  const navigate = useNavigate();
  const [marketMovers, setMarketMovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarketMovers();
  }, []);

  const loadMarketMovers = async () => {
    setLoading(true);
    try {
      // Use shorter timeout for market movers
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 15000); // 15 second timeout
      });
      
      const response = await Promise.race([
        api.get('/opportunities/market-movers?limit=20'),
        timeoutPromise
      ]) as any;
      
      if (response && response.data && response.data.movers) {
        setMarketMovers(response.data.movers);
      }
    } catch (error: any) {
      if (!error?.message?.includes('Timeout')) {
        console.error('Failed to load market movers:', error);
        toast.error('Failed to load market movers. Please try again.');
      }
      setMarketMovers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeSymbol = (symbol: string) => {
    navigate('/analyzer', { state: { symbol }, replace: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary">📈 Market Movers</h1>
          <p className="text-gray-600 mt-1">Stocks with high volume and volatility - potential trading opportunities</p>
        </div>
        <button
          onClick={loadMarketMovers}
          disabled={loading}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Market Movers Widget */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-secondary mb-4">📈 Market Movers</h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 text-sm mt-2">Loading market movers...</p>
          </div>
        ) : marketMovers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {marketMovers.map((mover, idx) => (
              <div
                key={idx}
                onClick={() => handleAnalyzeSymbol(mover.symbol)}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 hover:border-indigo-300"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-secondary">{mover.symbol}</h3>
                    {mover.company_name && (
                      <p className="text-xs text-gray-500 truncate">{mover.company_name}</p>
                    )}
                  </div>
                  {mover.change_percent !== undefined && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      mover.change_percent >= 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {mover.change_percent >= 0 ? '+' : ''}{mover.change_percent?.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-1">
                  {mover.current_price !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-semibold">${mover.current_price.toFixed(2)}</span>
                    </div>
                  )}
                  {mover.volume !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Volume:</span>
                      <span className="font-semibold">{mover.volume.toLocaleString()}</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalyzeSymbol(mover.symbol);
                    }}
                    className="mt-3 w-full bg-indigo-600 text-white text-xs px-3 py-2 rounded hover:bg-indigo-700 transition-colors"
                  >
                    Analyze Options
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm mb-2">No market movers found at this time.</p>
            <p className="text-gray-400 text-xs">Try refreshing or check back later.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Market;

