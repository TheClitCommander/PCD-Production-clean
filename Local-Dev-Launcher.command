#!/bin/bash

# Pleasant Cove Design - Local Development Launcher
# This script starts all necessary services for local development

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Set the project root
PROJECT_ROOT="$SCRIPT_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Pleasant Cove Design - Local Development Launcher${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${YELLOW}🔧 Project Root: $PROJECT_ROOT${NC}"

# Kill any existing local processes
echo -e "${YELLOW}🔧 Cleaning up existing local processes...${NC}"
pkill -f "vite" 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
pkill -f "node pleasantcovedesign/server" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Wait for cleanup
sleep 2

# Start all services using the root package.json
echo -e "${YELLOW}🚀 Starting all development services...${NC}"
cd "$PROJECT_ROOT"
npm run dev &
DEV_PID=$!

# Wait for services to start
echo -e "${YELLOW}⏳ Waiting for services to initialize...${NC}"
sleep 10

# Test if services are running
SERVER_RUNNING=$(curl -s http://localhost:3000/health)
UI_RUNNING=$(curl -s http://localhost:5173)

if [[ $SERVER_RUNNING ]] && [[ $UI_RUNNING ]]; then
    echo -e "${GREEN}✅ Pleasant Cove Design is running successfully!${NC}"
    echo -e "${GREEN}📍 Admin UI: http://localhost:5173${NC}"
    echo -e "${GREEN}🔗 Backend API: http://localhost:3000${NC}"
    echo ""
    echo -e "${BLUE}📋 Quick Access:${NC}"
    echo -e "${BLUE}• Dashboard: http://localhost:5173/dashboard${NC}"
    echo -e "${BLUE}• Inbox: http://localhost:5173/inbox${NC}"
    echo ""
    
    # Open the Admin Inbox automatically
    echo -e "${YELLOW}🌐 Opening Admin UI...${NC}"
    open http://localhost:5173
    
    echo -e "${GREEN}🎉 System is ready!${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C in terminal to stop all services${NC}"
    
    # Keep the script running so user can see the output
    wait $DEV_PID
else
    echo -e "${RED}❌ Failed to start Pleasant Cove Design${NC}"
    if ! [[ $SERVER_RUNNING ]]; then
        echo -e "${RED}   - Backend server failed to start on port 3000${NC}"
    fi
    if ! [[ $UI_RUNNING ]]; then
        echo -e "${RED}   - Admin UI failed to start on port 5173${NC}"
    fi
    echo -e "${RED}Please check for errors above and try again${NC}"
    kill $DEV_PID 2>/dev/null || true
    exit 1
fi

