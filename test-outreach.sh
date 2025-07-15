#!/bin/bash

echo "🚀 Testing Professional Outreach Integration"
echo "==========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null)
if [ -z "$NGROK_URL" ]; then
    BASE_URL="http://localhost:5173"
    echo -e "${YELLOW}⚠️  Using local URL (ngrok not running)${NC}"
else
    BASE_URL="$NGROK_URL"
    echo -e "${GREEN}✅ Using ngrok URL: $BASE_URL${NC}"
fi

echo ""
echo -e "${BLUE}1. Creating test leads...${NC}"

# Create test lead 1 - with both email and phone
curl -s -X POST "$BASE_URL/api/businesses" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Coastal Plumbing Services",
    "email": "john.smith@coastalplumbing.com",
    "phone": "(207) 555-0101",
    "address": "123 Harbor View",
    "city": "Camden",
    "state": "ME",
    "businessType": "plumbing",
    "stage": "scraped",
    "notes": "Owner: John",
    "tags": ["plumbing", "no-website", "midcoast-maine"]
  }' | jq '.'

# Create test lead 2 - phone only
curl -s -X POST "$BASE_URL/api/businesses" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Harbor View Cafe",
    "phone": "(207) 555-0102",
    "address": "456 Main St",
    "city": "Rockport",
    "state": "ME",
    "businessType": "restaurant",
    "stage": "scraped",
    "tags": ["cafe", "no-website"]
  }' | jq '.'

# Create test lead 3 - email only
curl -s -X POST "$BASE_URL/api/businesses" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Green Thumb Landscaping",
    "email": "info@greenthumbme.com",
    "phone": "",
    "address": "789 Route 1",
    "city": "Belfast",
    "state": "ME",
    "businessType": "landscaping",
    "stage": "scraped",
    "notes": "Contact: Sarah",
    "tags": ["landscaping", "no-website", "high-priority"]
  }' | jq '.'

echo ""
echo -e "${BLUE}2. Getting lead IDs...${NC}"
LEAD_IDS=$(curl -s "$BASE_URL/api/businesses" | jq -r '.[-3:] | .[].id' | tr '\n' ',' | sed 's/,$//')
echo "Lead IDs: $LEAD_IDS"

echo ""
echo -e "${BLUE}3. Testing single lead outreach...${NC}"
FIRST_ID=$(echo $LEAD_IDS | cut -d',' -f1)
echo "Sending outreach to lead ID: $FIRST_ID"
curl -s -X POST "$BASE_URL/api/bot/outreach/$FIRST_ID" | jq '.'

echo ""
echo -e "${BLUE}4. Testing bulk outreach campaign...${NC}"
IDS_ARRAY=$(echo $LEAD_IDS | awk -F',' '{printf "["; for(i=1;i<=NF;i++) printf "%s%s", $i, (i<NF?",":""); printf "]"}')
echo "Launching campaign for IDs: $IDS_ARRAY"

curl -s -X POST "$BASE_URL/api/bot/launch-outreach" \
  -H "Content-Type: application/json" \
  -d "{
    \"businessIds\": $IDS_ARRAY,
    \"campaignType\": \"mixed\"
  }" | jq '.'

echo ""
echo -e "${BLUE}5. Checking activities log...${NC}"
curl -s "$BASE_URL/api/activities?limit=5" | jq '.[] | {type, description, createdAt}'

echo ""
echo -e "${GREEN}✅ Outreach test complete!${NC}"
echo ""
echo "📝 Note: Messages are in MOCK mode by default."
echo "To enable real SMS/Email, set these environment variables:"
echo "  - OUTREACH_MOCK=false"
echo "  - TWILIO_ACCOUNT_SID=your-sid"
echo "  - TWILIO_AUTH_TOKEN=your-token"
echo "  - TWILIO_PHONE_NUMBER=+1234567890"
echo "  - SENDGRID_API_KEY=your-key"
echo "  - FROM_EMAIL=your@email.com" 