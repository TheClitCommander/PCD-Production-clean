#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 Pleasant Cove Design - Complete System Launcher"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

echo "📍 Current directory: $(pwd)"
echo ""

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
        echo "⚠️  Port $port is already in use"
        echo "🔄 Killing existing process on port $port..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $name to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo "✅ $name is ready!"
            return 0
        fi
        echo "   Attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $name failed to start after $max_attempts attempts"
    return 1
}

# Check Python virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "🐍 Activating Python environment..."
source venv/bin/activate

echo "📦 Installing Python dependencies..."
pip install -q selenium pandas openpyxl webdriver-manager requests beautifulsoup4

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
check_port 3000
check_port 3001
check_port 5173

# Start the backend server
echo "🔧 Starting Backend Server..."
cd pleasantcovedesign/server
if [ ! -d "node_modules" ]; then
    echo "📦 Installing server dependencies..."
    npm install
fi

echo "🏗️  Building server..."
npm run build

echo "🚀 Starting server on port 3001..."
PORT=3001 npm start &
SERVER_PID=$!
cd ../..

# Wait for server to be ready
if wait_for_service "http://localhost:3001/health" "Backend Server"; then
    echo "✅ Backend Server running at http://localhost:3001"
else
    echo "❌ Backend Server failed to start"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Start the Admin UI
echo "🎨 Starting Admin UI..."
cd pleasantcovedesign/admin-ui

if [ ! -d "node_modules" ]; then
    echo "📦 Installing UI dependencies..."
    npm install
fi

echo "🏗️  Starting UI development server..."
npm run dev &
UI_PID=$!
cd ../..

# Wait for UI to be ready
if wait_for_service "http://localhost:5173" "Admin UI"; then
    echo "✅ Admin UI running at http://localhost:5173"
else
    echo "❌ Admin UI failed to start"
    kill $UI_PID 2>/dev/null || true
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "🎉 PLEASANT COVE DESIGN SYSTEM IS READY!"
echo "========================================="
echo "🎨 Admin UI:     http://localhost:5173"
echo "🔧 Backend API:  http://localhost:3001"
echo "📊 Health Check: http://localhost:3001/health"
echo ""
echo "📋 Available Features:"
echo "   • Lead Management Dashboard"
echo "   • Business Scraping Tools"
echo "   • Automated Outreach Campaigns"
echo "   • Client Portal & Messaging"
echo "   • Demo Website Gallery"
echo ""
echo "🚀 Opening Admin UI in browser..."
sleep 3
open "http://localhost:5173"

echo ""
echo "💡 QUICK START GUIDE:"
echo "1. Go to 'Leads' tab to see scraped businesses"
echo "2. Use 'Outreach' tab to start campaigns"
echo "3. Check 'Inbox' for client messages"
echo "4. View 'Demo Gallery' for website examples"
echo ""
echo "⚠️  To stop the system: Press Ctrl+C or close this terminal"
echo "📝 Logs will appear below..."
echo ""

# Keep the script running and show logs
trap 'echo "🛑 Shutting down system..."; kill $SERVER_PID $UI_PID 2>/dev/null; exit 0' INT

# Show live logs from both services
echo "📊 Live System Logs:"
echo "==================="

# Wait for user to stop
wait $SERVER_PID $UI_PID
