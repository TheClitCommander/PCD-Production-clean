// Railway diagnostic script
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🔍 RAILWAY DIAGNOSTIC STARTING...');

// Log all environment variables (masked)
console.log('📋 Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET (' + process.env.DATABASE_URL.substring(0, 20) + '...)' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');

app.use(express.json());

// Health endpoint that shows diagnostics
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check requested');
  
  const diagnostics = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'
    },
    platform: {
      node_version: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };
  
  res.json(diagnostics);
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.json({
      error: 'DATABASE_URL not set',
      message: 'Add DATABASE_URL environment variable'
    });
  }
  
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query('SELECT NOW()');
    await client.end();
    
    res.json({ 
      database: 'connected',
      message: 'Database connection successful'
    });
  } catch (error) {
    res.json({
      database: 'failed',
      error: error.message,
      code: error.code
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Railway diagnostic server running on port ${PORT}`);
});

console.log('✅ Railway diagnostic server started'); 