import api from './api';
import { OptionsAnalysis, Expiration } from '../types/options';

export const optionsService = {
  analyze: async (
    symbol: string,
    expiration: string,
    preference: 'income' | 'growth' | 'balanced',
    currentPrice?: number | null
  ): Promise<OptionsAnalysis> => {
    const body: Record<string, unknown> = { symbol, expiration, preference };
    if (currentPrice != null && currentPrice > 0 && currentPrice < 100000) {
      body.current_price = currentPrice;
    }
    const response = await api.post('/options/analyze', body);
    return response.data;
  },

  getExpirations: async (symbol: string): Promise<Expiration> => {
    const response = await api.get(`/options/expirations/${symbol}`);
    return response.data;
  },

  getChain: async (symbol: string, expiration: string) => {
    const response = await api.get(`/options/chain/${symbol}/${expiration}`);
    return response.data;
  },

  getSignals: async (symbol: string, preference?: 'income' | 'growth' | 'balanced') => {
    const params = preference ? { preference } : {};
    const response = await api.get(`/options/signals/${symbol}`, { params });
    return response.data;
  },
};

