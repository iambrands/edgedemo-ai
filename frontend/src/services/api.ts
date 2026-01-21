import axios from 'axios';

// Determine API base URL - use environment variable, or current origin in production, or localhost for development
const getApiBaseUrl = () => {
  // If REACT_APP_API_URL is set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In production (on Heroku, Railway, or any https://), use the current origin
  if (window.location.origin.includes('herokuapp.com') || 
      window.location.origin.includes('railway.app') ||
      window.location.origin.includes('https://')) {
    return `${window.location.origin}/api`;
  }
  
  // Default to localhost for local development
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests (but NOT for auth endpoints)
api.interceptors.request.use(
  (config) => {
    // Ensure Content-Type is set for POST/PUT/PATCH requests
    if (config.method && ['post', 'put', 'patch'].includes(config.method.toLowerCase())) {
      if (!config.headers['Content-Type'] && !config.headers['content-type']) {
        config.headers['Content-Type'] = 'application/json';
      }
    }
    
    // Don't add token to login/register endpoints
    const isAuthEndpoint = config.url?.includes('/auth/login') || 
                           config.url?.includes('/auth/register') ||
                           config.url?.includes('/auth/refresh');
    
    if (isAuthEndpoint) {
      return config;
    }
    
    // Get token from localStorage (check multiple possible keys for compatibility)
    const token = localStorage.getItem('access_token') || 
                  localStorage.getItem('token') ||
                  sessionStorage.getItem('access_token') ||
                  sessionStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // Enhanced debug logging for all protected endpoints
      if (config.url?.includes('/admin/') || 
          config.url?.includes('/opportunities/') ||
          config.url?.includes('/trades/') ||
          config.url?.includes('/automations/')) {
        console.log('🔐 Added token to request:', config.url);
        console.log('   Token length:', token.length);
        console.log('   Authorization header present:', !!config.headers.Authorization);
      }
    } else {
      // Log warning if no token for protected endpoint
      // But don't block auth endpoints or public endpoints
      if (!isAuthEndpoint && !config.url?.includes('/auth/logout')) {
        // Only warn for protected endpoints
        if (config.url?.includes('/admin/') || 
            config.url?.includes('/opportunities/') ||
            config.url?.includes('/trades/') ||
            config.url?.includes('/automations/')) {
          console.warn('⚠️ No access token found for protected endpoint:', config.url);
          console.warn('   Checked localStorage for: access_token, token');
          console.warn('   Checked sessionStorage for: access_token, token');
          console.warn('   All values:', {
            'localStorage.access_token': localStorage.getItem('access_token'),
            'localStorage.token': localStorage.getItem('token'),
            'sessionStorage.access_token': sessionStorage.getItem('access_token'),
            'sessionStorage.token': sessionStorage.getItem('token')
          });
        }
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
    
    // Don't retry auth endpoints (login, register, refresh, logout)
    // Also don't redirect for filter endpoints - they're optional
    if (originalRequest.url?.includes('/auth/login') || 
        originalRequest.url?.includes('/auth/register') ||
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/logout') ||
        originalRequest.url?.includes('/alerts/filters')) {
      return Promise.reject(error);
    }
    
    // Handle 502/503/504 errors (server down) - don't try to refresh token
    if (error.response?.status === 502 || 
        error.response?.status === 503 || 
        error.response?.status === 504) {
      console.error('Server error (502/503/504), not attempting token refresh');
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
          
          // Create a completely fresh request config to avoid any issues with the original request
          // Preserve original data - could be undefined, null, empty object, or actual data
          let originalData = originalRequest.data;
          if (originalData === undefined || originalData === null) {
            originalData = {};
          }
          
          const retryConfig = {
            method: originalRequest.method || 'post',
            url: originalRequest.url,
            baseURL: api.defaults.baseURL,
            data: originalData,
            params: originalRequest.params,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${access_token}`,
            },
          };
          
          console.log('Retrying request with new token to:', originalRequest.url);
          console.log('Retry config:', { 
            method: retryConfig.method, 
            url: retryConfig.url, 
            baseURL: retryConfig.baseURL,
            fullURL: `${retryConfig.baseURL}${retryConfig.url}`,
            hasAuth: !!retryConfig.headers.Authorization,
            contentType: retryConfig.headers['Content-Type'],
            hasData: !!retryConfig.data,
            dataType: typeof retryConfig.data
          });
          
          // Make a fresh request with the new config
          try {
            // Prepare request data - axios will automatically JSON.stringify objects
            const requestData = retryConfig.data || {};
            
            // Build full URL
            const fullUrl = `${retryConfig.baseURL}${retryConfig.url}`;
            
            // Use the appropriate method based on original request
            let retryResponse;
            if (retryConfig.method.toLowerCase() === 'post') {
              // Use axios directly with full URL to ensure proper headers
              retryResponse = await axios.post(
                fullUrl,
                requestData,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': retryConfig.headers.Authorization,
                  },
                }
              );
            } else if (retryConfig.method.toLowerCase() === 'get') {
              retryResponse = await axios.get(
                fullUrl,
                {
                  params: retryConfig.params,
                  headers: {
                    'Authorization': retryConfig.headers.Authorization,
                  },
                }
              );
            } else {
              retryResponse = await axios.request({
                method: retryConfig.method,
                url: fullUrl,
                data: requestData,
                params: retryConfig.params,
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': retryConfig.headers.Authorization,
                },
              });
            }
            console.log('Retry successful!', retryResponse.status);
            return retryResponse;
          } catch (retryError: any) {
            console.error('Retry failed:', retryError.response?.status, retryError.response?.data);
            console.error('Retry error details:', {
              status: retryError.response?.status,
              error: retryError.response?.data,
              headers: retryError.response?.headers,
            });
            // If retry fails with 401, clear tokens but don't redirect automatically
            // Let the component handle the error (some pages may want to show error messages)
            if (retryError.response?.status === 401) {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              // Only redirect if we're not already on login/register page
              if (!window.location.pathname.includes('/login') && 
                  !window.location.pathname.includes('/register')) {
                // Use setTimeout to avoid redirect during render
                setTimeout(() => {
                  window.location.href = '/login';
                }, 100);
              }
            }
            throw retryError;
          }
        } else {
          console.error('No access_token in refresh response');
          throw new Error('No access_token in refresh response');
        }
      } catch (refreshError: any) {
        // Refresh failed - clear tokens
        console.error('Token refresh failed:', refreshError.response?.data || refreshError.message);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        // Only redirect if we're not already on login/register page
        // And only for critical endpoints (not for optional data fetches)
        const isCriticalEndpoint = originalRequest.url?.includes('/auth/user') || 
                                   originalRequest.url?.includes('/trades/execute');
        if (isCriticalEndpoint && 
            !window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/register')) {
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
        // Return the original error so the component can handle it
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

