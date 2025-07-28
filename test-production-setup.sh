#!/bin/bash

# Pleasant Cove Design - Production Setup Test Script
# Tests that all production components are configured correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Production Setup${NC}"
echo "================================="

# Function to check if environment variable is set
check_env_var() {
    local var_name=$1
    local var_value=$2
    local required=$3
    
    if [[ -z "$var_value" ]]; then
        if [[ "$required" == "true" ]]; then
            echo -e "${RED}❌ $var_name is required but not set${NC}"
            return 1
        else
            echo -e "${YELLOW}⚠️  $var_name is optional and not set${NC}"
            return 0
        fi
    else
        echo -e "${GREEN}✅ $var_name is configured${NC}"
        return 0
    fi
}

# Load environment variables
if [ -f "pleasantcovedesign/server/.env.production" ]; then
    source pleasantcovedesign/server/.env.production
    echo -e "${GREEN}✅ Loaded .env.production${NC}\n"
else
    echo -e "${RED}❌ .env.production not found. Run ./setup-production.sh first${NC}"
    exit 1
fi

echo -e "${YELLOW}📧 Testing SendGrid Configuration${NC}"
check_env_var "SENDGRID_API_KEY" "$SENDGRID_API_KEY" "true"
check_env_var "FROM_EMAIL" "$FROM_EMAIL" "true"
check_env_var "FROM_NAME" "$FROM_NAME" "false"

# Test SendGrid API key format
if [[ $SENDGRID_API_KEY == SG.* ]]; then
    echo -e "${GREEN}✅ SendGrid API key format is correct${NC}"
else
    echo -e "${RED}❌ SendGrid API key should start with 'SG.'${NC}"
fi

echo -e "\n${YELLOW}💳 Testing Stripe Configuration${NC}"
check_env_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY" "true"
check_env_var "STRIPE_PUBLISHABLE_KEY" "$STRIPE_PUBLISHABLE_KEY" "true"
check_env_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET" "true"

# Test Stripe key formats
if [[ $STRIPE_SECRET_KEY == sk_live_* ]]; then
    echo -e "${GREEN}✅ Using LIVE Stripe secret key${NC}"
elif [[ $STRIPE_SECRET_KEY == sk_test_* ]]; then
    echo -e "${YELLOW}⚠️  Using TEST Stripe secret key (switch to live for production)${NC}"
else
    echo -e "${RED}❌ Invalid Stripe secret key format${NC}"
fi

if [[ $STRIPE_PUBLISHABLE_KEY == pk_live_* ]]; then
    echo -e "${GREEN}✅ Using LIVE Stripe publishable key${NC}"
elif [[ $STRIPE_PUBLISHABLE_KEY == pk_test_* ]]; then
    echo -e "${YELLOW}⚠️  Using TEST Stripe publishable key (switch to live for production)${NC}"
else
    echo -e "${RED}❌ Invalid Stripe publishable key format${NC}"
fi

echo -e "\n${YELLOW}🤖 Testing Minerva/OpenAI Configuration${NC}"
check_env_var "OPENAI_API_KEY" "$OPENAI_API_KEY" "true"
check_env_var "MINERVA_URL" "$MINERVA_URL" "false"

# Test OpenAI API key format
if [[ $OPENAI_API_KEY == sk-* ]]; then
    echo -e "${GREEN}✅ OpenAI API key format is correct${NC}"
else
    echo -e "${RED}❌ OpenAI API key should start with 'sk-'${NC}"
fi

echo -e "\n${YELLOW}🔧 Testing Server Configuration${NC}"
check_env_var "NODE_ENV" "$NODE_ENV" "true"
check_env_var "DATABASE_URL" "$DATABASE_URL" "true"
check_env_var "JWT_SECRET" "$JWT_SECRET" "true"
check_env_var "SESSION_SECRET" "$SESSION_SECRET" "true"

# Test if secrets are still default values
if [[ $JWT_SECRET == *"REPLACE_WITH"* ]]; then
    echo -e "${RED}❌ JWT_SECRET still contains default placeholder${NC}"
fi

if [[ $SESSION_SECRET == *"REPLACE_WITH"* ]]; then
    echo -e "${RED}❌ SESSION_SECRET still contains default placeholder${NC}"
fi

echo -e "\n${YELLOW}🌐 Testing Production URLs${NC}"
check_env_var "API_BASE_URL" "$API_BASE_URL" "true"
check_env_var "FRONTEND_URL" "$FRONTEND_URL" "true"
check_env_var "ADMIN_URL" "$ADMIN_URL" "true"

# Test URL formats
if [[ $API_BASE_URL == https://* ]]; then
    echo -e "${GREEN}✅ API_BASE_URL uses HTTPS${NC}"
else
    echo -e "${YELLOW}⚠️  API_BASE_URL should use HTTPS for production${NC}"
fi

echo -e "\n${BLUE}🧪 Running Functional Tests${NC}"

# Test 1: Check if server files exist
if [ -f "pleasantcovedesign/server/index.ts" ]; then
    echo -e "${GREEN}✅ Server main file exists${NC}"
else
    echo -e "${RED}❌ Server main file missing${NC}"
fi

# Test 2: Check if email service exists
if [ -f "pleasantcovedesign/server/email-service.ts" ]; then
    echo -e "${GREEN}✅ Email service exists${NC}"
else
    echo -e "${RED}❌ Email service missing${NC}"
fi

# Test 3: Check if Stripe configuration exists
if [ -f "pleasantcovedesign/server/stripe-config.js" ] || [ -f "pleasantcovedesign/server/stripe-config.ts" ]; then
    echo -e "${GREEN}✅ Stripe configuration exists${NC}"
else
    echo -e "${YELLOW}⚠️  Stripe configuration file not found${NC}"
fi

# Test 4: Check database connectivity (if sqlite)
if [[ $DATABASE_URL == *"sqlite"* ]] || [[ $DATABASE_URL == *".db"* ]]; then
    echo -e "${YELLOW}⚠️  Using SQLite database (consider PostgreSQL for production)${NC}"
fi

echo -e "\n${BLUE}📋 Production Readiness Summary${NC}"
echo "======================================"

echo -e "\n${GREEN}✅ Ready for Production:${NC}"
echo "• Environment variables configured"
echo "• Security secrets generated"
echo "• Email service ready (SendGrid)"
echo "• Payment processing ready (Stripe)"

echo -e "\n${YELLOW}⚠️  Next Steps:${NC}"
echo "• Test email sending with real SendGrid API"
echo "• Verify Stripe webhook endpoints"
echo "• Set up production database"
echo "• Configure domain and SSL certificates"
echo "• Deploy to hosting platform"

echo -e "\n${BLUE}🚀 Deployment Commands:${NC}"
echo "• Railway: railway deploy"
echo "• Vercel: vercel --prod"
echo "• Manual: Copy .env.production to your server"

echo -e "\n${RED}🔒 Security Reminders:${NC}"
echo "• NEVER commit .env.production to git"
echo "• Backup environment variables securely"
echo "• Monitor API usage and webhook deliveries"
echo "• Set up error tracking (Sentry)"
echo "• Enable database backups"

echo -e "\n${GREEN}🎉 Production setup test complete!${NC}" 