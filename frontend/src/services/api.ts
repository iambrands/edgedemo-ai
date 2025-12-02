import axios from 'axios';

// Determine API base URL - use environment variable, or current origin in production, or localhost for development
const getApiBaseUrl = () => {
  // If REACT_APP_API_URL is set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In production (on Heroku), use the current origin
  if (window.location.origin.includes('herokuapp.com') || window.location.origin.includes('https://')) {
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
        console.log('Content-Type:', config.headers['Content-Type']);
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
            // If retry fails with 401, clear tokens and redirect
            if (retryError.response?.status === 401) {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/login';
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
        // Return the original error so the component can handle it
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

