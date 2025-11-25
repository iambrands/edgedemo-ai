import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { authService } from '../services/auth';
import { User, AuthResponse } from '../types/user';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<AuthResponse>;
  register: (username: string, email: string, password: string, riskTolerance?: 'low' | 'moderate' | 'high') => Promise<AuthResponse>;
  logout: () => void;
  loading: boolean;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const response = await authService.getCurrentUser();
          setUser(response.user);
        } catch (error: any) {
          // If error is 401/403, token is invalid - clear it
          // Otherwise, keep token and let user state be set from registration/login
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.error('Auth check failed - token invalid:', error);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setUser(null);
          } else {
            // Network error or other issue - don't clear token, might be temporary
            console.warn('Auth check failed but keeping token:', error);
            // Don't clear user state if we have a token
          }
        }
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authService.login(username, password);
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    // Set user state immediately
    setUser(response.user);
    // Return response for the caller to handle navigation
    return response;
  };

  const register = async (username: string, email: string, password: string, riskTolerance: 'low' | 'moderate' | 'high' = 'moderate') => {
    const response = await authService.register(username, email, password, riskTolerance);
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    // Set user state immediately
    setUser(response.user);
    // Return response for the caller to handle navigation
    return response;
  };

  const updateUser = async (data: Partial<User>) => {
    const updatedUser = await authService.updateUser(data);
    setUser(updatedUser.user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
