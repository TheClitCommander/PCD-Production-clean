/**
 * Environment utilities for Pleasant Cove Design
 * Provides consistent environment detection across the application
 */

/**
 * Determines the base URL for the backend based on environment
 * @returns {string} The base URL for the backend API
 */
export function getBaseUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    return 'https://pleasantcovedesign-production.up.railway.app';
  }
  
  // Check for ngrok tunnel for local HTTPS testing
  if (process.env.NGROK_URL) {
    return process.env.NGROK_URL;
  }
  
  // Local development
  return `http://localhost:${process.env.PORT || 3000}`;
}

/**
 * Determines if we're in development mode
 * @returns {boolean} True if in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

/**
 * Gets the allowed origins for CORS based on environment
 * @returns {(string|RegExp)[]} Array of allowed origins for CORS
 */
export function getAllowedOrigins(): (string | RegExp)[] {
  const origins = [
    // Local development
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    
    // Production domains
    'https://www.pleasantcovedesign.com',
    'https://pleasantcovedesign.com',
    
    // Squarespace domains
    /\.squarespace\.com$/,
    /\.squarespace-cdn\.com$/,
    
    // Railway production
    'https://pleasantcovedesign-production.up.railway.app',
    
    // Testing tools
    /\.ngrok-free\.app$/,
    /\.ngrok\.io$/
  ];
  
  // Filter out empty values
  return origins.filter(Boolean);
} 