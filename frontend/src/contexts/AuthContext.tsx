import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, ApiError } from '../services/api';
import type { User, SignupData, AuthContextValue } from '../types';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount (check both storage locations)
  useEffect(() => {
    const storedToken = localStorage.getItem('edgeai_token') || sessionStorage.getItem('edgeai_token');
    if (storedToken) {
      setToken(storedToken);
      // Verify token with backend
      authApi.getMe()
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          // Token invalid or expired - clear both storage locations
          localStorage.removeItem('edgeai_token');
          sessionStorage.removeItem('edgeai_token');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await authApi.login(email, password);
      
      // Store token based on Remember Me preference
      if (rememberMe) {
        localStorage.setItem('edgeai_token', response.access_token);
        sessionStorage.removeItem('edgeai_token'); // Clear session storage
      } else {
        sessionStorage.setItem('edgeai_token', response.access_token);
        localStorage.removeItem('edgeai_token'); // Clear local storage
      }
      
      setToken(response.access_token);
      setUser(response.user);
      return { success: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed';
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (data: SignupData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await authApi.signup({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        firm: data.firm,
        crd: data.crd,
        state: data.state,
        licenses: data.licenses,
      });
      localStorage.setItem('edgeai_token', response.access_token);
      setToken(response.access_token);
      setUser(response.user);
      return { success: true };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Signup failed';
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    // Clear both storage locations
    localStorage.removeItem('edgeai_token');
    sessionStorage.removeItem('edgeai_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
