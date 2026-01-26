import api from './api';
import { Trade, Position } from '../types/trades';

export const tradesService = {
  executeTrade: async (tradeData: {
    symbol: string;
    action: 'buy' | 'sell';
    quantity: number;
    option_symbol?: string;
    strike?: number;
    expiration_date?: string;
    contract_type?: 'call' | 'put';
    price?: number;
    strategy_source?: 'manual' | 'automation' | 'signal';
    automation_id?: number;
    notes?: string;
  }): Promise<{ trade: Trade; order_id: number; status: string }> => {
    const response = await api.post('/trades/execute', tradeData);
    return response.data;
  },

  getHistory: async (filters?: {
    symbol?: string;
    start_date?: string;
    end_date?: string;
    strategy_source?: string;
  }): Promise<{ trades: Trade[]; count: number }> => {
    const response = await api.get('/trades/history', { params: filters });
    return response.data;
  },

  /** All-time realized P/L and win rate (closed positions only). Use for dashboard summary. */
  getPlSummary: async (): Promise<{
    realized_pnl: number;
    total_trades_with_pnl: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
  }> => {
    const response = await api.get('/trades/pl-summary');
    return response.data;
  },

  getPositions: async (): Promise<{ positions: Position[]; count: number }> => {
    const response = await api.get('/trades/positions');
    return response.data;
  },

  refreshPosition: async (positionId: number): Promise<{ position: Position; message: string }> => {
    const response = await api.post(`/trades/positions/${positionId}/refresh`);
    return response.data;
  },

  closePosition: async (positionId: number, exitPrice?: number): Promise<any> => {
    const response = await api.post(`/trades/positions/${positionId}/close`, {
      exit_price: exitPrice,
    });
    return response.data;
  },

  checkPositionExits: async (): Promise<{
    message: string;
    results: {
      monitored: number;
      exits_triggered: number;
      positions_checked: Array<{
        position_id: number;
        symbol: string;
        unrealized_pnl_percent: number;
        exit_triggered: boolean;
      }>;
      errors: string[];
    };
  }> => {
    const response = await api.post('/trades/positions/check-exits');
    return response.data;
  },
};

