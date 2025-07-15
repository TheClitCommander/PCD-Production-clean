#!/bin/bash

# Pleasant Cove Design Launcher Script
# This script starts the development server and opens the app in your browser

cd "$(dirname "$0")"

echo "🚀 Starting Pleasant Cove Design..."
echo "📍 Working directory: $(pwd)"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server in the background
echo "🔧 Starting development server..."
npm run dev &
SERVER_PID=$!

# Wait a moment for the server to start
echo "⏳ Waiting for server to start..."
sleep 3

# Try to open the browser
URL="http://localhost:5173"
echo "🌐 Opening $URL in your browser..."

# Open in default browser (macOS)
open "$URL"

echo "✅ Pleasant Cove Design is now running!"
echo "💡 Server PID: $SERVER_PID"
echo "🛑 To stop the server later, run: kill $SERVER_PID"
echo "🔄 Or press Ctrl+C in this terminal"

# Keep the script running so the server stays alive
wait $SERVER_PID 