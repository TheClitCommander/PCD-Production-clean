// Ultra minimal server for Railway
console.log('🚀 Starting ultra minimal server...');

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT_SET'
});

app.use(express.json());

app.get('/api/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    message: 'Ultra minimal server working!'
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Ultra minimal Pleasant Cove server running!' });
});

// Catch all errors
app.use((error, req, res, next) => {
  console.error('❌ Express error:', error);
  res.status(500).json({ error: 'Server error', message: error.message });
});

// Handle 404s
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Ultra minimal server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
}); 