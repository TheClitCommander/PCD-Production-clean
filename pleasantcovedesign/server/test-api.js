// Test script to verify API endpoints
const axios = require('axios');

// Configuration
const API_URL = process.argv[2] || 'http://localhost:3000';
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
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status,
      error: error.message,
      data: error.response?.data
    };
  }
}

// Test health endpoints
async function testHealth() {
  console.log('\n=== Testing Health Endpoints ===');
  
  const healthz = await apiRequest('GET', '/healthz');
  console.log('GET /healthz:', healthz.success ? '✅' : '❌', healthz.status);
  
  const readyz = await apiRequest('GET', '/readyz');
  console.log('GET /readyz:', readyz.success ? '✅' : '❌', readyz.status);
  
  const apiHealth = await apiRequest('GET', '/api/health');
  console.log('GET /api/health:', apiHealth.success ? '✅' : '❌', apiHealth.status);
  
  return healthz.success && readyz.success && apiHealth.success;
}

// Test leads endpoints
async function testLeads() {
  console.log('\n=== Testing Leads Endpoints ===');
  
  // Test /api/leads
  const apiLeads = await apiRequest('GET', '/api/leads');
  console.log('GET /api/leads:', apiLeads.success ? '✅' : '❌', apiLeads.status);
  console.log('Source:', apiLeads.data?.source || 'unknown');
  console.log('Total leads:', apiLeads.data?.total || 0);
  
  // Test /leads (without /api prefix)
  const leads = await apiRequest('GET', '/leads');
  console.log('GET /leads:', leads.success ? '✅' : '❌', leads.status);
  console.log('Source:', leads.data?.source || 'unknown');
  
  // Test /api/leads/count
  const leadsCount = await apiRequest('GET', '/api/leads/count');
  console.log('GET /api/leads/count:', leadsCount.success ? '✅' : '❌', leadsCount.status);
  console.log('Total count:', leadsCount.data?.total || 0);
  
  return apiLeads.success && leads.success && leadsCount.success;
}

// Test scraper endpoints
async function testScraper() {
  console.log('\n=== Testing Scraper Endpoints ===');
  
  // Test data
  const scrapeData = {
    location: 'Brunswick',
    businessType: 'plumber',
    maxResults: 2
  };
  
  // Test /api/bot/scrape
  const apiBotScrape = await apiRequest('POST', '/api/bot/scrape', scrapeData);
  console.log('POST /api/bot/scrape:', apiBotScrape.success ? '✅' : '❌', apiBotScrape.status);
  console.log('Run ID:', apiBotScrape.data?.runId || 'unknown');
  console.log('Leads found:', apiBotScrape.data?.leadsFound || 0);
  
  // Test /bot/scrape (without /api prefix)
  const botScrape = await apiRequest('POST', '/bot/scrape', scrapeData);
  console.log('POST /bot/scrape:', botScrape.success ? '✅' : '❌', botScrape.status);
  console.log('Run ID:', botScrape.data?.runId || 'unknown');
  
  // If scrape was successful, wait and check for new leads
  if (apiBotScrape.success) {
    console.log('\nWaiting 5 seconds for scrape to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check for new leads
    const newLeads = await apiRequest('GET', '/api/leads');
    console.log('GET /api/leads after scrape:', newLeads.success ? '✅' : '❌', newLeads.status);
    console.log('Total leads after scrape:', newLeads.data?.total || 0);
  }
  
  return apiBotScrape.success && botScrape.success;
}

// Run all tests
async function runTests() {
  console.log(`\n🚀 Testing API at: ${API_URL}`);
  
  const healthOk = await testHealth();
  const leadsOk = await testLeads();
  const scraperOk = await testScraper();
  
  console.log('\n=== Test Summary ===');
  console.log('Health endpoints:', healthOk ? '✅' : '❌');
  console.log('Leads endpoints:', leadsOk ? '✅' : '❌');
  console.log('Scraper endpoints:', scraperOk ? '✅' : '❌');
  
  const allOk = healthOk && leadsOk && scraperOk;
  console.log('\nOverall result:', allOk ? '✅ All tests passed' : '❌ Some tests failed');
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
