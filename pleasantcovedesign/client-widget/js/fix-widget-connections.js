/**
 * Pleasant Cove Design - Widget Connection Fix
 * 
 * This script contains core functions to ensure widgets properly connect to the production backend.
 * It should be included in all client-facing widgets.
 */

/**
 * Detects the optimal backend URL for the widget
 * @returns {string} The detected backend URL
 */
function detectBackendUrl() {
  const PRODUCTION_URL = 'https://pcd-production-clean-production-e6f3.up.railway.app';
  const LOCAL_URL = 'http://localhost:3000';
  
  try {
    // 1. Check if debug mode is forced via localStorage (overrides everything)
    const debugMode = localStorage.getItem('pcd_debug_mode') === 'true';
    if (debugMode) {
      console.log('🔧 [CONFIG] Debug mode active → forcing local backend');
      return LOCAL_URL;
    }
    
    // 2. Check URL parameters (overrides stored config)
    const urlParams = new URLSearchParams(window.location.search);
    const paramBackendUrl = 
      urlParams.get('backendUrl') || 
      urlParams.get('api_url') || 
      urlParams.get('api') || 
      urlParams.get('server');
    
    if (paramBackendUrl) {
      console.log(`🔧 [CONFIG] Using backend URL from URL parameter: ${paramBackendUrl}`);
      return paramBackendUrl;
    }
    
    // 3. Check localStorage for persisted configuration
    const storedBackendUrl = localStorage.getItem('pcd_backend_url');
    if (storedBackendUrl) {
      console.log(`🔧 [CONFIG] Using stored backend URL: ${storedBackendUrl}`);
      return storedBackendUrl;
    }
    
    // 4. Check for data-api attribute on script tag
    const scriptTags = document.querySelectorAll('script');
    for (const script of scriptTags) {
      const apiUrl = script.getAttribute('data-api');
      if (apiUrl) {
        console.log(`🔧 [CONFIG] Using backend URL from script tag: ${apiUrl}`);
        return apiUrl;
      }
    }
    
    // 5. Infer from current hostname
    const currentHost = window.location.hostname;
    
    // If served from Railway production or Squarespace
    if (currentHost.includes('railway.app') || 
        currentHost.includes('squarespace.com') || 
        currentHost.includes('pleasantcovedesign.com')) {
      console.log('🔧 [CONFIG] Production environment detected');
      return PRODUCTION_URL;
    }
    
    // If served from local development
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      console.log('🔧 [CONFIG] Local development environment detected');
      return LOCAL_URL;
    }
    
    // 6. Default to production for safety
    console.log('🔧 [CONFIG] Using default production backend');
    return PRODUCTION_URL;
    
  } catch (error) {
    console.error('🔧 [CONFIG] Error detecting backend URL:', error);
    return PRODUCTION_URL; // Fail safe to production
  }
}

/**
 * Gets a consistent project token for the current widget and saves it
 * @param {string} backendUrl - The backend URL to use
 * @param {string} companyName - Optional company name
 * @param {string} projectType - Optional project type
 * @returns {Promise<string>} The project token
 */
async function getConsistentProjectToken(backendUrl, companyName, projectType) {
  try {
    // First, try to get from localStorage
    const savedToken = localStorage.getItem('pcd_project_token');
    if (savedToken) {
      console.log('🔑 [TOKEN] Using saved project token');
      return savedToken;
    }
    
    // If no saved token, request a new one from the server
    console.log('🔑 [TOKEN] Requesting new project token');
    
    // Default values if not provided
    companyName = companyName || 'Test User';
    projectType = projectType || 'Master Conversation';
    
    const response = await fetch(`${backendUrl}/api/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Widget-Version': '1.3.0',
        'X-Ngrok-Skip-Browser-Warning': 'true'
      },
      body: JSON.stringify({
        type: 'project',
        companyName: companyName,
        projectType: projectType
      })
    });
    
    const data = await response.json();
    
    if (data && data.token) {
      console.log('🔑 [TOKEN] Successfully obtained new project token');
      
      // Save to localStorage for future use
      localStorage.setItem('pcd_project_token', data.token);
      
      // Also save project ID for reference
      if (data.projectId) {
        localStorage.setItem('pcd_project_id', data.projectId);
      }
      
      return data.token;
    } else {
      throw new Error('Invalid token response');
    }
    
  } catch (error) {
    console.error('🔑 [TOKEN] Error getting project token:', error);
    throw error;
  }
}

/**
 * Establishes a reliable Socket.IO connection with proper error handling
 * @param {string} serverUrl - The server URL for Socket.IO
 * @param {string} projectToken - The project token for authentication
 * @param {Function} onConnect - Callback for connection success
 * @param {Function} onMessage - Callback for incoming messages
 * @param {Function} onError - Callback for errors
 * @returns {object} The Socket.IO instance
 */
function connectReliableSocket(serverUrl, projectToken, onConnect, onMessage, onError) {
  if (!window.io) {
    console.error('Socket.IO client not loaded');
    if (onError) onError('Socket.IO client not loaded');
    return null;
  }
  
  const socket = window.io(serverUrl, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    forceNew: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    auth: {
      token: projectToken
    },
    query: {
      token: projectToken,
      debug: localStorage.getItem('pcd_debug_mode') === 'true' ? 'true' : 'false'
    }
  });
  
  socket.on('connect', () => {
    console.log('🔌 [SOCKET] Connected successfully');
    
    // Join project room using token
    socket.emit('join-project', { token: projectToken }, (response) => {
      if (response && response.success) {
        console.log('🔌 [SOCKET] Successfully joined project room');
        if (onConnect) onConnect(socket);
      } else {
        console.error('🔌 [SOCKET] Failed to join project room:', response?.error || 'Unknown error');
        if (onError) onError('Failed to join project room');
      }
    });
    
    // Setup heartbeat to keep connection alive
    setInterval(() => {
      socket.emit('ping', { timestamp: Date.now() });
    }, 30000);
  });
  
  socket.on('message', (data) => {
    console.log('🔌 [SOCKET] Received message');
    if (onMessage) onMessage(data);
  });
  
  socket.on('disconnect', (reason) => {
    console.warn('🔌 [SOCKET] Disconnected:', reason);
  });
  
  socket.on('connect_error', (error) => {
    console.error('🔌 [SOCKET] Connection error:', error.message);
    if (onError) onError(`Connection error: ${error.message}`);
  });
  
  socket.on('error', (error) => {
    console.error('🔌 [SOCKET] Socket error:', error);
    if (onError) onError(`Socket error: ${error}`);
  });
  
  return socket;
}

/**
 * Creates a debug panel to help with connection troubleshooting
 */
function createDebugPanel() {
  const debugMode = localStorage.getItem('pcd_debug_mode') === 'true';
  const backendUrl = localStorage.getItem('pcd_backend_url') || 'Not set';
  const projectToken = localStorage.getItem('pcd_project_token') || 'Not set';
  const projectId = localStorage.getItem('pcd_project_id') || 'Not set';
  
  const panel = document.createElement('div');
  panel.style.position = 'fixed';
  panel.style.bottom = '10px';
  panel.style.right = '10px';
  panel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  panel.style.color = 'white';
  panel.style.padding = '10px';
  panel.style.borderRadius = '5px';
  panel.style.fontSize = '12px';
  panel.style.zIndex = '9999';
  panel.style.display = 'none'; // Hidden by default
  
  panel.innerHTML = `
    <div style="margin-bottom: 5px; font-weight: bold;">PCD Widget Debug</div>
    <div>Debug Mode: ${debugMode ? 'ON' : 'OFF'}</div>
    <div>Backend: ${backendUrl}</div>
    <div>Project ID: ${projectId}</div>
    <div>Token: ${projectToken.substring(0, 10)}...</div>
    <button id="pcd-debug-toggle" style="margin-top: 5px; padding: 3px; background: #444; border: none; color: white; cursor: pointer;">
      ${debugMode ? 'Disable Debug' : 'Enable Debug'}
    </button>
    <button id="pcd-debug-hide" style="margin-top: 5px; padding: 3px; background: #444; border: none; color: white; cursor: pointer; margin-left: 5px;">
      Hide Panel
    </button>
  `;
  
  document.body.appendChild(panel);
  
  // Show debug panel with keyboard shortcut (Ctrl+Shift+D)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
  });
  
  // Setup toggle button
  document.getElementById('pcd-debug-toggle').addEventListener('click', () => {
    const currentMode = localStorage.getItem('pcd_debug_mode') === 'true';
    localStorage.setItem('pcd_debug_mode', !currentMode);
    alert(`Debug mode ${!currentMode ? 'enabled' : 'disabled'}. Page will reload.`);
    location.reload();
  });
  
  // Setup hide button
  document.getElementById('pcd-debug-hide').addEventListener('click', () => {
    panel.style.display = 'none';
  });
}

// Expose functions globally
window.pcdUtils = {
  detectBackendUrl,
  getConsistentProjectToken,
  connectReliableSocket,
  createDebugPanel
};

// Initialize debug panel if query param is present
if (new URLSearchParams(window.location.search).get('debug') === 'true') {
  document.addEventListener('DOMContentLoaded', () => {
    createDebugPanel();
  });
}
