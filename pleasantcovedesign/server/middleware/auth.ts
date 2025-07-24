import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Environment variables for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'pleasantcove-dev-secret-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Extended Request interface to include user data
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: 'admin' | 'user';
    permissions?: string[];
  };
}

// Generate JWT token
export function generateToken(payload: { id: string; email?: string; role: 'admin' | 'user' }): string {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN as any,
    issuer: 'pleasant-cove-design'
  });
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Middleware to authenticate requests
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // Check for token in Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No valid token provided'
      });
    }

    // Verify the token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Token verification failed'
      });
    }

    // Add user info to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || []
    };

    console.log(`🔑 Authenticated user: ${req.user.email || req.user.id} (${req.user.role})`);
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Invalid or expired token'
    });
  }
}

// Middleware to check admin role
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      message: 'This action requires administrator privileges'
    });
  }
  next();
}

// Middleware for optional authentication (doesn't block if no token)
export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || []
      };
    }
  }
  
  next();
}

// Development login endpoint (for testing)
export function createDevAuthRoutes(app: any) {
  // Development login (creates a token for testing)
  app.post('/api/auth/dev-login', (req: Request, res: Response) => {
    const { email, role = 'admin' } = req.body;
    
    // In development, allow easy login
    const token = generateToken({
      id: 'dev-user-123',
      email: email || 'admin@pleasantcovedesign.com',
      role: role as 'admin' | 'user'
    });
    
    res.json({
      success: true,
      token,
      user: {
        id: 'dev-user-123',
        email: email || 'admin@pleasantcovedesign.com',
        role: role
      },
      message: 'Development login successful'
    });
  });

  // Token validation endpoint
  app.get('/api/auth/validate', authenticate, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      success: true,
      user: req.user,
      message: 'Token is valid'
    });
  });

  // Logout endpoint (client-side token removal)
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
} 