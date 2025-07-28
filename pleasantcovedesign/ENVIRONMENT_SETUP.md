# 🚀 Pleasant Cove Design - Environment Setup & Launch Checklist

## 📋 Complete .env Template

Create a `.env` file in `/server` directory with these values:

```bash
# ============================================
# PLEASANT COVE DESIGN - COMPLETE ENV TEMPLATE
# ============================================

# === STRIPE CONFIGURATION (CRITICAL) ===
# Test Mode (SAFE - Use for development)
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_PUBLISHABLE_KEY_HERE

# Webhook Secret (CRITICAL for payment flow)
# Get from: https://dashboard.stripe.com/test/webhooks
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SIGNING_SECRET_HERE

# === SENDGRID EMAIL (CRITICAL) ===
# Get from: https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=SG.YOUR_SENDGRID_API_KEY_HERE
FROM_EMAIL=hello@pleasantcovedesign.com
FROM_NAME=Pleasant Cove Design

# === MINERVA BILLING ENGINE (HIGH PRIORITY) ===
MINERVA_API_TOKEN=YOUR_MINERVA_AUTH_TOKEN_HERE
MINERVA_PORT=8007
BILLING_PORT=8007

# === SERVER CONFIGURATION ===
PORT=3000
NODE_ENV=development
SUCCESS_URL=http://localhost:3000/success
CANCEL_URL=http://localhost:3000/cancel

# === AUTHENTICATION ===
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars-long
```

---

## ✅ Production Launch Checklist

### **Phase 1: Core Services Setup (Do Now)**

- [ ] **1. Stripe Webhook Configuration**
  ```bash
  # Go to: https://dashboard.stripe.com/test/webhooks
  # Add endpoint: https://your-domain.com/api/stripe/webhook
  # Select events:
  - checkout.session.completed
  - payment_intent.succeeded
  - payment_intent.payment_failed
  # Copy signing secret to STRIPE_WEBHOOK_SECRET
  ```

- [ ] **2. SendGrid API Key**
  ```bash
  # Go to: https://app.sendgrid.com/settings/api_keys
  # Create key with "Mail Send" permissions
  # Add to SENDGRID_API_KEY
  # Verify sender: https://app.sendgrid.com/settings/sender_auth
  ```

- [ ] **3. Minerva Authentication**
  ```bash
  # Get auth token from Minerva dashboard
  # Add to MINERVA_API_TOKEN
  # Test with: curl http://localhost:8007/health
  ```

### **Phase 2: Testing & Validation**

- [ ] **4. Test Order → Payment → Email Flow**
  ```bash
  # Create test order
  curl -X POST http://localhost:3000/api/orders \
    -H "Content-Type: application/json" \
    -d '{"company_id": 118, "package": "starter"}'
  
  # Verify payment link generated
  # Complete test payment
  # Confirm emails sent
  ```

- [ ] **5. Verify Webhook Processing**
  ```bash
  # Use Stripe CLI for local testing
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  stripe trigger checkout.session.completed
  ```

- [ ] **6. Email Delivery Test**
  ```bash
  # Check SendGrid dashboard for:
  - Delivery rate > 95%
  - No spam reports
  - Proper formatting
  ```

### **Phase 3: Production Deployment**

- [ ] **7. Domain & SSL Setup**
  ```bash
  # Configure domains:
  - api.pleasantcovedesign.com → Backend
  - admin.pleasantcovedesign.com → Admin UI
  - pleasantcovedesign.com → Main site
  ```

- [ ] **8. Environment Variables**
  ```bash
  # Update production .env:
  NODE_ENV=production
  APP_URL=https://api.pleasantcovedesign.com
  # Use LIVE Stripe keys (carefully!)
  # Update SUCCESS_URL and CANCEL_URL
  ```

- [ ] **9. Database Migration**
  ```bash
  # Consider PostgreSQL for production
  # Run migrations
  # Set up automated backups
  ```

### **Phase 4: Monitoring & Optimization**

- [ ] **10. Error Tracking**
  ```bash
  # Set up Sentry or similar
  # Monitor webhook failures
  # Track email bounce rates
  ```

- [ ] **11. Performance Monitoring**
  ```bash
  # Set up uptime monitoring
  # Configure alerts for:
  - Payment failures
  - Email delivery issues
  - Server errors
  ```

- [ ] **12. Security Hardening**
  ```bash
  # Rate limiting configured
  # CORS properly set
  # Secrets rotated regularly
  # Webhook signatures verified
  ```

---

## 🧪 Full Test Transaction Simulation

```bash
# 1. Start all services
cd server && npm start

# 2. Create test customer
curl -X POST http://localhost:3000/api/businesses \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company LLC",
    "email": "test@example.com",
    "phone": "(555) 123-4567"
  }'

# 3. Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": [COMPANY_ID],
    "package": "starter",
    "notes": "Full test transaction"
  }'

# 4. Send invoice (with payment link)
curl -X POST http://localhost:3000/api/orders/[ORDER_ID]/send-invoice

# 5. Simulate payment (webhook)
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "stripe-signature: [WEBHOOK_SECRET]" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "metadata": {
          "order_id": "[ORDER_ID]",
          "company_id": "[COMPANY_ID]"
        },
        "payment_intent": "pi_test_12345"
      }
    }
  }'

# 6. Verify:
# - Order status updated to paid
# - Receipt email sent
# - Welcome email sent
# - Fulfillment process started
```

---

## 🎯 Quick Start Commands

```bash
# Install dependencies
cd server && npm install
cd ../admin-ui && npm install

# Start everything
npm run dev  # Starts both server and admin UI

# View logs
tail -f server/logs/app.log

# Test health
curl http://localhost:3000/health
```

---

## 🚨 Common Issues & Solutions

### Stripe webhook not working?
- Check firewall/ngrok for local testing
- Verify webhook secret is exact match
- Use Stripe CLI for debugging

### Emails not sending?
- Verify SendGrid domain authentication
- Check spam folder
- Review SendGrid activity logs

### Minerva auth failing?
- Token might be expired
- Check if Minerva service is running
- Verify port 8007 is accessible

---

## 📞 Need Help?

1. Check server logs first
2. Verify all API keys are correct
3. Test each component individually
4. Use the test scripts provided

**You're 3 configuration steps away from launch! 🚀** 