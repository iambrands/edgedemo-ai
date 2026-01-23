import api from './api';
import { WatchlistResponse, Stock } from '../types/watchlist';

export const watchlistService = {
  getWatchlist: async (): Promise<WatchlistResponse> => {
    const response = await api.get('/watchlist');
    return response.data;
  },

  addStock: async (symbol: string, tags?: string[], notes?: string): Promise<{ stock: Stock }> => {
    const response = await api.post('/watchlist/add', {
      symbol,
      tags,
      notes,
    });
    return response.data;
  },

  removeStock: async (symbol: string): Promise<void> => {
    await api.delete(`/watchlist/${symbol}`);
  },

  updateNotes: async (symbol: string, notes: string): Promise<{ stock: Stock }> => {
    const response = await api.put(`/watchlist/${symbol}/notes`, { notes });
    return response.data;
  },

  updateTags: async (symbol: string, tags: string[]): Promise<{ stock: Stock }> => {
    const response = await api.put(`/watchlist/${symbol}/tags`, { tags });
    return response.data;
  },

  refreshPrices: async (): Promise<{ updated: number; errors: string[] }> => {
    const response = await api.post('/watchlist/refresh');
    return response.data;
  },

  bulkAdd: async (symbols: string[]): Promise<{
    message: string;
    added: number;
    skipped: number;
    failed: number;
    failed_symbols: string[];
  }> => {
    const response = await api.post('/watchlist/bulk-add', { symbols });
    return response.data;
  },
};

