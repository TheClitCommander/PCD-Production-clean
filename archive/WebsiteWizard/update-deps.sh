#!/bin/bash

# Exit on error
set -e

echo "🔄 Installing Socket.IO dependencies..."

# Install dependencies
npm install socket.io socket.io-client

echo "✅ Dependencies installed successfully!"

echo "🔧 Building the project..."
npm run build

echo "🚀 Ready to start! Run 'npm run dev' to start the development server." 