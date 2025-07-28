#!/bin/bash

echo "🧪 Testing Pleasant Cove Billing Integration"
echo "========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API URLs
API_URL="http://localhost:3000/api"
MINERVA_URL="http://localhost:8001/api/minerva"
BILLING_URL="http://localhost:8007/api"

# Test data
COMPANY_ID="1"
ORDER_ID=""
INVOICE_ID=""

echo -e "\n${BLUE}1. Starting services...${NC}"
echo "Please ensure the following services are running:"
echo "- Backend: cd pleasantcovedesign/server && npm start (port 3000)"
echo "- Minerva Bridge: cd pleasantcovedesign/server && npx tsx minerva-bridge.ts (port 8001)"
echo "- Billing Engine: python minerva_billing_engine.py (port 8007)"
echo "- Frontend: cd pleasantcovedesign/admin-ui && npm run dev (port 5173)"
echo -e "\nPress Enter when all services are running..."
read

echo -e "\n${BLUE}2. Creating a test order...${NC}"
ORDER_RESPONSE=$(curl -s -X POST ${API_URL}/orders \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "'${COMPANY_ID}'",
    "package": "growth",
    "addons": ["seo_package", "appointment_booking"],
    "custom_items": []
  }')

ORDER_ID=$(echo $ORDER_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
INVOICE_ID=$(echo $ORDER_RESPONSE | grep -o '"invoiceId":"[^"]*' | cut -d'"' -f4)

if [ -n "$ORDER_ID" ]; then
  echo -e "${GREEN}✅ Order created: ${ORDER_ID}${NC}"
  echo -e "${GREEN}✅ Invoice created: ${INVOICE_ID}${NC}"
else
  echo -e "${RED}❌ Failed to create order${NC}"
  echo "Response: $ORDER_RESPONSE"
  exit 1
fi

echo -e "\n${BLUE}3. Fetching invoice details...${NC}"
INVOICE_RESPONSE=$(curl -s ${API_URL}/orders/${ORDER_ID}/invoice?invoiceId=${INVOICE_ID})
INVOICE_STATUS=$(echo $INVOICE_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)
INVOICE_TOTAL=$(echo $INVOICE_RESPONSE | grep -o '"total":[0-9.]*' | cut -d':' -f2)

echo -e "Invoice Status: ${INVOICE_STATUS}"
echo -e "Invoice Total: \$${INVOICE_TOTAL}"

echo -e "\n${BLUE}4. Sending invoice to client...${NC}"
SEND_RESPONSE=$(curl -s -X POST ${API_URL}/orders/${ORDER_ID}/send-invoice \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": "'${INVOICE_ID}'"}')

if echo "$SEND_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Invoice sent successfully${NC}"
else
  echo -e "${RED}❌ Failed to send invoice${NC}"
  echo "Response: $SEND_RESPONSE"
fi

echo -e "\n${BLUE}5. Simulating payment...${NC}"
PAYMENT_RESPONSE=$(curl -s -X POST ${API_URL}/orders/${ORDER_ID}/record-payment \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "'${INVOICE_ID}'",
    "amount": '${INVOICE_TOTAL}',
    "method": "stripe",
    "transactionId": "pi_test_'$(date +%s)'",
    "notes": "Test payment"
  }')

if echo "$PAYMENT_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Payment recorded successfully${NC}"
else
  echo -e "${RED}❌ Failed to record payment${NC}"
  echo "Response: $PAYMENT_RESPONSE"
fi

echo -e "\n${BLUE}6. Verifying final invoice status...${NC}"
FINAL_INVOICE=$(curl -s ${API_URL}/orders/${ORDER_ID}/invoice?invoiceId=${INVOICE_ID})
FINAL_STATUS=$(echo $FINAL_INVOICE | grep -o '"status":"[^"]*' | cut -d'"' -f4)

echo -e "Final Invoice Status: ${FINAL_STATUS}"

echo -e "\n${BLUE}=========================================${NC}"
echo -e "${GREEN}✅ Billing Integration Test Complete!${NC}"
echo -e "\n📊 Summary:"
echo -e "- Order ID: ${ORDER_ID}"
echo -e "- Invoice ID: ${INVOICE_ID}"
echo -e "- Total: \$${INVOICE_TOTAL}"
echo -e "- Status: ${FINAL_STATUS}"
echo -e "\n🎯 Next Steps:"
echo -e "1. Check the Admin UI at http://localhost:5173"
echo -e "2. Look for the order with invoice status badges"
echo -e "3. Try the 'View Invoice' button"
echo -e "4. Check email for invoice (if SMTP configured)" 