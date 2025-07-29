// Minimal test server for Railway debugging
console.log('🔧 Starting minimal test server...');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('CWD:', process.cwd());

try {
  const express = require('express');
  console.log('✅ Express loaded successfully');
  
  const app = express();
  const PORT = process.env.PORT || 3000;

  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    HAS_DATABASE_URL: !!process.env.DATABASE_URL
  });

  app.get('/api/health', (req, res) => {
    console.log('Health check requested');
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      message: 'Minimal server working'
    });
  });

  app.get('/api/debug', (req, res) => {
    console.log('Debug endpoint requested');
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
        platform: process.platform,
        cwd: process.cwd()
      }
    });
  });

  // Catch-all error handler
  app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred',
      requestId: 'unknown'
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Minimal server running on port ${PORT}`);
    console.log(`📍 Health: /api/health`);
    console.log(`🔍 Debug: /api/debug`);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
  });

} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
} 