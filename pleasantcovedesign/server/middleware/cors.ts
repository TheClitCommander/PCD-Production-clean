import { Request, Response, NextFunction } from 'express';
import cors from 'cors';

// Production-ready CORS configuration
export function createCorsMiddleware() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Parse allowed origins from environment (comma-separated)
  const envOrigins = process.env.CORS_ORIGINS?.split(',').map(origin => origin.trim()) || [];
  
  // Default development origins
  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080'
  ];

  // Standard production domains
  const productionDomains = [
    'https://pleasantcovedesign.com',
    'https://www.pleasantcovedesign.com',
    'https://admin.pleasantcovedesign.com',
    'https://api.pleasantcovedesign.com'
  ];

  // Add Railway production URL if available
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    productionDomains.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  }

  // Legacy Railway URL (can be removed once env is updated)
  if (!process.env.RAILWAY_PUBLIC_DOMAIN) {
    productionDomains.push('https://pcd-production-clean-production-e6f3.up.railway.app');
  }

  // Merge all origins: environment + default + production, removing duplicates
  const allOrigins = [...new Set([...envOrigins, ...defaultOrigins, ...productionDomains])];
  
  console.log('🌐 CORS configured origins:', allOrigins.length, 'total');

  const corsOptions: cors.CorsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, health checks, curl)
      if (!origin) {
        console.log('✅ CORS: Allowing request with no origin header (health check/monitoring)');
        return callback(null, true);
      }

      // ALWAYS allow localhost and file:// access for testing/admin UI
      if (origin === 'null' || 
          origin.includes('localhost') || 
          origin.includes('127.0.0.1') ||
          origin.includes('file://')) {
        console.log(`✅ CORS: Allowing local/file access: ${origin}`);
        return callback(null, true);
      }

      // Check if origin is allowed
      if (allOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow Squarespace domains (dynamic check) - Enhanced for all Squarespace variants
      if (origin.includes('.squarespace.com') || 
          origin.includes('.squarespace-cdn.com') ||
          origin.includes('.sqsp.net') ||
          origin.includes('.squarespace-internal.com') ||
          origin.includes('.squarespace.dev') ||
          origin.includes('squarespace.com')) {
        console.log(`✅ CORS: Allowing Squarespace domain: ${origin}`);
        return callback(null, true);
      }

      // Log rejected origins for debugging
      console.warn(`CORS: Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    
    credentials: true, // Allow cookies and auth headers
    
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-Project-Token',
      'Accept',
      'Accept-Language',
      'Content-Language',
      'Last-Event-ID',
      'ngrok-skip-browser-warning',
      'Cache-Control',
      'Pragma',
      'Expires',
      'If-Modified-Since',
      'If-None-Match'
    ],
    
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-Current-Page',
      'X-Per-Page',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
    
    maxAge: isDevelopment ? 600 : 86400, // 10 minutes in dev, 24 hours in production
    
    preflightContinue: false,
    
    optionsSuccessStatus: 204
  };

  return cors(corsOptions);
}

// Additional security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove powered by header
  res.removeHeader('X-Powered-By');
  
  // Content Security Policy (adjust as needed)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' https://api.zoom.us wss://pleasantcovedesign.com; " +
      "frame-src 'self' https://zoom.us;"
    );
  }
  
  // Strict Transport Security (only on HTTPS)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
}

// Rate limiting configuration
export function createRateLimitConfig() {
  return {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    
    // Custom handler for rate limit exceeded
    handler: (req: Request, res: Response) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: res.getHeader('Retry-After')
      });
    },
    
    // Skip rate limiting for certain IPs (e.g., monitoring services)
    skip: (req: Request) => {
      const trustedIPs = process.env.TRUSTED_IPS?.split(',') || [];
      return req.ip ? trustedIPs.includes(req.ip) : false;
    }
  };
} 