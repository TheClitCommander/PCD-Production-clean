// Minimal test server for Railway debugging
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🔧 Test server starting...');
console.log('Environment variables check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Present' : 'Missing');

app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ 
    status: 'success', 
    message: 'Test server working!',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'Railway test server operational',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Railway Test Server',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Test server error:', error);
  res.status(500).json({ 
    error: 'Test server error',
    message: error.message 
  });
});

app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`🔗 Test URL: http://localhost:${PORT}/test`);
}); 