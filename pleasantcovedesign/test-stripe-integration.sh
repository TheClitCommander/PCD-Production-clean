#!/bin/bash

echo "🔌 Testing Pleasant Cove Stripe Integration"
echo "==========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API URLs
API_URL="http://localhost:3000/api"

# Test data
COMPANY_ID="1"
ORDER_ID=""
PAYMENT_LINK=""

echo -e "\n${BLUE}📋 Pre-flight Checklist${NC}"
echo "Please ensure:"
echo "1. Backend server is running: cd pleasantcovedesign/server && npm start"
echo "2. STRIPE_SECRET_KEY is set in your .env file"
echo "3. Stripe is installed: npm list stripe"
echo -e "\nPress Enter when ready..."
read

echo -e "\n${BLUE}1. Testing Stripe Configuration...${NC}"

# Test if Stripe is configured
STRIPE_TEST=$(curl -s -X POST ${API_URL}/orders \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "'${COMPANY_ID}'",
    "package": "starter",
    "addons": []
  }' 2>/dev/null)

if echo "$STRIPE_TEST" | grep -q "stripePaymentLinkUrl"; then
  echo -e "${GREEN}✅ Stripe is configured and working${NC}"
else
  echo -e "${YELLOW}⚠️ Stripe may not be configured (will continue without payment links)${NC}"
fi

echo -e "\n${BLUE}2. Creating test order with payment link...${NC}"
ORDER_RESPONSE=$(curl -s -X POST ${API_URL}/orders \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "'${COMPANY_ID}'",
    "package": "growth",
    "addons": ["seo_package", "appointment_booking"],
    "custom_items": []
  }')

ORDER_ID=$(echo $ORDER_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
PAYMENT_LINK=$(echo $ORDER_RESPONSE | grep -o '"stripePaymentLinkUrl":"[^"]*' | cut -d'"' -f4)

if [ -n "$ORDER_ID" ]; then
  echo -e "${GREEN}✅ Order created: ${ORDER_ID}${NC}"
  
  if [ -n "$PAYMENT_LINK" ]; then
    echo -e "${GREEN}✅ Payment link generated: ${PAYMENT_LINK}${NC}"
    echo -e "${YELLOW}💳 You can test payment at: ${PAYMENT_LINK}${NC}"
  else
    echo -e "${YELLOW}⚠️ No payment link generated (check Stripe configuration)${NC}"
  fi
else
  echo -e "${RED}❌ Failed to create order${NC}"
  echo "Response: $ORDER_RESPONSE"
  exit 1
fi

echo -e "\n${BLUE}3. Testing order retrieval...${NC}"
ORDER_DETAILS=$(curl -s ${API_URL}/orders/${ORDER_ID})
ORDER_STATUS=$(echo $ORDER_DETAILS | grep -o '"status":"[^"]*' | cut -d'"' -f4)
ORDER_TOTAL=$(echo $ORDER_DETAILS | grep -o '"total":[0-9.]*' | cut -d':' -f2)

echo -e "Order Status: ${ORDER_STATUS}"
echo -e "Order Total: \$${ORDER_TOTAL}"

echo -e "\n${BLUE}4. Testing send invoice with payment link...${NC}"
SEND_RESPONSE=$(curl -s -X POST ${API_URL}/orders/${ORDER_ID}/send-invoice)

if echo "$SEND_RESPONSE" | grep -q '"success":true'; then
  PAYMENT_LINK_SENT=$(echo $SEND_RESPONSE | grep -o '"paymentLinkSent":[^,}]*' | cut -d':' -f2)
  echo -e "${GREEN}✅ Invoice sent successfully${NC}"
  if [ "$PAYMENT_LINK_SENT" = "true" ]; then
    echo -e "${GREEN}✅ Payment link included in email${NC}"
  else
    echo -e "${YELLOW}⚠️ No payment link sent (may not be configured)${NC}"
  fi
else
  echo -e "${RED}❌ Failed to send invoice${NC}"
  echo "Response: $SEND_RESPONSE"
fi

echo -e "\n${BLUE}5. Simulating webhook payment notification...${NC}"

# Create a mock webhook payload
WEBHOOK_PAYLOAD='{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_123",
      "payment_intent": "pi_test_456",
      "metadata": {
        "order_id": "'${ORDER_ID}'"
      }
    }
  }
}'

echo "📡 Sending mock webhook (note: signature verification will fail in test):"
WEBHOOK_RESPONSE=$(curl -s -X POST ${API_URL}/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: mock_signature" \
  -d "$WEBHOOK_PAYLOAD")

echo "Webhook response: $WEBHOOK_RESPONSE"

echo -e "\n${BLUE}6. Manual payment simulation...${NC}"
echo "For a more realistic test, you can:"
echo "1. Visit the payment link: ${PAYMENT_LINK}"
echo "2. Use Stripe test card: 4242 4242 4242 4242"
echo "3. Complete the checkout process"
echo "4. Check server logs for webhook processing"

# Manual payment recording option
echo -e "\n${YELLOW}Would you like to manually mark the order as paid? (y/n)${NC}"
read -r MARK_PAID

if [ "$MARK_PAID" = "y" ] || [ "$MARK_PAID" = "Y" ]; then
  echo -e "\n${BLUE}7. Recording manual payment...${NC}"
  PAYMENT_RESPONSE=$(curl -s -X POST ${API_URL}/orders/${ORDER_ID}/record-payment \
    -H "Content-Type: application/json" \
    -d '{
      "amount": '${ORDER_TOTAL}',
      "method": "stripe",
      "transactionId": "pi_test_manual_'$(date +%s)'",
      "notes": "Manual test payment"
    }')

  if echo "$PAYMENT_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Payment recorded successfully${NC}"
    echo -e "${GREEN}🧾 Receipt generation triggered (check server logs)${NC}"
    echo -e "${GREEN}🚀 Fulfillment process should be triggered (check server logs)${NC}"
    echo -e "${YELLOW}📧 Check logs for receipt and welcome emails${NC}"
  else
    echo -e "${RED}❌ Failed to record payment${NC}"
    echo "Response: $PAYMENT_RESPONSE"
  fi
fi

echo -e "\n${BLUE}8. Verifying final order status...${NC}"
FINAL_ORDER=$(curl -s ${API_URL}/orders/${ORDER_ID})
FINAL_STATUS=$(echo $FINAL_ORDER | grep -o '"paymentStatus":"[^"]*' | cut -d'"' -f4)
FINAL_INVOICE_STATUS=$(echo $FINAL_ORDER | grep -o '"invoiceStatus":"[^"]*' | cut -d'"' -f4)

echo -e "Payment Status: ${FINAL_STATUS}"
echo -e "Invoice Status: ${FINAL_INVOICE_STATUS}"

echo -e "\n${BLUE}==========================================${NC}"
echo -e "${GREEN}✅ Stripe Integration Test Complete!${NC}"
echo -e "\n📊 Summary:"
echo -e "- Order ID: ${ORDER_ID}"
echo -e "- Total: \$${ORDER_TOTAL}"
echo -e "- Payment Link: ${PAYMENT_LINK:0:50}..."
echo -e "- Payment Status: ${FINAL_STATUS}"
echo -e "- Invoice Status: ${FINAL_INVOICE_STATUS}"

echo -e "\n🎯 Next Steps:"
echo -e "1. Test the payment link in a browser"
echo -e "2. Set up real Stripe webhook endpoint"
echo -e "3. Configure email sending (SMTP) for receipts & welcome emails"
echo -e "4. Test with real Stripe test cards"
echo -e "5. Verify receipt generation and fulfillment automation"
echo -e "6. Deploy to production with live Stripe keys"

echo -e "\n📖 For setup instructions, see: pleasantcovedesign/STRIPE_SETUP.md" 