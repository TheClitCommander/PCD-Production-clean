// Script to test the scraper functionality
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
    
    return response.data;
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Test the scraper
async function testScraper() {
  try {
    // 1. Check current lead count
    console.log('1. Checking current lead count...');
    const initialLeads = await apiRequest('GET', '/api/leads');
    console.log(`Initial lead count: ${initialLeads.total}`);
    console.log('Initial leads:', initialLeads.leads);
    
    // 2. Start a scrape run
    console.log('\n2. Starting scrape run...');
    const scrapeData = {
      city: 'Brunswick',
      category: 'plumber',
      limit: 3
    };
    const scrapeResponse = await apiRequest('POST', '/api/scrape-runs', scrapeData);
    console.log('Scrape response:', scrapeResponse);
    
    // 3. Wait for scrape to complete (5 seconds)
    console.log('\n3. Waiting for scrape to complete (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 4. Check scrape run status
    console.log('\n4. Checking scrape run status...');
    const runId = scrapeResponse.runId;
    const runStatus = await apiRequest('GET', `/api/scrape-runs/${runId}`);
    console.log('Run status:', runStatus);
    
    // 5. Check for new leads
    console.log('\n5. Checking for new leads...');
    const finalLeads = await apiRequest('GET', '/api/leads');
    console.log(`Final lead count: ${finalLeads.total}`);
    console.log('Final leads:', finalLeads.leads);
    
    // 6. Compare counts
    console.log('\n6. Comparing counts...');
    const initialCount = initialLeads.total || 0;
    const finalCount = finalLeads.total || 0;
    const newLeads = finalCount - initialCount;
    console.log(`New leads added: ${newLeads}`);
    
    if (newLeads > 0) {
      console.log('✅ Scraper is working! New leads were added.');
    } else {
      console.log('⚠️ No new leads were added. This could be because:');
      console.log('   - The scraper is not working correctly');
      console.log('   - All businesses were already in the database (deduplication)');
      console.log('   - The scraper is still running (try waiting longer)');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testScraper();
