import axios from 'axios';

// Get backend URL from environment or default to production
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || 'pleasantcove2024admin';

console.log('API request to Railway:', API_URL.replace('/api', ''));

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for debugging
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default api; 