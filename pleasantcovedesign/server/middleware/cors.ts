import { Request, Response, NextFunction } from 'express';
import cors from 'cors';

// Production-ready CORS configuration
export function createCorsMiddleware() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Parse allowed origins from environment
  const allowedOrigins = process.env.CORS_ORIGINS?.split(' ') || [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080'
  ];

  // Always include production domains if they exist
  const productionDomains = [
    'https://pleasantcovedesign.com',
    'https://www.pleasantcovedesign.com',
    'https://admin.pleasantcovedesign.com',
    'https://api.pleasantcovedesign.com',
    'https://pcd-production-clean-production.up.railway.app',
    'https://nectarine-sparrow-dwsp.squarespace.com',
    'https://1ce2-2603-7080-e501-3f6a-59ca-c294-1beb-ddfc.ngrok-free.app',
    'http://192.168.1.87:3000'
  ];

  // Merge origins, removing duplicates
  const allOrigins = [...new Set([...allowedOrigins, ...productionDomains])];

  const corsOptions: cors.CorsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) {
        if (isDevelopment) {
          return callback(null, true);
        }
        // In production, be more restrictive
        return callback(new Error('No origin header present'));
      }

      // Check if origin is allowed
      if (allOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow localhost in development
      if (isDevelopment && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }

      // Allow Squarespace domains (dynamic check)
      if (origin.includes('.squarespace.com') || origin.includes('.squarespace-cdn.com')) {
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
      'ngrok-skip-browser-warning'
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