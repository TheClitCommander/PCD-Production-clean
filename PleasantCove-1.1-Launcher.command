#!/bin/bash

# Pleasant Cove Design v1.1 Launcher - Production Mode
# This script starts the Admin UI and connects to Railway production backend

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

echo -e "${BLUE}🚀 Pleasant Cove Design v1.1 - Starting Your Day${NC}"
echo -e "${BLUE}======================================================${NC}"

# Kill any existing local UI processes
echo -e "${YELLOW}🔧 Cleaning up any old processes...${NC}"
pkill -f "vite" 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Wait for cleanup
sleep 1

# Start the Admin UI
echo -e "${YELLOW}🚀 Starting Admin UI...${NC}"
cd "$PROJECT_ROOT/pleasantcovedesign/admin-ui"
npm run dev &
UI_PID=$!

# Wait for UI to start
echo -e "${YELLOW}⏳ Waiting for Admin UI to start...${NC}"
UI_READY=0
for i in {1..30}; do
  if curl -sf http://localhost:5173 > /dev/null; then
    UI_READY=1
    break
  fi
  sleep 1
done

if [[ $UI_READY -eq 1 ]]; then
    echo -e "${GREEN}✅ Pleasant Cove Design Admin UI is ready!${NC}"
    echo ""
    echo -e "${GREEN}📊 Your Admin Dashboard is starting...${NC}"
    echo -e "${GREEN}📬 Messages and appointments from Railway production${NC}"
    echo -e "${GREEN}🌐 Backend running 24/7 on Railway${NC}"
    echo ""
    
    # Open Admin UI - it will automatically connect to production Railway
    echo -e "${YELLOW}🌐 Opening your Admin Dashboard...${NC}"
    sleep 1
    open "http://localhost:5173/inbox"
    
    echo ""
    echo -e "${GREEN}🎉 Ready for your day!${NC}"
    echo -e "${YELLOW}💡 This window will stay open to keep the UI running${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C when you're done for the day${NC}"
    
    # Keep the script running so UI stays up
    wait $UI_PID
else
    echo -e "${RED}❌ Failed to start Admin UI${NC}"
    echo -e "${RED}Please check for errors above and try again${NC}"
    kill $UI_PID 2>/dev/null || true
    exit 1
fi