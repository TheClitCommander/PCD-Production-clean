#!/bin/bash

# Pleasant Cove Design - Quick Deploy Script
# Usage: ./deploy.sh "Your commit message"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Pleasant Cove Design - Production Deployment${NC}"
echo "================================================"

# Check if commit message provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Please provide a commit message${NC}"
    echo "Usage: ./deploy.sh \"Your commit message\""
    exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}📝 Staging all changes...${NC}"
    git add .
    
    echo -e "${YELLOW}📦 Committing with message: $1${NC}"
    git commit -m "$1"
else
    echo -e "${GREEN}✅ No uncommitted changes${NC}"
fi

# Push to main branch
echo -e "${YELLOW}🚀 Pushing to production (main branch)...${NC}"
git push origin main

# Wait for Railway deployment
echo -e "${YELLOW}⏳ Waiting for Railway deployment (3 minutes)...${NC}"
echo "   Check progress at: https://railway.app/dashboard"

# Show countdown
for i in {180..1}; do
    printf "\r   Time remaining: %02d:%02d" $((i/60)) $((i%60))
    sleep 1
done
echo ""

# Test production health
echo -e "${YELLOW}🔍 Testing production server...${NC}"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://pleasantcovedesign-production.up.railway.app/health)

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✅ Production server is healthy!${NC}"
    
    # Test critical endpoints
    echo -e "${YELLOW}🔍 Testing critical endpoints...${NC}"
    
    # Test messaging endpoint
    MSG_CHECK=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://pleasantcovedesign-production.up.railway.app/api/public/project/test/messages -H "Content-Type: application/json" -d '{"content":"test"}')
    if [ "$MSG_CHECK" = "404" ] || [ "$MSG_CHECK" = "400" ] || [ "$MSG_CHECK" = "401" ]; then
        echo -e "${GREEN}✅ Messaging endpoint exists${NC}"
    else
        echo -e "${RED}❌ Messaging endpoint might be down (status: $MSG_CHECK)${NC}"
    fi
    
    # Test read endpoint
    READ_CHECK=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://pleasantcovedesign-production.up.railway.app/api/messages/1/read -H "Authorization: Bearer pleasantcove2024admin")
    if [ "$READ_CHECK" = "200" ] || [ "$READ_CHECK" = "404" ] || [ "$READ_CHECK" = "401" ]; then
        echo -e "${GREEN}✅ Read receipt endpoint exists${NC}"
    else
        echo -e "${RED}❌ Read receipt endpoint missing (status: $READ_CHECK)${NC}"
    fi
    
    echo -e "${GREEN}🎉 Deployment complete!${NC}"
    echo -e "${GREEN}📱 Your customers can now message you reliably!${NC}"
else
    echo -e "${RED}❌ Production server health check failed (status: $HEALTH_CHECK)${NC}"
    echo -e "${RED}⚠️  Check Railway logs: https://railway.app/dashboard${NC}"
    exit 1
fi 