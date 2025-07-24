import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const requestId = Math.random().toString(36).substring(7);
  
  // Add request ID to req for tracing
  (req as any).requestId = requestId;
  
  // Log request start
  console.log(`🔵 [${timestamp}] ${requestId} ${req.method} ${req.path} - ${req.ip}`);
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(obj: any) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusEmoji = statusCode >= 400 ? '🔴' : statusCode >= 300 ? '🟡' : '🟢';
    
    console.log(`${statusEmoji} [${new Date().toISOString()}] ${requestId} ${req.method} ${req.path} - ${statusCode} (${duration}ms)`);
    
    // Log errors in detail
    if (statusCode >= 400 && obj?.error) {
      console.error(`❌ [${new Date().toISOString()}] ${requestId} ERROR:`, obj);
    }
    
    return originalJson.call(this, obj);
  };
  
  next();
}

// Error handling middleware
export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  const timestamp = new Date().toISOString();
  const requestId = (req as any).requestId || 'unknown';
  
  // Log error with context
  console.error(`💥 [${timestamp}] ${requestId} UNHANDLED ERROR:`, {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body
  });
  
  // Write error to file for persistence
  try {
    const errorLog = {
      timestamp,
      requestId,
      error: error.message,
      stack: error.stack,
      method: req.method,
      path: req.path,
      ip: req.ip
    };
    
    const logPath = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logPath)) {
      fs.mkdirSync(logPath, { recursive: true });
    }
    
    const errorFile = path.join(logPath, `errors-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(errorFile, JSON.stringify(errorLog) + '\n');
  } catch (logError) {
    console.error('Failed to write error log:', logError);
  }
  
  // Send appropriate response
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred',
      requestId
    });
  }
}

// API performance monitoring
export function performanceMonitor(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const requestId = (req as any).requestId || 'unknown';
    
    // Log slow requests (> 2 seconds)
    if (duration > 2000) {
      console.warn(`🐌 [${new Date().toISOString()}] ${requestId} SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
    }
    
    // Log API usage statistics
    if (req.path.startsWith('/api/')) {
      logAPIUsage(req.method, req.path, duration, res.statusCode);
    }
  });
  
  next();
}

// Simple API usage tracking
const apiStats = new Map<string, { count: number; totalTime: number; errors: number }>();

function logAPIUsage(method: string, path: string, duration: number, statusCode: number) {
  const key = `${method} ${path}`;
  const stats = apiStats.get(key) || { count: 0, totalTime: 0, errors: 0 };
  
  stats.count++;
  stats.totalTime += duration;
  if (statusCode >= 400) stats.errors++;
  
  apiStats.set(key, stats);
}

// Get API statistics
export function getAPIStats() {
  const stats: any[] = [];
  
  for (const [endpoint, data] of apiStats.entries()) {
    stats.push({
      endpoint,
      calls: data.count,
      avgTime: Math.round(data.totalTime / data.count),
      errorRate: ((data.errors / data.count) * 100).toFixed(1) + '%'
    });
  }
  
  return stats.sort((a, b) => b.calls - a.calls);
}

// Health check endpoint data
let serverStartTime = Date.now();

export function getHealthStats() {
  return {
    status: 'healthy',
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    apiStats: getAPIStats().slice(0, 10) // Top 10 most used endpoints
  };
} 