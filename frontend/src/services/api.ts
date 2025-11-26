import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests (but NOT for auth endpoints)
api.interceptors.request.use(
  (config) => {
    // Don't add token to login/register endpoints
    if (config.url?.includes('/auth/login') || 
        config.url?.includes('/auth/register') ||
        config.url?.includes('/auth/refresh')) {
      return config;
    }
    
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Debug: log token presence (but not the actual token for security)
      if (config.url?.includes('/close')) {
        console.log('Sending request with token to:', config.url);
      }
    } else {
      // Log warning if no token for protected endpoint
      console.warn('No access token found for request:', config.url);
      // Don't make the request if it's a protected endpoint
      if (!config.url?.includes('/auth/login') && 
          !config.url?.includes('/auth/register')) {
        console.error('Cannot make authenticated request without token');
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Don't retry auth endpoints (login, register, refresh)
    if (originalRequest.url?.includes('/auth/login') || 
        originalRequest.url?.includes('/auth/register') ||
        originalRequest.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log('401 error detected, attempting token refresh...');
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        console.error('No refresh token available');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return Promise.reject(error);
      }
      
      try {
        console.log('Attempting to refresh token...');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        });
        
        const { access_token } = response.data;
        if (access_token) {
          console.log('Token refreshed successfully, new token length:', access_token.length);
          localStorage.setItem('access_token', access_token);
          // Update the authorization header - ensure headers object exists
          if (!originalRequest.headers) {
            originalRequest.headers = {};
          }
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          // Remove the retry flag so we can retry
          delete originalRequest._retry;
          console.log('Retrying request with new token to:', originalRequest.url);
          console.log('Authorization header set:', originalRequest.headers.Authorization ? 'Yes' : 'No');
          // Make a fresh request with the new token - use the original request config
          const retryConfig = {
            method: originalRequest.method,
            url: originalRequest.url,
            data: originalRequest.data,
            params: originalRequest.params,
            headers: {
              ...originalRequest.headers,
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
          };
          console.log('Retry config:', { method: retryConfig.method, url: retryConfig.url, hasAuth: !!retryConfig.headers.Authorization });
          return api(retryConfig);
        } else {
          console.error('No access_token in refresh response');
          throw new Error('No access_token in refresh response');
        }
      } catch (refreshError: any) {
        // Refresh failed - clear tokens
        console.error('Token refresh failed:', refreshError.response?.data || refreshError.message);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // Return the original error so the component can handle it
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

