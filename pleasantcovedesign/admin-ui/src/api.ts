// @ts-ignore
import axios from 'axios'

// Force same-origin API for Railway deployment
const getApiBaseUrl = () => {
  // Always use same-origin when served from Railway
  const sameOriginUrl = '/api';
  console.log('🔍 [API] Using same-origin:', sameOriginUrl);
  return sameOriginUrl;
};

// Export base URL for WebSocket connections - same origin
export const getWebSocketUrl = () => {
  return window.location.origin;
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

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle network errors gracefully
    if (error.code === 'ERR_NETWORK') {
      console.warn('Network error detected. Server might be unavailable:', error.message);
      
      // Check if we're requesting data that might have a local fallback
      const url = error.config?.url;
      if (url) {
        // For specific endpoints, we can provide fallback data
        if (url.includes('/api/demos')) {
          console.log('Providing fallback data for demos');
          return Promise.resolve({ data: [] });
        }
        
        if (url.includes('/api/team/agents')) {
          console.log('Providing fallback data for team agents');
          return Promise.resolve({ data: [] });
        }
        
        if (url.includes('/api/projects')) {
          console.log('Providing fallback data for projects');
          return Promise.resolve({ data: [] });
        }
      }
    }
    
    // For all other errors, reject as normal
    return Promise.reject(error);
  }
)

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