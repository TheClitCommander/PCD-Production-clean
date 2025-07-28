# ⚡ Quick Stripe Test Setup (2 minutes)

## 🎯 Get Test Keys Now

1. **Login to Stripe**: https://dashboard.stripe.com

2. **Switch to Test Mode**: Toggle in top-right corner

3. **Get Test Keys**: 
   - Go to: https://dashboard.stripe.com/test/apikeys
   - Copy both:
     - `sk_test_...` (Secret key)
     - `pk_test_...` (Publishable key)

4. **Create Webhook**:
   ```
   URL: https://your-domain.ngrok.io/api/stripe/webhook
   Events: checkout.session.completed
   ```
   - Copy the signing secret: `whsec_...`

5. **Update .env**:
   ```bash
   STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
   STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
   ```

## 🧪 Test Card Numbers

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155

Any future date, any CVC
```

## 🚀 Local Testing with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Test webhook
stripe trigger checkout.session.completed
```

**That's it! Your Stripe test environment is ready!** 🎉 