# Use Node.js 18 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy server package files
COPY pleasantcovedesign/server/package*.json ./

# Install dependencies with legacy peer deps flag for compatibility
RUN npm ci --legacy-peer-deps

# --- Add Python for scraper ---
RUN apk add --no-cache python3 py3-pip bash

# Install minimal Python deps using apk instead of pip
RUN apk add --no-cache py3-pandas py3-requests

# Copy TypeScript config and source code
COPY pleasantcovedesign/server/tsconfig.json ./
COPY pleasantcovedesign/server/ ./

# Copy client-widget for serving static files
COPY pleasantcovedesign/client-widget/ ./client-widget/

# Build the Admin UI (Vite) in a temp directory and copy into server dist
COPY pleasantcovedesign/admin-ui/package*.json /tmp/admin-ui/
RUN cd /tmp/admin-ui && npm ci --legacy-peer-deps
COPY pleasantcovedesign/admin-ui/ /tmp/admin-ui/
RUN cd /tmp/admin-ui && npm run build

# Build TypeScript (server)
RUN npm run build

# Copy built admin UI into server dist so Express can serve it
RUN mkdir -p /app/dist/client && cp -r /tmp/admin-ui/dist/client/* /app/dist/client/

# Copy the scrapers folder into the image so the server can run them
COPY scrapers /app/scrapers

# Create a direct upload handler
RUN echo '// Direct upload handler with R2 storage\n\
const express = require("express");\n\
const multer = require("multer");\n\
const path = require("path");\n\
const fs = require("fs");\n\
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");\n\
\n\
const router = express.Router();\n\
\n\
// Configure R2 client\n\
const r2Client = process.env.R2_ENDPOINT ? new S3Client({\n\
  region: process.env.R2_REGION || "auto",\n\
  endpoint: process.env.R2_ENDPOINT,\n\
  credentials: {\n\
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",\n\
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",\n\
  },\n\
  forcePathStyle: true,\n\
}) : null;\n\
\n\
const r2Bucket = process.env.R2_BUCKET || "";\n\
const r2Configured = !!(r2Client && r2Bucket);\n\
\n\
console.log(`R2 storage ${r2Configured ? "configured" : "NOT configured"}`);\n\
\n\
// Configure multer\n\
const upload = multer({\n\
  storage: multer.memoryStorage(),\n\
  limits: { fileSize: 10 * 1024 * 1024 },\n\
});\n\
\n\
// Direct upload endpoint\n\
router.post("/api/upload", upload.single("file"), async (req, res) => {\n\
  try {\n\
    console.log("Direct upload handler called");\n\
    \n\
    if (!req.file) {\n\
      return res.status(400).json({ error: "No file uploaded" });\n\
    }\n\
    \n\
    const timestamp = Date.now();\n\
    const originalName = req.file.originalname.replace(/\\s+/g, "_");\n\
    const filename = `${timestamp}-${originalName}`;\n\
    \n\
    // Use R2 if configured\n\
    if (r2Configured) {\n\
      console.log(`Uploading to R2: ${filename}`);\n\
      \n\
      try {\n\
        await r2Client.send(new PutObjectCommand({\n\
          Bucket: r2Bucket,\n\
          Key: `uploads/${filename}`,\n\
          Body: req.file.buffer,\n\
          ContentType: req.file.mimetype,\n\
        }));\n\
        \n\
        console.log(`Successfully uploaded to R2: ${filename}`);\n\
        \n\
        return res.json({\n\
          ok: true,\n\
          filename,\n\
          url: `/api/image-proxy/${filename}`,\n\
        });\n\
      } catch (r2Error) {\n\
        console.error("R2 upload failed:", r2Error);\n\
        // Fall back to local storage\n\
      }\n\
    }\n\
    \n\
    // Local storage fallback\n\
    console.log("Using local storage");\n\
    \n\
    const uploadsDir = path.join(process.cwd(), "uploads");\n\
    if (!fs.existsSync(uploadsDir)) {\n\
      fs.mkdirSync(uploadsDir, { recursive: true });\n\
    }\n\
    \n\
    const filePath = path.join(uploadsDir, filename);\n\
    fs.writeFileSync(filePath, req.file.buffer);\n\
    \n\
    console.log(`Saved to local storage: ${filePath}`);\n\
    \n\
    return res.json({\n\
      ok: true,\n\
      filename,\n\
      url: `/api/image-proxy/${filename}`,\n\
    });\n\
  } catch (error) {\n\
    console.error("Upload error:", error);\n\
    res.status(500).json({ error: "Upload failed" });\n\
  }\n\
});\n\
\n\
module.exports = router;\n' > /app/direct-upload.js

# Create a startup wrapper
RUN echo '// Load our direct upload handler first\n\
const express = require("express");\n\
const directUploadHandler = require("./direct-upload");\n\
\n\
// Monkey patch Express to intercept app.post("/api/upload")\n\
const originalPost = express.application.post;\n\
\n\
// Override the post method\n\
express.application.post = function(path, ...args) {\n\
  if (path === "/api/upload") {\n\
    console.log("🔒 INTERCEPTED app.post(\"/api/upload\") - legacy handler disabled");\n\
    // Do nothing - this effectively disables the legacy handler\n\
    return this;\n\
  }\n\
  // Call the original method for all other paths\n\
  return originalPost.call(this, path, ...args);\n\
};\n\
\n\
// Monkey patch app.use to inject our handler first\n\
const originalUse = express.application.use;\n\
express.application.use = function(...args) {\n\
  // If this is the first call to app.use, inject our handler\n\
  if (!this._directHandlerInjected) {\n\
    console.log("🔒 INJECTING direct upload handler");\n\
    originalUse.call(this, directUploadHandler);\n\
    this._directHandlerInjected = true;\n\
  }\n\
  // Call the original method\n\
  return originalUse.apply(this, args);\n\
};\n\
\n\
console.log("✅ Express monkey patched successfully");\n\
\n\
// Then load the original index.js\n\
require("./dist/index");' > /app/startup.js

# Remove unnecessary files to reduce image size
RUN rm -rf src/ tsconfig.json && npm cache clean --force

# Expose port
EXPOSE 3000

# Health check (match server's /health endpoint)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "startup.js"]