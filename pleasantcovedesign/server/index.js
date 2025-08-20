// This file is a wrapper around the real index.js
// It loads our emergency fix script first, then loads the real index.js

console.log('🚨 EMERGENCY FIX: Loading wrapper...');

// Create a direct upload handler
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

console.log('🚨 EMERGENCY FIX: Creating direct upload handler...');

// Monkey patch Express to intercept app.post('/api/upload')
const originalPost = express.application.post;

// Override the post method
express.application.post = function(path, ...args) {
  if (path === '/api/upload') {
    console.log('🔒 INTERCEPTED app.post("/api/upload") - legacy handler disabled');
    // Do nothing - this effectively disables the legacy handler
    return this;
  }
  // Call the original method for all other paths
  return originalPost.call(this, path, ...args);
};

// Create a direct handler
const directHandler = function(req, res, next) {
  // Only handle POST requests to /api/upload
  if (req.method !== 'POST' || req.path !== '/api/upload') {
    return next();
  }

  console.log('🔒 DIRECT HANDLER: Handling upload request');

  // Configure multer for memory storage
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
  }).single('file');

  // Process the upload
  upload(req, res, async function(err) {
    if (err) {
      console.error('🔒 DIRECT HANDLER: Upload error', err);
      return res.status(500).json({ error: 'Upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file' });
    }

    const original = req.file.originalname.replace(/\s+/g, '_');
    const filename = `${Date.now()}-${original}`;
    const contentType = req.file.mimetype || 'application/octet-stream';

    // Configure R2 client
    const r2Client = process.env.R2_ENDPOINT ? new S3Client({
      region: process.env.R2_REGION || 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: true,
    }) : null;

    const r2Bucket = process.env.R2_BUCKET || '';
    const r2Configured = !!(r2Client && r2Bucket);

    console.log(`🔒 DIRECT HANDLER: R2 storage ${r2Configured ? 'configured' : 'NOT configured'}`);

    if (r2Configured) {
      try {
        console.log(`🔒 DIRECT HANDLER: Uploading to R2: ${filename}`);
        await r2Client.send(new PutObjectCommand({
          Bucket: r2Bucket,
          Key: `uploads/${filename}`,
          Body: req.file.buffer,
          ContentType: contentType,
        }));
        console.log(`🔒 DIRECT HANDLER: Successfully uploaded to R2: ${filename}`);
        return res.json({
          ok: true,
          filename,
          url: `/api/image-proxy/${filename}`,
        });
      } catch (r2Error) {
        console.error('🔒 DIRECT HANDLER: R2 upload failed:', r2Error);
        // Fall back to local storage
      }
    }

    // Local storage fallback
    console.log('🔒 DIRECT HANDLER: Using local storage');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);
    console.log(`🔒 DIRECT HANDLER: Saved to local storage: ${filePath}`);
    return res.json({
      ok: true,
      filename,
      url: `/api/image-proxy/${filename}`,
    });
  });
};

// Monkey patch app.use to inject our handler first
const originalUse = express.application.use;
express.application.use = function(...args) {
  // If this is the first call to app.use, inject our handler
  if (!this._directHandlerInjected) {
    console.log('🔒 INJECTING direct upload handler');
    originalUse.call(this, directHandler);
    this._directHandlerInjected = true;
  }
  // Call the original method
  return originalUse.apply(this, args);
};

console.log('✅ Express monkey patched successfully');

// Now load the real index.js
console.log('🚨 EMERGENCY FIX: Loading real index.js...');
require('./dist/index');
