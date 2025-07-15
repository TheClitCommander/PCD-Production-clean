#!/bin/bash

echo "🧪 Testing WebsiteWizard Webhook System"
echo "======================================"

# Test data that mimics what Squarespace sends
TEST_DATA='{
  "formId": "test-form-123",
  "submissionId": "test-submission-789",
  "data": {
    "name": "Test Plumbing Co",
    "email": "test@plumbing.com",
    "phone": "207-555-9999",
    "message": "I need a website for my plumbing business in Portland"
  }
}'

echo "📤 Sending test webhook to http://localhost:5173/api/new-lead"
echo ""
echo "Test data:"
echo "$TEST_DATA" | jq '.' 2>/dev/null || echo "$TEST_DATA"
echo ""

# Send the test webhook
RESPONSE=$(curl -X POST http://localhost:5173/api/new-lead \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA" \
  -s -w "\nHTTP_STATUS:%{http_code}")

# Extract body and status
BODY=$(echo "$RESPONSE" | sed -n '1,/HTTP_STATUS:/p' | sed '$d')
STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)

echo "📥 Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$STATUS" = "200" ]; then
    echo "✅ Webhook test successful!"
    echo ""
    echo "🎯 Now check:"
    echo "1. Open http://localhost:5173/leads in your browser"
    echo "2. You should see 'Test Plumbing Co' in the leads list"
    echo "3. The lead should show as 'Scraped' status"
    echo "4. In a few seconds, it should auto-enrich and update"
else
    echo "❌ Webhook test failed with status: $STATUS"
    echo "Make sure the server is running: ./start-webhook-server.sh"
fi 