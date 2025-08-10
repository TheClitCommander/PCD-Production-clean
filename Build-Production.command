#!/bin/bash

# Pleasant Cove Design - Production Build Script
# This script builds the admin UI and server for production

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

echo -e "${BLUE}🏗️  Pleasant Cove Design - Production Build${NC}"
echo -e "${BLUE}===============================================${NC}"
echo -e "${YELLOW}🔧 Project Root: $PROJECT_ROOT${NC}"

# Build the admin UI
echo -e "${YELLOW}📦 Building admin UI...${NC}"
cd "$PROJECT_ROOT/pleasantcovedesign/admin-ui"
npm install
npm run build

# Check if build was successful
if [ ! -d "$PROJECT_ROOT/pleasantcovedesign/admin-ui/dist" ]; then
  echo -e "${RED}❌ Admin UI build failed${NC}"
  exit 1
fi

# Build the server
echo -e "${YELLOW}📦 Building server...${NC}"
cd "$PROJECT_ROOT/pleasantcovedesign/server"
npm install
npm run build

# Check if build was successful
if [ ! -d "$PROJECT_ROOT/pleasantcovedesign/server/dist" ]; then
  echo -e "${RED}❌ Server build failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Production build completed successfully!${NC}"

# Ask if user wants to run the production build locally
echo -e "${YELLOW}🚀 Do you want to run the production build locally? (y/n)${NC}"
read -r run_locally

if [[ $run_locally == "y" || $run_locally == "Y" ]]; then
  echo -e "${YELLOW}🚀 Starting production server...${NC}"
  cd "$PROJECT_ROOT"
  npm start
  
  # Wait for server to start
  sleep 5
  
  # Check if server is running
  SERVER_RUNNING=$(curl -s http://localhost:3000/health)
  
  if [[ $SERVER_RUNNING ]]; then
    echo -e "${GREEN}✅ Production server is running successfully!${NC}"
    echo -e "${GREEN}📍 Access the app at: http://localhost:3000${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C to stop the server${NC}"
  else
    echo -e "${RED}❌ Production server failed to start${NC}"
  fi
else
  echo -e "${BLUE}🔹 To run the production build:${NC}"
  echo -e "${BLUE}   cd $PROJECT_ROOT${NC}"
  echo -e "${BLUE}   npm start${NC}"
fi
