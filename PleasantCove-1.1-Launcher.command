#!/bin/bash

# Pleasant Cove Design v1.1 Launcher - Production Mode
cd "/Users/bendickinson/Desktop/pleasantcovedesign/pleasantcovedesign"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Pleasant Cove Design v1.1 Launcher - Production Mode${NC}"
echo -e "${BLUE}===============================================${NC}"

# Kill any existing local processes
echo -e "${YELLOW}🔧 Cleaning up existing local processes...${NC}"
pkill -f "vite" 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Wait for cleanup
sleep 2

# Test Railway backend connection
echo -e "${YELLOW}🔗 Testing Railway backend connection...${NC}"
if curl -s https://pcd-production-clean-production.up.railway.app/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Railway backend is online!${NC}"
else
    echo -e "${RED}❌ Cannot connect to Railway backend${NC}"
    echo -e "${RED}Please check Railway deployment status${NC}"
    exit 1
fi

# Start ONLY the React Admin UI (connects to Railway backend)
echo -e "${YELLOW}🚀 Starting Admin UI (connecting to Railway backend)...${NC}"
cd admin-ui
npm run dev &
UI_PID=$!

# Wait for frontend to start
echo -e "${YELLOW}⏳ Waiting for Admin UI to initialize...${NC}"
sleep 8

# Test if Admin UI is running
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Pleasant Cove Design v1.1 is running successfully!${NC}"
    echo -e "${GREEN}📍 Admin UI: http://localhost:5173${NC}"
    echo -e "${GREEN}🔗 Backend API: https://pcd-production-clean-production.up.railway.app/api${NC}"
    echo -e "${GREEN}🎯 Webhook URL: https://pcd-production-clean-production.up.railway.app/api/new-lead${NC}"
    echo ""
    echo -e "${BLUE}📋 Quick Access:${NC}"
    echo -e "${BLUE}• Dashboard: http://localhost:5173/dashboard${NC}"
    echo -e "${BLUE}• Inbox: http://localhost:5173/inbox${NC}"
    echo ""
    
    # Open the Admin Inbox automatically
    echo -e "${YELLOW}🌐 Opening Admin Inbox...${NC}"
    open http://localhost:5173/inbox
    
    echo -e "${GREEN}🎉 System is ready!${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C in terminal to stop the UI${NC}"
    echo -e "${BLUE}ℹ️  Backend running on Railway (always available)${NC}"
    
    # Keep the script running so user can see the output
    wait $UI_PID
else
    echo -e "${RED}❌ Failed to start Pleasant Cove Design v1.1${NC}"
    echo -e "${RED}Please check for errors above and try again${NC}"
    kill $UI_PID 2>/dev/null || true
    exit 1
fi 