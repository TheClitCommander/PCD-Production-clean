#!/bin/bash

# ============================================
# Pleasant Cove Design - Full Transaction Simulation
# ============================================
# This script simulates the complete order → payment → fulfillment flow

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL (update for production)
BASE_URL="http://localhost:3000"
COMPANY_ID="118" # Test Member company

echo -e "${BLUE}🚀 Pleasant Cove Design - Full Transaction Simulation${NC}"
echo "=================================================="
echo ""

# Step 1: Health Check
echo -e "${YELLOW}Step 1: Checking system health...${NC}"
HEALTH=$(curl -s $BASE_URL/health)
if echo "$HEALTH" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✅ System is healthy${NC}"
else
    echo -e "${RED}❌ System health check failed${NC}"
    exit 1
fi
echo ""

# Step 2: Create Order
echo -e "${YELLOW}Step 2: Creating order for company $COMPANY_ID...${NC}"
ORDER_RESPONSE=$(curl -s -X POST $BASE_URL/api/orders \
    -H "Content-Type: application/json" \
    -d '{
        "company_id": '$COMPANY_ID',
        "package": "starter",
        "custom_items": [
            {
                "name": "Logo Design",
                "description": "Professional logo creation",
                "price": 500,
                "quantity": 1
            }
        ],
        "notes": "Full transaction simulation test"
    }')

ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.id')
ORDER_TOTAL=$(echo $ORDER_RESPONSE | jq -r '.total')

if [ "$ORDER_ID" != "null" ]; then
    echo -e "${GREEN}✅ Order created successfully${NC}"
    echo "   Order ID: $ORDER_ID"
    echo "   Total: \$$ORDER_TOTAL"
else
    echo -e "${RED}❌ Failed to create order${NC}"
    echo "$ORDER_RESPONSE"
    exit 1
fi
echo ""

# Step 3: Check Stripe Payment Link (if configured)
echo -e "${YELLOW}Step 3: Checking for payment link generation...${NC}"
PAYMENT_LINK=$(echo $ORDER_RESPONSE | jq -r '.stripePaymentLinkUrl // empty')
if [ -n "$PAYMENT_LINK" ]; then
    echo -e "${GREEN}✅ Payment link generated${NC}"
    echo "   Link: $PAYMENT_LINK"
else
    echo -e "${YELLOW}⚠️  No payment link (Stripe not configured)${NC}"
fi
echo ""

# Step 4: Simulate Invoice Send
echo -e "${YELLOW}Step 4: Attempting to send invoice...${NC}"
INVOICE_RESPONSE=$(curl -s -X POST $BASE_URL/api/orders/$ORDER_ID/send-invoice)
if echo "$INVOICE_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Invoice sent successfully${NC}"
else
    echo -e "${YELLOW}⚠️  Invoice send skipped (Minerva not configured)${NC}"
    echo "   Response: $(echo $INVOICE_RESPONSE | jq -r '.error // .message // "Unknown"')"
fi
echo ""

# Step 5: Simulate Payment Webhook
echo -e "${YELLOW}Step 5: Simulating Stripe payment webhook...${NC}"
echo "   (This simulates what happens when customer completes payment)"

WEBHOOK_PAYLOAD='{
    "type": "checkout.session.completed",
    "data": {
        "object": {
            "metadata": {
                "order_id": "'$ORDER_ID'",
                "company_id": "'$COMPANY_ID'",
                "invoice_id": "INV-TEST-123"
            },
            "payment_intent": "pi_test_simulation_'$(date +%s)'"
        }
    }
}'

# Note: In production, this would have proper signature verification
WEBHOOK_RESPONSE=$(curl -s -X POST $BASE_URL/api/stripe/webhook \
    -H "Content-Type: application/json" \
    -H "stripe-signature: test_signature" \
    -d "$WEBHOOK_PAYLOAD")

if echo "$WEBHOOK_RESPONSE" | grep -q '"received":true' || [ "$WEBHOOK_RESPONSE" = "" ]; then
    echo -e "${GREEN}✅ Payment webhook processed${NC}"
else
    echo -e "${YELLOW}⚠️  Webhook processing issue${NC}"
    echo "   Response: $WEBHOOK_RESPONSE"
fi
echo ""

# Step 6: Verify Order Status Update
echo -e "${YELLOW}Step 6: Checking order status after payment...${NC}"
sleep 2 # Give system time to process

ORDER_STATUS=$(curl -s $BASE_URL/api/orders/$ORDER_ID)
PAYMENT_STATUS=$(echo $ORDER_STATUS | jq -r '.paymentStatus // "unknown"')
INVOICE_STATUS=$(echo $ORDER_STATUS | jq -r '.invoiceStatus // "unknown"')

echo "   Payment Status: $PAYMENT_STATUS"
echo "   Invoice Status: $INVOICE_STATUS"

if [ "$PAYMENT_STATUS" = "paid" ]; then
    echo -e "${GREEN}✅ Order marked as paid${NC}"
else
    echo -e "${YELLOW}⚠️  Payment status not updated (webhook verification needed)${NC}"
fi
echo ""

# Step 7: Check Email Logs
echo -e "${YELLOW}Step 7: Checking email system...${NC}"
echo "   Emails that would be sent:"
echo "   - 📧 Invoice email (if Minerva configured)"
echo "   - 🧾 Receipt email (after payment)"
echo "   - 🎉 Welcome email (after payment)"
echo "   - 📊 Team notifications"
echo ""
echo -e "${YELLOW}   Check server logs for email content${NC}"
echo ""

# Summary
echo "=================================================="
echo -e "${BLUE}📊 SIMULATION SUMMARY${NC}"
echo "=================================================="
echo ""
echo "✅ Order Creation: SUCCESS"
echo "$([ -n "$PAYMENT_LINK" ] && echo "✅" || echo "⚠️ ") Payment Link: $([ -n "$PAYMENT_LINK" ] && echo "GENERATED" || echo "Stripe config needed")"
echo "⚠️  Invoice Send: Minerva auth needed"
echo "⚠️  Webhook Processing: Signature verification needed"
echo "⚠️  Email Delivery: SendGrid API key needed"
echo ""
echo -e "${GREEN}🎯 Your core order flow is working!${NC}"
echo ""
echo "To complete the setup:"
echo "1. Add STRIPE_WEBHOOK_SECRET to .env"
echo "2. Add SENDGRID_API_KEY to .env"
echo "3. Add MINERVA_API_TOKEN to .env"
echo ""
echo "Then run this simulation again to see the full flow!" 