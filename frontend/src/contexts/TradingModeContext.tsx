import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface TradingModeContextType {
  mode: 'paper' | 'live';
  setMode: (mode: 'paper' | 'live') => void;
  hasLiveCredentials: boolean;
  checkCredentials: () => Promise<void>;
  loading: boolean;
}

const TradingModeContext = createContext<TradingModeContextType | undefined>(undefined);

export const TradingModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<'paper' | 'live'>('paper');
  const [hasLiveCredentials, setHasLiveCredentials] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved mode from localStorage
    const savedMode = localStorage.getItem('tradingMode') as 'paper' | 'live' | null;
    if (savedMode) {
      setModeState(savedMode);
    }

    // Check if user has credentials
    checkCredentials();
  }, []);

  const setMode = async (newMode: 'paper' | 'live') => {
    setModeState(newMode);
    localStorage.setItem('tradingMode', newMode);
    
    // Update backend if user is logged in
    try {
      await api.put('/auth/user', { trading_mode: newMode });
    } catch (error) {
      console.error('Failed to update trading mode on server:', error);
      // Continue anyway - mode is saved locally
    }
  };

  const checkCredentials = async () => {
    // Skip if not logged in (no auth token)
    const token = localStorage.getItem('access_token');
    if (!token) {
      setHasLiveCredentials(false);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.get('/user/has-tradier-credentials');
      setHasLiveCredentials(response.data.has_credentials || false);
    } catch (err) {
      // Don't log 401 errors - expected when logged out
      if ((err as any)?.response?.status !== 401) {
        console.error('Failed to check credentials:', err);
      }
      setHasLiveCredentials(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TradingModeContext.Provider value={{ mode, setMode, hasLiveCredentials, checkCredentials, loading }}>
      {children}
    </TradingModeContext.Provider>
  );
};

export const useTradingMode = () => {
  const context = useContext(TradingModeContext);
  if (!context) {
    throw new Error('useTradingMode must be used within TradingModeProvider');
  }
  return context;
};

