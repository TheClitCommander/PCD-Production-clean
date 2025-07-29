// Simplest possible Railway test
console.log('🎯 RAILWAY TEST STARTING');
const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  console.log('🚀 Request received:', req.url);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  
  if (req.url === '/api/health') {
    res.end(JSON.stringify({ 
      status: 'WORKING!',
      message: 'Railway test server is running!',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.end(JSON.stringify({ 
      message: 'Railway test server active!',
      url: req.url,
      time: new Date().toISOString()
    }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 RAILWAY TEST SERVER RUNNING ON PORT ${PORT}`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
}); 