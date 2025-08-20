/**
 * CRITICAL OVERRIDE: This file ensures the R2-backed upload handler is used
 * 
 * This file is loaded early in the server startup process to ensure
 * the legacy upload handler is disabled and only the R2-backed handler
 * from uploadRoutes.ts is used.
 */

import express from 'express';
import { createR2Storage } from './storage/r2-storage';

// Create a function that will be called during server startup
export function overrideUploadHandler(app: express.Express): void {
  console.log('🔒 OVERRIDE: Ensuring R2-backed upload handler is used');
  
  // Explicitly remove any existing handlers for these routes
  app._router?.stack?.forEach((layer: any, i: number) => {
    if (layer?.route?.path === '/api/upload') {
      console.log('🔄 Removing legacy /api/upload handler');
      app._router.stack.splice(i, 1);
    }
  });
  
  // Log R2 storage status
  const r2 = createR2Storage();
  if (r2) {
    console.log('✅ R2 storage configured and ready');
  } else {
    console.log('⚠️ R2 storage not configured - uploads will use local storage');
  }
}
