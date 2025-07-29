// Minimal test server for Railway debugging
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🔧 Starting minimal test server...');
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  HAS_DATABASE_URL: !!process.env.DATABASE_URL
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Minimal server working'
  });
});

app.get('/api/debug', (req, res) => {
  res.json({
    status: 'debug',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      HAS_DATABASE_URL: !!process.env.DATABASE_URL
    },
    platform: {
      node_version: process.version,
      platform: process.platform
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
  console.log(`📍 Health: /api/health`);
  console.log(`🔍 Debug: /api/debug`);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
}); 