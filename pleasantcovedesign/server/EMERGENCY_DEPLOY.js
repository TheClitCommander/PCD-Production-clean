/**
 * EMERGENCY DEPLOY SCRIPT
 * This script is designed to be run at startup to fix the upload handler
 */

const fs = require('fs');
const path = require('path');

console.log('🚨 EMERGENCY DEPLOY: Starting...');

// Create a direct upload handler
try {
  const handlerPath = path.join(__dirname, 'direct-upload.js');
  console.log(`Creating direct upload handler at ${handlerPath}`);
  
  const handlerContent = `
// Direct upload handler with R2 storage
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const router = express.Router();

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

console.log(\`R2 storage \${r2Configured ? 'configured' : 'NOT configured'}\`);

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Direct upload endpoint
router.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('Direct upload handler called');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const timestamp = Date.now();
    const originalName = req.file.originalname.replace(/\\s+/g, '_');
    const filename = \`\${timestamp}-\${originalName}\`;
    
    // Use R2 if configured
    if (r2Configured) {
      console.log(\`Uploading to R2: \${filename}\`);
      
      try {
        await r2Client.send(new PutObjectCommand({
          Bucket: r2Bucket,
          Key: \`uploads/\${filename}\`,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        }));
        
        console.log(\`Successfully uploaded to R2: \${filename}\`);
        
        return res.json({
          ok: true,
          filename,
          url: \`/api/image-proxy/\${filename}\`,
        });
      } catch (r2Error) {
        console.error('R2 upload failed:', r2Error);
        // Fall back to local storage
      }
    }
    
    // Local storage fallback
    console.log('Using local storage');
    
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);
    
    console.log(\`Saved to local storage: \${filePath}\`);
    
    return res.json({
      ok: true,
      filename,
      url: \`/api/image-proxy/\${filename}\`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
`;
  
  fs.writeFileSync(handlerPath, handlerContent, 'utf8');
  console.log('✅ Created direct upload handler');
  
  // Monkey patch Express to intercept app.post('/api/upload')
  console.log('Monkey patching Express to intercept app.post calls...');
  
  const monkeyPatchPath = path.join(__dirname, 'monkey-patch.js');
  const monkeyPatchContent = `
// Monkey patch Express to intercept app.post('/api/upload')
const express = require('express');
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

// Load the direct upload handler
const directUploadHandler = require('./direct-upload');

// Monkey patch app.use to inject our handler first
const originalUse = express.application.use;
express.application.use = function(...args) {
  // If this is the first call to app.use, inject our handler
  if (!this._directHandlerInjected) {
    console.log('🔒 INJECTING direct upload handler');
    originalUse.call(this, directUploadHandler);
    this._directHandlerInjected = true;
  }
  // Call the original method
  return originalUse.apply(this, args);
};

console.log('✅ Express monkey patched successfully');
`;
  
  fs.writeFileSync(monkeyPatchPath, monkeyPatchContent, 'utf8');
  console.log('✅ Created monkey patch');
  
  // Create a startup wrapper
  const wrapperPath = path.join(__dirname, 'startup-wrapper.js');
  const wrapperContent = `
// Load our monkey patch first
require('./monkey-patch');

// Then load the original index.js
require('./index');
`;
  
  fs.writeFileSync(wrapperPath, wrapperContent, 'utf8');
  console.log('✅ Created startup wrapper');
  
  console.log('🚨 EMERGENCY DEPLOY: Complete. Update start command to: node startup-wrapper.js');
} catch (error) {
  console.error('Error in EMERGENCY_DEPLOY:', error);
}
