/**
 * EMERGENCY FIX FOR UPLOADS
 * 
 * This file is a standalone script that can be run directly on the server
 * to fix the upload handler issue.
 * 
 * Usage:
 * 1. Push this file to the repo
 * 2. SSH into the server
 * 3. Run: node EMERGENCY_FIX.js
 */

const fs = require('fs');
const path = require('path');

console.log('🚨 EMERGENCY FIX: Starting upload handler fix');

// Path to the compiled routes.js file
const routesPath = path.join(process.cwd(), 'dist', 'routes.js');
const indexPath = path.join(process.cwd(), 'dist', 'index.js');

// Fix routes.js
try {
  console.log(`Checking for routes.js at ${routesPath}`);
  
  if (fs.existsSync(routesPath)) {
    console.log('Found routes.js, patching...');
    
    // Read the file
    let content = fs.readFileSync(routesPath, 'utf8');
    
    // Check if the file contains the legacy upload handler
    if (content.includes('app.post("/api/upload"') || content.includes("app.post('/api/upload'")) {
      console.log('Found legacy upload handler, removing...');
      
      // Replace the upload handler with a comment
      content = content.replace(
        /app\.post\(['"]\/api\/upload['"][\s\S]*?}\);/m,
        '// Legacy upload handler removed - using R2 storage instead\n'
      );
      
      // Write the file back
      fs.writeFileSync(routesPath, content, 'utf8');
      console.log('✅ Successfully patched routes.js');
    } else {
      console.log('No legacy upload handler found in routes.js');
    }
  } else {
    console.log('routes.js not found');
  }
} catch (error) {
  console.error('Error patching routes.js:', error);
}

// Create a direct upload handler
try {
  const handlerPath = path.join(process.cwd(), 'direct-upload.js');
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
  
  // Now modify index.js to use this handler
  if (fs.existsSync(indexPath)) {
    console.log('Found index.js, patching...');
    
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Add the direct upload handler import
    if (!indexContent.includes('direct-upload.js')) {
      const importLine = "const directUploadHandler = require('./direct-upload.js');";
      indexContent = importLine + '\n' + indexContent;
    }
    
    // Add the handler mounting before any other routes
    if (!indexContent.includes('app.use(directUploadHandler)')) {
      const mountPattern = /app\.use\s*\([^)]*\)/;
      const mountLine = "app.use(directUploadHandler); // EMERGENCY FIX: Direct upload handler";
      
      if (mountPattern.test(indexContent)) {
        indexContent = indexContent.replace(mountPattern, match => {
          return mountLine + '\n' + match;
        });
      } else {
        // If no app.use found, add it after app is created
        const appPattern = /const app\s*=\s*express\(\)/;
        if (appPattern.test(indexContent)) {
          indexContent = indexContent.replace(appPattern, match => {
            return match + ';\n' + mountLine;
          });
        }
      }
    }
    
    fs.writeFileSync(indexPath, indexContent, 'utf8');
    console.log('✅ Patched index.js to use direct upload handler');
  } else {
    console.log('index.js not found');
  }
} catch (error) {
  console.error('Error creating direct upload handler:', error);
}

console.log('🚨 EMERGENCY FIX: Complete. Restart the server to apply changes.');
