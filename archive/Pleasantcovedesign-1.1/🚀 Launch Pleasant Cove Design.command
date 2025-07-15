#!/bin/bash

# Pleasant Cove Design - Quick Launcher
# Double-click this file to start the application

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Clear the terminal
clear

echo "🚀 Pleasant Cove Design Launcher"
echo "================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "📍 Current directory: $(pwd)"
    echo "🔍 Please make sure this launcher is in the project root directory."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "✅ Found project files"
echo "📍 Working directory: $(pwd)"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies... (this may take a few minutes)"
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        read -p "Press Enter to exit..."
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
    echo ""
fi

echo "🔧 Starting development server..."
echo "⏳ Please wait while the server starts up..."
echo ""

# Start the server
npm run dev &
SERVER_PID=$!

# Wait for server to start
sleep 4

# Open browser
URL="http://localhost:5173"
echo "🌐 Opening $URL..."
open "$URL"

echo ""
echo "✅ Pleasant Cove Design is now running!"
echo "🖥️  Local server: $URL"
echo "🆔 Server process ID: $SERVER_PID"
echo ""
echo "💡 Tips:"
echo "   • Keep this terminal window open to keep the server running"
echo "   • Press Ctrl+C to stop the server"
echo "   • Close this window to stop the server"
echo ""

# Keep the terminal open and wait for the server process
wait $SERVER_PID 