# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy server package files
COPY pleasantcovedesign/server/package*.json ./

# Install dependencies with legacy peer deps flag for compatibility
RUN npm ci --legacy-peer-deps

# --- Add Python for scraper ---
RUN apk add --no-cache python3 py3-pip bash

# Install minimal Python deps used by your scraper
RUN pip3 install --no-cache-dir requests pandas

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

# Remove unnecessary files to reduce image size
RUN rm -rf src/ tsconfig.json && npm cache clean --force

# Expose port
EXPOSE 3000

# Health check (match server's /health endpoint)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"] 