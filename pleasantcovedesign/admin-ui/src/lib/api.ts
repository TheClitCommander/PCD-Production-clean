import axios from 'axios';

// Force correct URL for local development
const API_URL = 'http://localhost:3001/api';
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || 'pleasantcove2024admin';

console.log('🔧 API Configuration:', { API_URL, ADMIN_TOKEN });
console.log('🌐 Backend URL:', API_URL.replace('/api', ''));
console.log('🔍 Environment check:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  NODE_ENV: import.meta.env.NODE_ENV,
  MODE: import.meta.env.MODE
});

// Alert if still using wrong port
if (API_URL.includes(':3000')) {
  console.error('❌ STILL USING PORT 3000! This is wrong!');
  alert('API Configuration Error: Still pointing to port 3000 instead of 3001!');
} else {
  console.log('✅ API correctly configured for port 3001');
}

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