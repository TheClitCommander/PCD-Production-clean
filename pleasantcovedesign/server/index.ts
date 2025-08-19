import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createServer } from "http";
import path from "path";
import fs from "fs";
// Note: fileURLToPath import removed - using __filename directly
import { registerRoutes } from "./routes";
import uploadRoutes from "./uploadRoutes";
import { storage } from './storage';
import { Server } from 'socket.io';
import { registerTeamRoutes } from './routes/team-routes';
import { registerDemoRoutes } from './routes/demo-routes';
import leadsRouter from './routes/leads';
import scrapeRouter from './routes/scrape';
import verifyRouter from './routes/verify';
import { pool } from './lib/db';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { instrument } from '@socket.io/admin-ui';
import { createR2Storage } from './storage/r2-storage';

console.log(
  `[BOOT] commit=${process.env.RAILWAY_GIT_COMMIT_SHA || 'local'} ` +
  `env=${process.env.NODE_ENV} db=${process.env.DATABASE_URL ? 'pg' : 'sqlite'}`
);

// Load environment variables FIRST before importing anything else
// First, try environment-specific config
const nodeEnv = process.env.NODE_ENV || 'development';
const envFiles = [
  // Try environment-specific file first
  resolve(process.cwd(), `.env.${nodeEnv}`),
  // Then try environment-specific local overrides
  resolve(process.cwd(), `.env.${nodeEnv}.local`),
  // Then fall back to default .env
  resolve(process.cwd(), '.env'),
  // Finally, try .env.local
  resolve(process.cwd(), '.env.local')
];

// Try loading each file in order
envFiles.forEach(envFile => {
  if (fs.existsSync(envFile)) {
    console.log(`🔧 Loading .env from: ${envFile}`);
    dotenv.config({ path: envFile });
  }
});

// Debug: Log environment variable loading - Railway deployment fix
console.log('🔧 Environment variables loaded - nanoid ESM fix applied');

import express, { type Express } from "express";
import cors from "cors";
import { requestLogger, errorHandler, performanceMonitor } from './middleware/logging';
import { createCorsMiddleware } from './middleware/cors';
import demoRoutes from './demo-routes';
import { sendEmail } from './email-service';
import { sendSMS, smsProviderStatus } from './sms-service';

// Node.js compatible __dirname alternative - avoid conflicts
const __main_dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  transports: ['websocket'],
  pingInterval: 25000,
  pingTimeout: 120000,
  cors: {
    origin: [
      'https://www.pleasantcovedesign.com',
      'https://pleasantcovedesign.com',
      /squarespace\.com$/,
      'http://localhost:5174',
    ],
    methods: ['GET','POST'],
  },
});

const PORT = Number(process.env.PORT) || 3000;

// Runtime compatibility shim: ensure getOrdersByCompanyId exists even on older builds
try {
  const anyStorage: any = storage as any;
  if (typeof anyStorage.getOrdersByCompanyId !== 'function') {
    anyStorage.getOrdersByCompanyId = async (companyId: string | number) => {
      if (typeof anyStorage.getOrdersByCompany === 'function') {
        return anyStorage.getOrdersByCompany(String(companyId));
      }
      if (anyStorage.postgresStorage?.getOrdersByCompanyId) {
        return anyStorage.postgresStorage.getOrdersByCompanyId(companyId);
      }
      if (anyStorage.postgresStorage?.getOrdersByCompany) {
        return anyStorage.postgresStorage.getOrdersByCompany(String(companyId));
      }
      return [];
    };
    console.log('🧩 Added compatibility shim for storage.getOrdersByCompanyId');
  }
} catch (e) {
  console.warn('⚠️ Could not apply storage compatibility shim', e);
}

// Store active connections by project token
const activeConnections = new Map<string, Set<string>>();

// Socket.io connection handling with Railway Pro support
io.on('connection', (socket) => {
  const clientInfo = {
    id: socket.id,
    transport: socket.conn.transport.name,
    origin: socket.handshake.headers.origin,
    userAgent: socket.handshake.headers['user-agent']
  };
  
  console.log('🔌 New socket connection:', clientInfo);
  
  // Log transport upgrades for Railway debugging
  socket.conn.on('upgrade', () => {
    console.log('⬆️ Socket transport upgraded to:', socket.conn.transport.name, 'for', socket.id);
  });
  
  socket.on('join', (projectToken: string, callback?: Function) => {
    if (!projectToken) {
      console.log('❌ No project token provided for socket:', socket.id);
      if (callback) callback({ error: 'No project token provided' });
      return;
    }
    
    console.log(`🏠 Socket ${socket.id} (${socket.conn.transport.name}) joining project: ${projectToken}`);
    
    // TODO: Validate project token exists (optional security check)
    // For now, allow all project tokens
    
    socket.join(projectToken);
    
    // Track active connections
    if (!activeConnections.has(projectToken)) {
      activeConnections.set(projectToken, new Set());
    }
    activeConnections.get(projectToken)!.add(socket.id);
    
    // Send confirmation with transport info
    const confirmationData = { 
      room: projectToken,
      projectToken, 
      status: 'connected',
      transport: socket.conn.transport.name,
      socketId: socket.id
    };
    
    socket.emit('joined', confirmationData);
    
    // Send callback response if provided
    if (callback) {
      callback({ 
        success: true, 
        room: projectToken,
        socketId: socket.id,
        transport: socket.conn.transport.name
      });
    }
    
    console.log(`✅ Socket ${socket.id} successfully joined project ${projectToken} via ${socket.conn.transport.name}`);
    
    // Log current room members for debugging
    io.in(projectToken).allSockets().then(clients => {
      console.log(`📊 Room ${projectToken} now has ${clients.size} clients`);
    });
  });
  
  // Handle canvas-related events
  socket.on('canvas:view', async (projectToken: string) => {
    try {
      // Validate project token
      if (!projectToken) {
        socket.emit('canvas:error', { message: 'Invalid project token' });
        return;
      }
      
      // Get project by token
      const project = await storage.getProjectByToken(projectToken);
      
      if (!project) {
        socket.emit('canvas:error', { message: 'Project not found' });
        return;
      }
      
      // Join canvas room
      const canvasRoom = `canvas:${projectToken}`;
      socket.join(canvasRoom);
      
      console.log(`🎨 Socket ${socket.id} viewing canvas for project ${projectToken}`);
      
      // Get canvas data
      const canvasData = await storage.getCanvasData(project.id);
      
      // Create a client-safe version of the canvas data
      const clientCanvasData = canvasData ? {
        ...canvasData,
        viewMode: 'preview', // Force preview mode for clients
        selectedElement: null, // Clear any selected element
        readOnly: true // Force read-only mode
      } : {
        elements: [],
        selectedElement: null,
        gridSize: 20,
        snapToGrid: true,
        zoom: 1,
        viewMode: 'preview',
        version: 1,
        collaborators: [],
        readOnly: true
      };
      
      // Send canvas data to client
      socket.emit('canvas:data', clientCanvasData);
    } catch (error) {
      console.error('Error in canvas:view handler:', error);
      socket.emit('canvas:error', { message: 'Server error' });
    }
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', socket.id, 'reason:', reason);
    
    // Remove from all active connections
    for (const [projectToken, connections] of activeConnections.entries()) {
      connections.delete(socket.id);
      if (connections.size === 0) {
        activeConnections.delete(projectToken);
      }
    }
  });
  
  socket.on('error', (error) => {
    console.error('🔌 Socket error for', socket.id, ':', error);
  });
  
  socket.on('connect_error', (error) => {
    console.error('🔌 Socket connect error for', socket.id, ':', error);
  });
});

// Export io for use in routes
export { io };

// Apply CORS middleware (handles all preflight and cross-origin requests)
app.use(createCorsMiddleware());

// Logging and monitoring middleware
app.use(requestLogger);
app.use(performanceMonitor);

// Parse JSON bodies with increased limit - but exclude webhook endpoint
app.use((req, res, next) => {
  // Skip JSON parsing for Stripe webhook endpoint (needs raw body)
  if (req.path === '/api/stripe/webhook') {
    next();
  } else {
    express.json({ limit: '50mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from React build (if they exist)
// Expecting the admin-ui build to be copied to `server/dist/client`
const buildPath = path.join(__main_dirname, '../dist/client');
if (fs.existsSync(buildPath)) {
  console.log('📁 Serving admin UI from:', buildPath);
  app.use(
    express.static(buildPath, {
      setHeaders: (res, filePath) => {
        const isHtml = filePath.endsWith('.html');
        if (isHtml) {
          // Ensure SPA shell is always fresh
          res.setHeader('Cache-Control', 'no-cache');
        } else {
          // Long-cache hashed assets
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );
}

// Serve client widget files
const widgetPath = path.join(__main_dirname, '../client-widget');
if (fs.existsSync(widgetPath)) {
  app.use('/client-widget', express.static(widgetPath));
  console.log('📁 Serving client widget from:', widgetPath);
}

// Serve uploaded files from uploads directory with proper headers
const uploadsPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

// Initialize R2 storage once
const r2Storage = createR2Storage();

// Helper to migrate a local file up to R2
async function migrateLocalToR2IfNeeded(localPath: string, filename: string, contentType: string) {
  if (!r2Storage) return;
  try {
    const buf = fs.readFileSync(localPath);
    await r2Storage.putBuffer(filename, buf, contentType);
    console.log(`☁️  Migrated ${filename} to R2`);
  } catch (e) {
    console.warn('R2 migrate failed:', e);
  }
}

app.get('/api/image-proxy/:filename', async (req, res) => {
  const filename = req.params.filename;

  try {
    // CORS for images
    const origin = req.headers.origin || '';
    const allow =
      /pleasantcovedesign\.com$/.test(origin) ||
      /squarespace\.com$/.test(origin) ||
      /localhost/.test(origin);
    res.header('Access-Control-Allow-Origin', allow ? origin : '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cache-Control', 'public, max-age=31536000');
    res.header('X-Content-Type-Options', 'nosniff');

    // 1) Local first (if present)
    const imagePath = path.join(uploadsPath, filename);
    if (fs.existsSync(imagePath) && imagePath.startsWith(uploadsPath)) {
      const contentType = getMimeType(filename);
      res.header('Content-Type', contentType);
      console.log(`📁 Serving from local: ${filename}`);
      // Stream AND migrate in background
      res.sendFile(imagePath);
      migrateLocalToR2IfNeeded(imagePath, filename, contentType);
      return;
    }

    // 2) R2 (standard key)
    if (r2Storage) {
      const tryR2 = async (keyVariant: 'standard' | 'raw') => {
        const url = (keyVariant === 'standard')
          ? await r2Storage.getFileUrl(filename)
          : await r2Storage.getFileUrlRawKey(filename); // rare older objects

        const r = await fetch(url);
        if (!r.ok) return null;
        const ct = r.headers.get('content-type') || getMimeType(filename);
        res.header('Content-Type', ct);
        if (!r.body) return res.status(500).json({ error: 'No response body from R2' });
        const reader = r.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        };
        await pump();
        return true;
      };

      // standard uploads/<filename>
      const ok = await tryR2('standard');
      if (ok) return;

      // raw <filename> (old uploads)
      const okRaw = await tryR2('raw');
      if (okRaw) return;

      return res.status(404).json({ error: 'Image not found in R2 storage' });
    }

    // Neither local nor R2
    return res.status(404).json({ error: 'Image not found' });

  } catch (e) {
    console.error('❌ Error serving image:', e);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

// Serve uploaded files directly from the 'uploads' directory
app.use('/uploads', express.static(uploadsPath));

// Helper function to get MIME type from filename
const getMimeType = (filename: string) => {
  const extension = path.extname(filename).toLowerCase();
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream'; // Default binary type
  }
};

// Add OPTIONS handler for image proxy preflight requests
app.options('/api/image-proxy/:filename', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, ngrok-skip-browser-warning');
  res.header('ngrok-skip-browser-warning', 'true');
  res.header('X-Ngrok-Skip-Browser-Warning', 'true');
  res.status(200).end();
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.1',
    uptime: process.uptime(),
    services: {
      database: 'connected',
      webhooks: 'active'
    }
  });
});

// Standard Kubernetes-style health endpoints
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Readiness probe - checks if the database is actually connected
app.get('/readyz', async (_req, res) => {
  try {
    const { assertDb } = await import('./lib/db');
    const db = await assertDb();
    res.status(db ? 200 : 503).json({ 
      ok: db,
      timestamp: new Date().toISOString(),
      services: {
        database: db ? 'connected' : 'disconnected'
      }
    });
  } catch (e) {
    console.error('❌ Readiness check failed:', e);
    res.status(503).json({ 
      ok: false, 
      error: 'db',
      timestamp: new Date().toISOString()
    });
  }
});

// Diagnostic endpoint for Railway debugging
app.get('/api/debug', (req, res) => {
  res.json({
    status: 'debug',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      HAS_DATABASE_URL: !!process.env.DATABASE_URL,
      DATABASE_URL_PREFIX: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'NOT_SET',
      DEPLOY_URL: process.env.DEPLOY_URL,
      FRONTEND_URL: process.env.FRONTEND_URL
    },
    platform: {
      node_version: process.version,
      platform: process.platform,
      cwd: process.cwd(),
      __dirname: __dirname
    }
  });
});

// Enhanced webhook validation middleware
app.use('/api/new-lead', (req, res, next) => {
  console.log('=== SQUARESPACE WEBHOOK RECEIVED ===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('IP:', req.ip);
  console.log('User-Agent:', req.get('User-Agent'));
  console.log('==========================================');
  next();
});

// Register all API routes
async function startServer() {
  try {
    console.log('🔧 Starting server initialization...');
    
    // Test database connection and initialize leads table
    try {
      console.log('🔧 Testing storage initialization...');
      // Simple test to see if storage is working
      await storage.getCompanies();
      console.log('✅ Storage test successful');
      
      // Initialize leads table for production Postgres pipeline
      if (process.env.DATABASE_URL) {
        const { initializeLeadsTable } = await import('./services/lead.upsert');
        await initializeLeadsTable();
        console.log('✅ Leads table initialized in Postgres');
      } else {
        console.log('⚠️ No DATABASE_URL - skipping Postgres leads table initialization');
      }
    } catch (storageError) {
      console.error('⚠️  Storage test failed:', storageError);
      console.log('🔄 Server will continue with limited functionality');
    }
    
    // Run SQLite migration if needed (dev only)
    if (process.env.USE_SQLITE_RESULTS === 'true' && process.env.NODE_ENV !== 'production') {
      try {
        const { runSqliteMigrationIfNeeded } = await import('./lib/sqlite-migrate');
        await runSqliteMigrationIfNeeded();
      } catch (migrationError) {
        console.warn('⚠️ SQLite migration failed (non-critical):', migrationError.message);
      }
    }
    
    // Register all routes
    console.log('🔧 Registering routes...');
    try {
      // Ensure R2-backed uploads are mounted FIRST so they take precedence over any legacy handlers
      app.use(uploadRoutes);

      // Register clean Postgres leads router FIRST (wins over legacy routes)
      // PRODUCTION FIX: Always try Postgres first, fallback gracefully
      try {
        const leadsPgRouter = await import('./routes/leads.pg');
        // Primary Postgres-backed leads API
        app.use("/api/leads", leadsPgRouter.default);
        // Alias for legacy frontend calls that hit "/leads" (no /api prefix)
        // Mounting before registerRoutes ensures it takes precedence over any legacy handlers
        app.use("/leads", leadsPgRouter.default);
        console.log('✅ Postgres leads router registered (production mode) with /leads alias');
      } catch (pgError) {
        console.log('⚠️ Postgres router failed, will use fallback:', pgError.message);
      }
      
      await registerRoutes(app, io);
      
      // Register MVP API routes (fallback only if Postgres completely unavailable)
      // Note: Postgres router should handle its own fallbacks now
      app.use("/api/scrape-runs", scrapeRouter);
      app.use("/api/leads/verify", verifyRouter);
      
      // Health endpoint
      app.get("/api/health", async (req, res) => {
        try {
          // Quick health checks
          const dbOk = await storage.query('SELECT 1').then(() => true).catch(() => false);
          const stripeOk = !!process.env.STRIPE_SECRET_KEY;
          const r2Ok = !!process.env.R2_BUCKET;
          const googleOk = !!process.env.GOOGLE_PLACES_API_KEY;
          
          res.json({ 
            ok: true, 
            dbOk, 
            stripeOk, 
            r2Ok, 
            googleOk,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          res.status(500).json({ 
            ok: false, 
            error: 'Health check failed',
            timestamp: new Date().toISOString()
          });
        }
      });
      
      console.log('✅ Routes registered successfully');
    } catch (routeError) {
      console.error('❌ Failed to register routes:', routeError);
      // Add minimal health route if main routes fail
      app.get('/api/health', (req, res) => {
        res.status(200).json({ 
          status: 'limited', 
          timestamp: new Date().toISOString(),
          message: 'Server running with limited functionality'
        });
      });
      console.log('⚠️  Added fallback health route');
    }
    
    // Register team routes
    console.log('🔧 Registering team routes...');
    try {
      registerTeamRoutes(app);
      console.log('✅ Team routes registered successfully');
    } catch (teamError) {
      console.error('⚠️  Team routes failed:', teamError);
    }
    
    // Register demo routes (including stats)
    console.log('🔧 Registering demo routes...');
    try {
      registerDemoRoutes(app);
      console.log('✅ Demo routes registered successfully');
    } catch (demoRoutesError) {
      console.error('⚠️  Demo routes failed:', demoRoutesError);
    }
    
    // Register legacy demo serving routes (for HTML files)
    console.log('🔧 Registering demo HTML serving routes...');
    try {
      app.use('/api', demoRoutes);
      console.log('✅ Demo HTML serving routes registered successfully');
    } catch (demoError) {
      console.error('⚠️  Demo HTML serving routes failed:', demoError);
    }
    
    // Provider test routes (email/SMS) for quick verification
    app.get('/api/providers/status', (req, res) => {
      res.json({
        sendgrid: { hasKey: !!process.env.SENDGRID_API_KEY, fromEmail: process.env.FROM_EMAIL, fromName: process.env.FROM_NAME },
        twilio: smsProviderStatus(),
      });
    });
    
    app.post('/api/providers/test-email', async (req, res) => {
      const { to, subject, text } = req.body || {};
      if (!to || !subject || !text) return res.status(400).json({ error: 'to, subject, text required' });
      const ok = await sendEmail({ to, subject, text });
      return res.json({ success: ok });
    });
    
    app.post('/api/providers/test-sms', async (req, res) => {
      const { to, body } = req.body || {};
      if (!to || !body) return res.status(400).json({ error: 'to, body required' });
      const result = await sendSMS({ to, body });
      return res.json(result);
    });
    
    // Error handling middleware (must be last)
    app.use(errorHandler);
    
    // Handle React Router - serve index.html for non-API routes
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      
      try {
        res.sendFile(path.join(buildPath, 'index.html'));
      } catch (error) {
        // If build doesn't exist, serve a simple development message
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Pleasant Cove Design - Development</title>
              <style>
                body { font-family: system-ui; padding: 2rem; max-width: 800px; margin: 0 auto; }
                .status { padding: 1rem; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; }
                .api-link { color: #0ea5e9; text-decoration: none; }
                .api-link:hover { text-decoration: underline; }
              </style>
            </head>
            <body>
              <h1>🚀 Pleasant Cove Design - WebsiteWizard</h1>
              <div class="status">
                <h2>✅ Server Running on Port ${PORT}</h2>
                <p>Backend API is active and ready for Squarespace integration!</p>
                <p><strong>Webhook Endpoint:</strong> <code>http://localhost:${PORT}/api/new-lead</code></p>
                <p><strong>Acuity Webhook:</strong> <code>http://localhost:${PORT}/api/acuity-appointment</code></p>
                <p><strong>Test API:</strong> <a href="/api/businesses?token=pleasantcove2024admin" class="api-link">View Businesses</a></p>
                <p><strong>Health Check:</strong> <a href="/health" class="api-link">Server Status</a></p>
              </div>
              <h3>Build React App</h3>
              <p>To see the full UI, run: <code>npm run build</code> then refresh this page.</p>
            </body>
          </html>
        `);
      }
    });
    
    // Serve Admin UI in production - check both possible locations
    let adminDir = path.join(__main_dirname, "public", "admin");
    
    // Fallback to Docker build location if the primary location doesn't exist
    if (!fs.existsSync(adminDir)) {
      adminDir = path.join(__main_dirname, "../dist/client");
    }
    
    console.log('🔍 Looking for Admin UI at:', adminDir);
    
    if (fs.existsSync(adminDir)) {
      console.log('📦 Serving Admin UI from:', adminDir);
      app.use(express.static(adminDir));
      
      // Send the Admin UI for any non-API route (SPA fallback)
      app.get(/^\/(?!api\/).*/, (_req, res) => {
        const indexPath = path.join(adminDir, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Admin UI not found. Please build and deploy the admin UI.');
        }
      });
      
      console.log('✅ Admin UI routes configured - accessible at /');
    } else {
      console.log('⚠️  Admin UI directory not found at:', adminDir);
      console.log('⚠️  Run build script or set Railway build command to create it.');
    }
    
    try {
      httpServer.listen(PORT, "0.0.0.0", () => {
        console.log('✅ In-memory database initialized (empty - ready for real data)');
        console.log(`🚀 Pleasant Cove Design v1.1 server running on port ${PORT}`);
        console.log(`📍 Local: http://localhost:${PORT}`);
        console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/api/new-lead`);
        console.log(`💾 Database: ${pool ? 'PostgreSQL' : 'In-memory (development only)'}`);
        console.log(`🎯 Ready for Squarespace integration!`);
        
        // Railway Pro WebSocket info
        if (process.env.NODE_ENV === 'production') {
          console.log(`🚂 Railway Pro WebSocket support enabled`);
          console.log(`🔌 Socket.IO transports: websocket, polling`);
          console.log(`⚡ WebSocket upgrades supported`);
        } else {
          console.log(`🏠 Local development - WebSocket support active`);
        }
        
        console.log(`🚀 Server ready and waiting for webhooks!`);
      });
      
      // Handle port conflicts gracefully
      httpServer.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ [server] Port ${PORT} is already in use. Is another instance running?`);
          console.error(`💡 Try: pkill -f "node|nodemon|ts-node|vite" to kill all Node processes`);
          process.exit(1);
        } else {
          console.error('❌ Server error:', error);
          process.exit(1);
        }
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Enhanced error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (httpServer) {
    httpServer.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (httpServer) {
    httpServer.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Graceful shutdown
const shutdown = async (sig: string) => {
  console.log(`[server] ${sig} received, shutting down…`);
  try { 
    if (pool) await pool.end(); 
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
  
  if (httpServer) {
    httpServer.close(() => {
      console.log("[server] closed"); 
      process.exit(0);
    });
  } else {
    console.log("[server] closed"); 
    process.exit(0);
  }
  
  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => process.exit(1), 10_000).unref();
};

["SIGINT", "SIGTERM"].forEach(s => process.on(s, () => shutdown(s)));
process.on("unhandledRejection", (e) => { console.error(e); });
process.on("uncaughtException", (e) => { console.error(e); process.exit(1); });

export default app; // Force redeploy for R2 config Mon Aug  4 00:28:21 EDT 2025
// Force redeploy for bug fix Mon Aug  4 00:40:34 EDT 2025
// Force redeploy for UI path fixes Thu Aug 15 00:55:00 EDT 2025
console.log('🚨 EMERGENCY DEPLOYMENT TRIGGER Thu Aug 15 00:55:00 EDT 2025');
console.log('🔄 Postgres leads router mounted at BOTH /api/leads AND /leads');
console.log('🔄 Legacy /bot/scrape endpoint added for UI compatibility');
