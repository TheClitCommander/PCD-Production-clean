/**
 * File path utilities for Pleasant Cove Design
 * Provides consistent file path handling across the application
 */
import { getBaseUrl } from './environment';

/**
 * Gets the full URL for a file in the local uploads directory
 * @param {string} filename - The filename
 * @returns {string} The full URL to the file
 */
export function getLocalFileUrl(filename: string): string {
  return `${getBaseUrl()}/uploads/${filename}`;
}

/**
 * Gets the full URL for a file in R2 storage
 * @param {string} key - The R2 storage key
 * @returns {string} The full URL to the file in R2
 */
export function getR2FileUrl(key: string): string {
  const r2Endpoint = process.env.R2_ENDPOINT;
  const r2Bucket = process.env.R2_BUCKET;
  
  if (!r2Endpoint || !r2Bucket) {
    throw new Error('R2 storage not properly configured');
  }
  
  return `${r2Endpoint}/${r2Bucket}/${key}`;
}

/**
 * Generates a unique filename for uploads
 * @param {string} originalName - The original filename
 * @param {string} [prefix='file'] - Optional prefix for the filename
 * @returns {string} A unique filename safe for storage
 */
export function generateUniqueFilename(originalName: string, prefix: string = 'file'): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  return `${prefix}-${timestamp}-${randomString}-${safeName}`;
}

/**
 * Determines the public URL for an uploaded file based on storage type
 * @param {any} file - The file object from multer
 * @returns {string} The public URL to access the file
 */
export function getFileUrlFromMulter(file: any): string {
  // Check if the file was uploaded to R2
  if (file.location) {
    return file.location;
  }
  
  // Check if we have an R2 key
  if (file.key && process.env.R2_ENDPOINT && process.env.R2_BUCKET) {
    return getR2FileUrl(file.key);
  }
  
  // Default to local file storage
  return getLocalFileUrl(file.filename);
} 