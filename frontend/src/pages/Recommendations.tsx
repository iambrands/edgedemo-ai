import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const Recommendations: React.FC = () => {
  const navigate = useNavigate();
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAiSuggestions();
  }, []);

  const loadAiSuggestions = async () => {
    setLoading(true);
    try {
      // Use shorter timeout for AI suggestions
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 15000); // 15 second timeout
      });
      
      const response = await Promise.race([
        api.get('/opportunities/ai-suggestions?limit=20'),
        timeoutPromise
      ]) as any;
      
      if (response && response.data && response.data.recommendations) {
        setAiSuggestions(response.data.recommendations);
      }
    } catch (error: any) {
      if (!error?.message?.includes('Timeout')) {
        console.error('Failed to load AI suggestions:', error);
        toast.error('Failed to load AI recommendations. Please try again.');
      }
      setAiSuggestions([]);
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
          <h1 className="text-3xl font-bold text-secondary">🤖 AI-Powered Recommendations</h1>
          <p className="text-gray-600 mt-1">Personalized symbol recommendations based on your trading patterns and market signals</p>
        </div>
        <button
          onClick={loadAiSuggestions}
          disabled={loading}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* AI-Powered Suggestions Widget */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-md p-6 border border-purple-200">
        <h2 className="text-xl font-bold text-secondary mb-4">🤖 AI-Powered Suggestions</h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-500 text-sm mt-2">Loading AI recommendations...</p>
          </div>
        ) : aiSuggestions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiSuggestions.map((suggestion, idx) => (
              <div
                key={idx}
                onClick={() => handleAnalyzeSymbol(suggestion.symbol)}
                className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 hover:border-purple-300"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-secondary">{suggestion.symbol}</h3>
                    {suggestion.reason && (
                      <p className="text-xs text-gray-500 mt-1">{suggestion.reason}</p>
                    )}
                  </div>
                  {suggestion.confidence && (
                    <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded">
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  )}
                </div>
                {suggestion.strategy && (
                  <div className="mt-2 mb-3">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {suggestion.strategy}
                    </span>
                  </div>
                )}
                <div className="mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalyzeSymbol(suggestion.symbol);
                    }}
                    className="w-full bg-purple-600 text-white text-xs px-3 py-2 rounded hover:bg-purple-700 transition-colors"
                  >
                    Analyze Options
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm mb-2">No AI recommendations available yet.</p>
            <p className="text-gray-400 text-xs">Start trading to get AI-powered recommendations based on your patterns.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recommendations;

