#!/bin/bash

# Pleasant Cove Design - Production Setup Script
# This script helps set up the production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Pleasant Cove Design - Production Setup${NC}"
echo "==========================================="

# Check if we're in the right directory
if [ ! -f "pleasantcovedesign/server/package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Function to generate secure random string
generate_secret() {
    openssl rand -base64 32 2>/dev/null || echo "REPLACE_WITH_SECURE_SECRET_$(date +%s)"
}

echo -e "\n${YELLOW}📋 Step 1: Setting up environment files${NC}"

# Copy production template
if [ -f "pleasantcovedesign/server/.env.production.template" ]; then
    cp "pleasantcovedesign/server/.env.production.template" "pleasantcovedesign/server/.env.production"
    echo -e "${GREEN}✅ Created .env.production template${NC}"
else
    echo -e "${RED}❌ Production template not found${NC}"
    exit 1
fi

# Generate secure secrets
JWT_SECRET=$(generate_secret)
SESSION_SECRET=$(generate_secret)

# Update secrets in production file
sed -i.bak "s/REPLACE_WITH_SECURE_JWT_SECRET_32_CHARS/$JWT_SECRET/" "pleasantcovedesign/server/.env.production"
sed -i.bak "s/REPLACE_WITH_SECURE_SESSION_SECRET_32_CHARS/$SESSION_SECRET/" "pleasantcovedesign/server/.env.production"
rm "pleasantcovedesign/server/.env.production.bak"

echo -e "${GREEN}✅ Generated secure JWT and session secrets${NC}"

echo -e "\n${YELLOW}📧 Step 2: SendGrid Configuration${NC}"
echo "1. Go to https://app.sendgrid.com/settings/api_keys"
echo "2. Create a new API key with Full Access"
echo "3. Copy the API key (starts with SG.)"
echo ""
read -p "Enter your SendGrid API key: " SENDGRID_KEY

if [[ $SENDGRID_KEY == SG.* ]]; then
    sed -i.bak "s/SG.YOUR_SENDGRID_API_KEY_HERE/$SENDGRID_KEY/" "pleasantcovedesign/server/.env.production"
    rm "pleasantcovedesign/server/.env.production.bak"
    echo -e "${GREEN}✅ SendGrid API key configured${NC}"
else
    echo -e "${YELLOW}⚠️ Warning: API key doesn't start with 'SG.' - please verify${NC}"
fi

echo -e "\n${YELLOW}💳 Step 3: Stripe Live Keys${NC}"
echo "⚠️  WARNING: You're about to configure LIVE Stripe keys"
echo "   This will process REAL payments!"
echo ""
read -p "Are you sure you want to configure live Stripe keys? (y/N): " confirm

if [[ $confirm =~ ^[Yy]$ ]]; then
    echo "1. Go to https://dashboard.stripe.com/apikeys"
    echo "2. Switch to LIVE mode (toggle in left sidebar)"
    echo "3. Copy your live secret key (starts with sk_live_)"
    echo ""
    read -p "Enter your Stripe LIVE secret key: " STRIPE_SECRET

    if [[ $STRIPE_SECRET == sk_live_* ]]; then
        sed -i.bak "s/sk_live_YOUR_LIVE_SECRET_KEY_HERE/$STRIPE_SECRET/" "pleasantcovedesign/server/.env.production"
        rm "pleasantcovedesign/server/.env.production.bak"
        echo -e "${GREEN}✅ Stripe live secret key configured${NC}"

        echo ""
        read -p "Enter your Stripe LIVE publishable key: " STRIPE_PUBLISHABLE
        if [[ $STRIPE_PUBLISHABLE == pk_live_* ]]; then
            sed -i.bak "s/pk_live_YOUR_LIVE_PUBLISHABLE_KEY_HERE/$STRIPE_PUBLISHABLE/" "pleasantcovedesign/server/.env.production"
            rm "pleasantcovedesign/server/.env.production.bak"
            echo -e "${GREEN}✅ Stripe live publishable key configured${NC}"
        fi

        echo ""
        echo "4. Set up webhook at: https://dashboard.stripe.com/webhooks"
        echo "   URL: https://api.pleasantcovedesign.com/api/stripe/webhook"
        echo "   Events: checkout.session.completed, payment_intent.succeeded, charge.succeeded, charge.updated"
        read -p "Enter your webhook signing secret: " WEBHOOK_SECRET
        if [[ $WEBHOOK_SECRET == whsec_* ]]; then
            sed -i.bak "s/whsec_YOUR_LIVE_WEBHOOK_SECRET_HERE/$WEBHOOK_SECRET/" "pleasantcovedesign/server/.env.production"
            rm "pleasantcovedesign/server/.env.production.bak"
            echo -e "${GREEN}✅ Stripe webhook secret configured${NC}"
        fi
    else
        echo -e "${RED}❌ Error: Invalid Stripe secret key format${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Skipping Stripe live keys configuration${NC}"
fi

echo -e "\n${YELLOW}🤖 Step 4: OpenAI API Configuration (Powers Minerva)${NC}"
echo "1. Go to https://platform.openai.com/api-keys"
echo "2. Create a new API key"
echo "3. Copy the key (starts with sk-)"
read -p "Enter your OpenAI API key (or press Enter to skip): " OPENAI_KEY

if [[ $OPENAI_KEY == sk-* ]]; then
    sed -i.bak "s/sk-YOUR_OPENAI_API_KEY_HERE/$OPENAI_KEY/" "pleasantcovedesign/server/.env.production"
    rm "pleasantcovedesign/server/.env.production.bak"
    echo -e "${GREEN}✅ OpenAI API key configured (Minerva ready)${NC}"
elif [[ ! -z "$OPENAI_KEY" ]]; then
    echo -e "${YELLOW}⚠️ Warning: OpenAI API key should start with 'sk-'${NC}"
fi

echo -e "\n${YELLOW}🔧 Step 5: Production URLs${NC}"
read -p "Enter your production domain (e.g., pleasantcovedesign.com): " DOMAIN

if [[ ! -z "$DOMAIN" ]]; then
    sed -i.bak "s/pleasantcovedesign.com/$DOMAIN/g" "pleasantcovedesign/server/.env.production"
    rm "pleasantcovedesign/server/.env.production.bak"
    echo -e "${GREEN}✅ Production URLs configured for $DOMAIN${NC}"
fi

echo -e "\n${GREEN}🎉 Production setup complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Review pleasantcovedesign/server/.env.production"
echo "2. Deploy to your hosting platform (Railway/Vercel/etc)"
echo "3. Copy environment variables to hosting dashboard"
echo "4. Set up production database"
echo "5. Configure SSL certificates"
echo ""
echo -e "${BLUE}📖 Full guide: PRODUCTION_SETUP_GUIDE.md${NC}"

echo -e "\n${YELLOW}⚠️ Security Reminder:${NC}"
echo "- NEVER commit .env.production to version control"
echo "- Store backup of environment variables securely"
echo "- Use different API keys for staging/production"
echo "- Monitor webhook deliveries and error logs"

# Add .env.production to .gitignore if not already there
if [ -f ".gitignore" ]; then
    if ! grep -q ".env.production" .gitignore; then
        echo ".env.production" >> .gitignore
        echo -e "${GREEN}✅ Added .env.production to .gitignore${NC}"
    fi
fi 