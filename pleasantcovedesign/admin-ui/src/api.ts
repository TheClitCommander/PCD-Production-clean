// @ts-ignore
import axios from 'axios'

// Unified API URL configuration
const getApiBaseUrl = () => {
  // Check for environment variable first (Vite uses import.meta.env)
  const env = (import.meta as any).env;
  if (env?.VITE_API_URL) {
    return `${env.VITE_API_URL}/api`;
  }
  
  // Auto-detect production versus local environment
  // 1. If we are running on pleasantcovedesign.com or any Squarespace preview → use Railway
  const host = window.location.hostname;

  // Production & staging hostnames that should hit Railway
  const prodHosts = [
    'pleasantcovedesign.com',
    'www.pleasantcovedesign.com',
    'admin.pleasantcovedesign.com',
  ];

  if (prodHosts.some(h => host === h)) {
    return 'https://YOUR_NEW_RAILWAY_URL.up.railway.app/api';
  }

  // 2. If we are served from 127.0.0.1/localhost – developer mode
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return 'http://localhost:3000/api';
  }

  // 3. Fallback (Netlify preview, Vercel, Codesandbox, etc.) – use Railway as default
  return 'https://YOUR_NEW_RAILWAY_URL.up.railway.app/api';
};

// Export base URL for WebSocket connections
export const getWebSocketUrl = () => {
  const env = (import.meta as any).env;
  if (env?.VITE_WS_URL) {
    return env.VITE_WS_URL;
  }
  
  // Match the same host logic as getApiBaseUrl
  const host = window.location.hostname;

  if (['pleasantcovedesign.com','www.pleasantcovedesign.com','admin.pleasantcovedesign.com'].includes(host)) {
    return 'https://YOUR_NEW_RAILWAY_URL.up.railway.app';
  }

  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return 'http://localhost:3000';
  }

  return 'https://YOUR_NEW_RAILWAY_URL.up.railway.app';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
})

// Unified token management
let cachedAdminToken: string | null = null;

const getAdminToken = async (): Promise<string> => {
  if (cachedAdminToken) {
    return cachedAdminToken;
  }
  
  try {
    const response = await axios.post(`${getApiBaseUrl()}/token`, {
      type: 'admin'
    }, {
      headers: {
        'Authorization': 'Bearer pleasantcove2024admin'
      }
    });
    
    if (response.data.valid) {
      cachedAdminToken = response.data.token;
      return response.data.token;
    }
  } catch (error) {
    console.error('Failed to get admin token:', error);
    // Fallback to direct token
    cachedAdminToken = 'pleasantcove2024admin';
  }
  
  return 'pleasantcove2024admin';
};

// Attach auth header automatically with unified token
api.interceptors.request.use(async (config: any) => {
  const token = await getAdminToken();
  config.headers = {
    ...config.headers,
    Authorization: `Bearer ${token}`,
  }
  return config
})

// CRM Tracking API functions
export const tracking = {
  // Get lead tracking data
  getLeadTracking: (leadId: string) => 
    api.get(`/leads/${leadId}/tracking`),
  
  // Get tracking summary for all leads  
  getTrackingSummary: () =>
    api.get('/leads/tracking/summary'),
  
  // Update lead status
  updateLeadStatus: (leadId: string, status: string, notes?: string) =>
    api.post(`/leads/${leadId}/status`, { status, notes }),
  
  // Generate tracked demo
  generateDemo: (leadId: string, businessData: any) =>
    api.post(`/leads/${leadId}/generate-demo`, businessData),
  
  // Track demo view (usually called from demo pages)
  trackView: (demoId: string, leadId?: string, trackingToken?: string) =>
    api.post('/track/view', { demo_id: demoId, lead_id: leadId, tracking_token: trackingToken }),
  
  // Track CTA click (usually called from demo pages)
  trackClick: (demoId: string, leadId: string, ctaType: string) =>
    api.post('/track/click', { demo_id: demoId, lead_id: leadId, cta_type: ctaType }),
  
  // Log inbound message
  logMessage: (contactInfo: string, messageContent: string, messageType: string) =>
    api.post('/track/message', { contact_info: contactInfo, message_content: messageContent, message_type: messageType })
};

export default api 