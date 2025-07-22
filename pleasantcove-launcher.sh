#!/bin/bash

# Pleasant Cove Design - 24/7 Launcher
# This script ensures your services run continuously

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Pleasant Cove Design - 24/7 Launcher${NC}"
echo "========================================"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on a port
kill_port() {
    local port=$1
    echo -e "${YELLOW}🔄 Cleaning up port $port...${NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Cleanup function
cleanup_all() {
    echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
    
    # Kill specific processes
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "tsx watch" 2>/dev/null || true
    pkill -f "serve client-widget" 2>/dev/null || true
    pkill -f "concurrently" 2>/dev/null || true
    
    # Kill processes on specific ports
    kill_port 3000  # Backend server
    kill_port 5173  # Admin UI
    kill_port 8080  # Widget server
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Start services function
start_services() {
    echo -e "${BLUE}🏁 Starting Pleasant Cove Design services...${NC}"
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed. Please install Node.js${NC}"
        exit 1
    fi
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing dependencies...${NC}"
        npm install
    fi
    
    # Install sub-project dependencies
    if [ ! -d "pleasantcovedesign/server/node_modules" ] || [ ! -d "pleasantcovedesign/admin-ui/node_modules" ]; then
        echo -e "${YELLOW}📦 Installing sub-project dependencies...${NC}"
        npm run install:all
    fi
    
    # Start all services
    echo -e "${GREEN}🚀 Starting all services...${NC}"
    npm run dev &
    
    # Wait for services to start
    echo -e "${YELLOW}⏳ Waiting for services to initialize...${NC}"
    sleep 10
    
    # Check if services are running
    check_services
}

# Check services function
check_services() {
    echo -e "${BLUE}🔍 Checking service status...${NC}"
    
    local all_good=true
    
    # Check Backend (port 3000)
    if check_port 3000; then
        echo -e "${GREEN}✅ Backend Server: Running on http://localhost:3000${NC}"
    else
        echo -e "${RED}❌ Backend Server: Not running${NC}"
        all_good=false
    fi
    
    # Check Admin UI (port 5173)
    if check_port 5173; then
        echo -e "${GREEN}✅ Admin UI: Running on http://localhost:5173${NC}"
    else
        echo -e "${RED}❌ Admin UI: Not running${NC}"
        all_good=false
    fi
    
    # Check Widget Server (port 8080)
    if check_port 8080; then
        echo -e "${GREEN}✅ Widget Server: Running on http://localhost:8080${NC}"
    else
        echo -e "${RED}❌ Widget Server: Not running${NC}"
        all_good=false
    fi
    
    if $all_good; then
        echo -e "${GREEN}"
        echo "🎉 All services are running successfully!"
        echo ""
        echo "📱 Admin Dashboard: http://localhost:5173"
        echo "🖥️  Backend API: http://localhost:3000"
        echo "🔧 Widget Test: http://localhost:8080"
        echo ""
        echo "💡 Services will run in the background"
        echo "💡 Use 'pkill -f \"npm run dev\"' to stop all services"
        echo -e "${NC}"
    else
        echo -e "${RED}❌ Some services failed to start. Check the logs above.${NC}"
        return 1
    fi
}

# Monitor services function (for 24/7 operation)
monitor_services() {
    echo -e "${BLUE}👀 Starting 24/7 monitoring...${NC}"
    echo "Press Ctrl+C to stop monitoring"
    
    while true; do
        sleep 30  # Check every 30 seconds
        
        # Check if any service is down and restart if needed
        if ! check_port 3000 || ! check_port 5173 || ! check_port 8080; then
            echo -e "${YELLOW}⚠️  Service down detected. Restarting...${NC}"
            cleanup_all
            start_services
        fi
    done
}

# Main execution
case "${1:-start}" in
    "start")
        cleanup_all
        start_services
        ;;
    "stop")
        cleanup_all
        echo -e "${GREEN}✅ All services stopped${NC}"
        ;;
    "restart")
        cleanup_all
        start_services
        ;;
    "status")
        check_services
        ;;
    "monitor")
        cleanup_all
        start_services
        monitor_services
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|monitor}"
        echo ""
        echo "  start   - Start all services once"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        echo "  status  - Check service status"
        echo "  monitor - Start services with 24/7 monitoring"
        exit 1
        ;;
esac 