import axios from 'axios';

// Force same-origin API for Railway deployment
const API_URL = '/api';
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || 'pleasantcove2024admin';

console.log('🔧 API Configuration - Same Origin:', { API_URL, ADMIN_TOKEN });

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