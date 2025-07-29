# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for server only
COPY pleasantcovedesign/server/package*.json ./

# Install dependencies with legacy peer deps flag for compatibility
RUN npm ci --legacy-peer-deps

# Copy TypeScript config and source code
COPY pleasantcovedesign/server/tsconfig.json ./
COPY pleasantcovedesign/server/ ./

# Copy client-widget for serving static files
COPY pleasantcovedesign/client-widget/ ./client-widget/

# Build TypeScript
RUN npm run build

# Remove unnecessary files to reduce image size
RUN rm -rf src/ tsconfig.json && npm cache clean --force

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"] 