#!/bin/bash
echo "🧪 Testing Pleasant Cove Design Webhook System"
echo "================================================"
echo ""
echo "📊 Current Order Status:"
curl -s http://localhost:3000/api/orders/ORD-20250728011018-3QMJMVX9 | jq '{id, paymentStatus, invoiceStatus, stripePaymentIntentId}' 2>/dev/null || echo "❌ Order API failed"
echo ""
echo "🔌 Server Health Check:"
curl -s http://localhost:3000/api/businesses | jq 'length' 2>/dev/null && echo " businesses found" || echo "❌ Server not responding"
echo ""
echo "🎯 Stripe Webhook Endpoint Test:"
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=123456789,v1=test_signature" \
  -d '{"type": "test", "data": {"object": {}}}' 2>/dev/null && echo "✅ Webhook endpoint accessible" || echo "❌ Webhook endpoint failed"
echo ""
echo "📋 Process Status:"
ps aux | grep -E "(tsx|stripe)" | grep -v grep | wc -l | xargs echo "Active processes:"
echo ""
echo "🔍 Environment Check:"
if [ -f .env ]; then
    echo "✅ .env file exists"
    grep -q "STRIPE_WEBHOOK_SECRET" .env && echo "✅ Webhook secret configured" || echo "❌ Webhook secret missing"
else
    echo "❌ .env file missing"
fi
