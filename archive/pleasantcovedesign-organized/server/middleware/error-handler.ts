/**
 * Error handling middleware for Pleasant Cove Design
 * Standardizes error responses across the API
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Global error handling middleware
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  // Log error for debugging
  console.error('Error:', err);
  
  // Handle specific error types
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Authentication is required to access this resource' 
    });
    return;
  }
  
  if (err.name === 'ValidationError') {
    res.status(400).json({ 
      error: 'Bad Request', 
      message: err.message,
      details: err.details
    });
    return;
  }
  
  if (err.name === 'NotFoundError' || err.status === 404) {
    res.status(404).json({ 
      error: 'Not Found', 
      message: err.message || 'Resource not found'
    });
    return;
  }
  
  // File upload errors from multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ 
      error: 'File Too Large', 
      message: 'The uploaded file exceeds the size limit'
    });
    return;
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    res.status(400).json({ 
      error: 'Invalid Upload', 
      message: 'Unexpected file in upload request'
    });
    return;
  }
  
  // Default to 500 Internal Server Error
  const isDev = process.env.NODE_ENV !== 'production';
  
  res.status(500).json({ 
    error: 'Server Error', 
    message: 'An unexpected error occurred',
    // Only include detailed error in development
    ...(isDev ? { 
      details: err.message,
      stack: err.stack
    } : {})
  });
} 