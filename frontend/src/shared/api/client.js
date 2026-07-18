import axios from 'axios';

// Base Axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});
console.log(apiClient)
console.log('Axios baseURL is configured to:', apiClient.defaults.baseURL);

// Request Interceptor: Attach JWT token if available & log requests
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API REQUEST] => ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, config);
    const token = localStorage.getItem('token'); // In a real app, manage this securely
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API REQUEST ERROR]:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global errors (e.g., 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => {
    console.log('[API RESPONSE] SUCCESS:', response);
    return response.data.data; // Unpack the generic ApiResponse wrapper
  },
  (error) => {
    console.error('[API RESPONSE] ERROR:', error);
    if (error.response && error.response.status === 401) {
      // Token expired or unauthorized
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default apiClient;
