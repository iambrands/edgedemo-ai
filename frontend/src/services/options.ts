import api from './api';
import { OptionsAnalysis, Expiration } from '../types/options';

export const optionsService = {
  analyze: async (symbol: string, expiration: string, preference: 'income' | 'growth' | 'balanced'): Promise<OptionsAnalysis> => {
    const response = await api.post('/options/analyze', {
      symbol,
      expiration,
      preference,
    });
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

