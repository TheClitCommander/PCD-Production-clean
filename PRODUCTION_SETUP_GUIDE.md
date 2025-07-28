# 🚀 Production Setup Guide - Pleasant Cove Design

## Overview

This guide walks you through setting up Pleasant Cove Design for production with:
- ✅ SendGrid email notifications
- ✅ Minerva AI billing integration  
- ✅ Live Stripe payments
- ✅ Production deployment

## 📋 Prerequisites

- [ ] Domain configured (pleasantcovedesign.com)
- [ ] Hosting platform account (Railway/Vercel/etc)
- [ ] Database (PostgreSQL recommended for production)
- [ ] SSL certificates

---

## Step 1: 📧 SendGrid Email Setup

### 1.1 Create SendGrid Account
1. Go to [SendGrid.com](https://sendgrid.com) and create account
2. Verify your account via email
3. Complete sender verification

### 1.2 Get API Key
1. Navigate to **Settings > API Keys**
2. Click **Create API Key**
3. Choose **Full Access** for production
4. Copy the API key (starts with `SG.`)

### 1.3 Verify Sender Email
1. Go to **Settings > Sender Authentication**
2. Choose **Single Sender Verification**
3. Add `hello@pleasantcovedesign.com`
4. Verify via email confirmation

### 1.4 Add to Environment
```bash
# Add to your .env file
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
FROM_EMAIL=hello@pleasantcovedesign.com
FROM_NAME=Pleasant Cove Design
```

---

## Step 2: 🤖 Minerva API Integration

### 2.1 Get OpenAI API Key (Powers Minerva)
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`)
4. Minerva uses this key for AI operations

### 2.2 Add to Environment
```bash
# Add to your .env file
OPENAI_API_KEY=sk-your_openai_api_key_here
MINERVA_URL=http://localhost:8000  # Local Minerva instance
```

### 2.3 Test Minerva Integration
```bash
# Test Minerva connectivity
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"company":{"name":"Test Co","email":"test@example.com"},"package":"basic","total":299}'
```

---

## Step 3: 💳 Switch to Live Stripe Keys

### 3.1 Get Live Stripe Keys
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Switch from **Test mode** to **Live mode** (toggle in left sidebar)
3. Navigate to **Developers > API keys**
4. Copy **Publishable key** and **Secret key**

### 3.2 Set Up Live Webhook
1. Go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Enter URL: `https://api.pleasantcovedesign.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `charge.succeeded`
   - `charge.updated`
5. Copy the **Signing secret**

### 3.3 Update Environment
```bash
# Replace test keys with live keys
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret_here

# Production URLs
STRIPE_SUCCESS_URL=https://pleasantcovedesign.com/payment/success
STRIPE_CANCEL_URL=https://pleasantcovedesign.com/payment/cancel
```

⚠️ **CRITICAL**: Never commit live keys to version control!

---

## Step 4: 🌐 Production Deployment

### 4.1 Railway Deployment

#### Option A: Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway add --service postgresql
railway deploy
```

#### Option B: GitHub Integration
1. Push code to GitHub repository
2. Connect Railway to your GitHub repo
3. Configure environment variables in Railway dashboard
4. Deploy automatically on push

### 4.2 Environment Variables Setup

Copy all variables from `.env.production` to your hosting platform:

**Critical Variables:**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
SENDGRID_API_KEY=SG.your_key
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
MINERVA_API_TOKEN=your_token
```

### 4.3 Database Setup
```bash
# For PostgreSQL on Railway
railway add postgresql

# Run migrations (if you have them)
npm run db:migrate

# Or manually create tables
npm run db:setup
```

### 4.4 Domain Configuration
1. **Add custom domain** in Railway dashboard
2. **Update DNS records**:
   ```
   api.pleasantcovedesign.com → CNAME → your-app.railway.app
   ```
3. **SSL certificate** will be automatically provisioned

---

## 🧪 Step 5: Production Testing

### 5.1 Test Email Functionality
```bash
# Test email sending
curl -X POST https://api.pleasantcovedesign.com/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

### 5.2 Test Stripe Payments
1. Create test order via admin dashboard
2. Use real payment methods (small amounts)
3. Verify webhook delivery in Stripe dashboard
4. Check email notifications

### 5.3 Test Minerva Integration
1. Create order with Minerva billing
2. Verify invoice generation
3. Check payment processing
4. Confirm email automation

---

## 🔒 Security Checklist

- [ ] All API keys are in environment variables (not code)
- [ ] HTTPS enabled on all domains
- [ ] CORS properly configured for production domains
- [ ] Rate limiting enabled
- [ ] Database connection uses SSL
- [ ] Error logging configured (Sentry recommended)
- [ ] Backup strategy implemented

---

## 📊 Monitoring Setup

### Recommended Tools:
- **Uptime**: UptimeRobot or Pingdom
- **Errors**: Sentry
- **Analytics**: PostHog or Google Analytics
- **Performance**: Railway built-in metrics

### Health Check Endpoint:
```bash
curl https://api.pleasantcovedesign.com/health
```

---

## 🚨 Emergency Procedures

### Rollback to Previous Version
```bash
# Railway CLI
railway rollback

# Or redeploy previous commit
git revert HEAD
git push origin main
```

### Switch Back to Test Mode
If issues occur, temporarily switch Stripe back to test mode:
```bash
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_test_webhook_secret
```

---

## 📞 Support Contacts

- **Stripe Support**: https://support.stripe.com
- **SendGrid Support**: https://support.sendgrid.com  
- **Railway Support**: https://railway.app/help
- **Minerva Support**: [Your Minerva contact]

---

## ✅ Go-Live Checklist

- [ ] SendGrid API key added and verified
- [ ] Minerva API token configured and tested
- [ ] Live Stripe keys configured
- [ ] Webhook endpoints verified
- [ ] Production database configured
- [ ] Domain and SSL configured
- [ ] All environment variables set
- [ ] Monitoring and alerting set up
- [ ] Backup strategy implemented
- [ ] Team trained on production procedures

**🎉 You're ready for production!** 