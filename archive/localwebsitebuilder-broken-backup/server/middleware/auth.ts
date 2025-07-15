import { Request, Response, NextFunction } from "express";

// Admin token - in production, this should come from environment variables
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "pleasantcove2024admin";

// List of public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/api/progress/public",
  "/api/scheduling/booking",
  "/api/scheduling/slots",
  "/api/availability",
  "/api/blocked-dates",
];

// Frontend routes that should be public
const PUBLIC_FRONTEND_ROUTES = [
  "/progress/public",
  "/booking",
];

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Check if this is a public route
  const isPublicAPIRoute = PUBLIC_ROUTES.some(route => req.path.startsWith(route));
  const isPublicFrontendRoute = PUBLIC_FRONTEND_ROUTES.some(route => req.path.startsWith(route));
  
  // Allow public routes
  if (isPublicAPIRoute || isPublicFrontendRoute) {
    return next();
  }

  // Check for admin token in various places
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string;
  const cookieToken = req.cookies?.adminToken;

  const providedToken = authHeader?.replace("Bearer ", "") || queryToken || cookieToken;

  if (providedToken === ADMIN_TOKEN) {
    // Valid admin token
    return next();
  }

  // No valid token found
  res.status(401).json({ 
    error: "Unauthorized", 
    message: "Admin authentication required" 
  });
}

// Middleware to check if request is from admin (without blocking)
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string;
  const cookieToken = req.cookies?.adminToken;

  const providedToken = authHeader?.replace("Bearer ", "") || queryToken || cookieToken;

  // Attach admin status to request
  (req as any).isAdmin = providedToken === ADMIN_TOKEN;
  
  next();
} 