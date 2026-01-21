import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTradingMode } from '../contexts/TradingModeContext';

interface TradingModeToggleProps {
  className?: string;
}

const TradingModeToggle: React.FC<TradingModeToggleProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { mode, setMode, hasLiveCredentials, checkCredentials } = useTradingMode();
  const [showLiveWarning, setShowLiveWarning] = useState(false);

  const handleModeSwitch = async (newMode: 'paper' | 'live') => {
    if (newMode === 'live') {
      if (!hasLiveCredentials) {
        // Redirect to credential setup
        navigate('/settings/tradier-setup');
        return;
      }
      
      // Show confirmation modal for live trading
      setShowLiveWarning(true);
    } else {
      // Switching to paper is safe - no confirmation needed
      await setMode('paper');
    }
  };

  const confirmLiveTrading = async () => {
    setShowLiveWarning(false);
    await setMode('live');
  };

  return (
    <>
      <div className={`trading-mode-toggle bg-white rounded-lg shadow p-4 mb-4 ${className}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Trading Mode</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleModeSwitch('paper')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'paper'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📄 Paper Trading
                {mode === 'paper' && (
                  <span className="block text-xs mt-1 opacity-90">Safe Practice Mode</span>
                )}
              </button>
              
              <button
                onClick={() => handleModeSwitch('live')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  mode === 'live'
                    ? 'bg-red-600 text-white shadow-md animate-pulse'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${!hasLiveCredentials ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={!hasLiveCredentials}
              >
                💰 Live Trading
                {mode === 'live' && (
                  <span className="block text-xs mt-1 opacity-90">Real Money</span>
                )}
                {!hasLiveCredentials && (
                  <span className="block text-xs mt-1 text-yellow-600">Setup Required</span>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {!hasLiveCredentials && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              🔐 <strong>Live trading requires Tradier credentials.</strong>{' '}
              <button
                onClick={() => navigate('/settings/tradier-setup')}
                className="text-yellow-900 underline font-medium hover:text-yellow-700"
              >
                Set up now →
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Live Trading Confirmation Modal */}
      {showLiveWarning && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowLiveWarning(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">⚠️ Switch to Live Trading?</h2>
            
            <div className="space-y-4 mb-6">
              <p className="text-gray-700">
                You're about to switch to <strong className="text-red-600">live trading mode</strong> using real money.
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">Before you proceed:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                  <li>All trades will execute with real money</li>
                  <li>Losses are real and cannot be reversed</li>
                  <li>Ensure you understand the risks involved</li>
                  <li>Start with small positions to test</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Recommendation:</strong> If you're new to options trading, 
                  continue practicing in paper mode until you're consistently profitable.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLiveWarning(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Stay in Paper Mode
              </button>
              <button
                onClick={confirmLiveTrading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                I Understand, Enable Live Trading
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TradingModeToggle;

