// Test script to diagnose Railway API issues
const axios = require('axios');

// Configuration
const API_URL = process.argv[2] || 'https://pcd-production-clean-production-e6f3.up.railway.app';
const AUTH_TOKEN = 'pleasantcove2024admin';

// Helper function to make authenticated requests
async function apiRequest(method, endpoint, data = null) {
  try {
    const url = `${API_URL}${endpoint}`;
    console.log(`${method} ${url}`);
    
    const config = {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    let response;
    if (method === 'GET') {
      response = await axios.get(url, config);
    } else if (method === 'POST') {
      response = await axios.post(url, data, config);
    }
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    
    return {
      success: false,
      status: error.response?.status,
      error: error.message,
      data: error.response?.data
    };
  }
}

// Run tests
async function runTests() {
  // Test health endpoints
  console.log('\n=== Testing Health Endpoints ===');
  await apiRequest('GET', '/health');
  await apiRequest('GET', '/healthz');
  await apiRequest('GET', '/readyz');
  await apiRequest('GET', '/api/health');
  
  // Test debug endpoint
  console.log('\n=== Testing Debug Endpoint ===');
  await apiRequest('GET', '/api/debug');
  
  // Test leads endpoints
  console.log('\n=== Testing Leads Endpoints ===');
  await apiRequest('GET', '/api/leads');
  await apiRequest('GET', '/leads');
  await apiRequest('GET', '/api/leads/count');
  
  // Test scraper
  console.log('\n=== Testing Scraper ===');
  await apiRequest('POST', '/api/bot/scrape', {
    location: 'Brunswick',
    businessType: 'plumber',
    maxResults: 2
  });
  
  // Test alternative scraper endpoint
  console.log('\n=== Testing Alternative Scraper Endpoint ===');
  await apiRequest('POST', '/bot/scrape', {
    location: 'Brunswick',
    businessType: 'plumber',
    maxResults: 2
  });
  
  console.log('\n=== Testing Scrape Runs ===');
  await apiRequest('POST', '/api/scrape-runs', {
    city: 'Brunswick',
    category: 'plumber',
    limit: 2
  });
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
