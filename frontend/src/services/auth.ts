import api from './api';
import { AuthResponse, User } from '../types/user';

export const authService = {
  register: async (username: string, email: string, password: string, riskTolerance: 'low' | 'moderate' | 'high' = 'moderate'): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', {
      username,
      email,
      password,
      risk_tolerance: riskTolerance,
    });
    return response.data;
  },

  updateUser: async (data: Partial<User>): Promise<{ user: User; message: string }> => {
    const response = await api.put('/auth/user', data);
    return response.data;
  },

  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', {
      username,
      password,
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/user');
    return response.data;
  },

  logout: () => {
    // Clear all tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Clear session storage
    sessionStorage.clear();
    
    // Note: We don't make an API call to logout because:
    // 1. The server might be down (502 errors)
    // 2. We want logout to work even if offline
    // 3. Tokens are stateless - clearing them locally is sufficient
  },
};

