#!/bin/bash

# Build and Deploy Admin UI to Server
# This script builds the Admin UI with production settings and copies it to the server

echo "🚀 Building Admin UI for production..."

# Navigate to admin-ui directory
cd pleasantcovedesign/admin-ui

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm ci

# Build with same-origin API (since it will be served from the same domain)
echo "🔨 Building Admin UI..."
VITE_API_URL=/api VITE_WS_URL= npm run build

# Navigate back to root
cd ../..

# Create the public/admin directory in server/dist
echo "📁 Creating server public directory..."
mkdir -p pleasantcovedesign/server/dist/public/admin

# Copy the built files (from client subdirectory)
echo "📋 Copying built files to server..."
cp -R pleasantcovedesign/admin-ui/dist/client/* pleasantcovedesign/server/dist/public/admin/

echo "✅ Admin UI built and deployed to server!"
echo ""
echo "📝 Next steps:"
echo "1. Deploy your server to Railway"
echo "2. Access Admin UI at: https://your-railway-url.up.railway.app/leads"
echo ""
echo "🎯 The Admin UI is now bundled with your backend!"
