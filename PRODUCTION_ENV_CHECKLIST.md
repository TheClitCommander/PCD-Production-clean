# Production Environment Variables Checklist

This document lists all required and optional environment variables for deploying Pleasant Cove Design to production (Railway, Render, etc.).

## ✅ Core Application

### Required
- `NODE_ENV=production` - Sets production mode
- `PORT=3000` - Server port (Railway auto-assigns)
- `FRONTEND_URL` - Frontend domain (e.g., `https://admin.pleasantcovedesign.com`)

### Optional
- `TRUSTED_IPS` - Comma-separated list of trusted IPs for rate limiting bypass

## ✅ Database (CRITICAL for production)

### Required (Choose one)
- `DATABASE_URL` - Full PostgreSQL connection string (Railway provides this)

**Example:** `postgresql://user:password@host:port/database`

> **⚠️ IMPORTANT:** Without `DATABASE_URL`, the app uses JSON/in-memory storage which is ephemeral on Railway!

## ✅ File Storage (Cloudflare R2)

### Required (to persist file uploads)
- `R2_ENDPOINT` - R2 endpoint URL (e.g., `https://[account-id].r2.cloudflarestorage.com`)
- `R2_REGION` - Usually `auto` for R2
- `R2_BUCKET` - Your R2 bucket name
- `R2_ACCESS_KEY_ID` - R2 access key
- `R2_SECRET_ACCESS_KEY` - R2 secret key

> **⚠️ IMPORTANT:** Without R2 config, file uploads use local storage which is lost on Railway redeploys!

## ✅ Authentication

### Required
- `ADMIN_PASSWORD` - Admin login password (replace default)
- `JWT_SECRET` - JWT signing secret (use strong random value)

### Optional
- `JWT_EXPIRES_IN=24h` - JWT token expiration

## ✅ Email (SendGrid)

### Required
- `SENDGRID_API_KEY` - SendGrid API key
- `FROM_EMAIL` - Sender email address
- `FROM_NAME` - Sender display name

## ✅ SMS (Twilio)

### Required
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_FROM_NUMBER` - Twilio phone number

### Choose one authentication method:
**Option A (Recommended):**
- `TWILIO_API_KEY_SID` - Twilio API key SID
- `TWILIO_API_KEY_SECRET` - Twilio API key secret

**Option B:**
- `TWILIO_AUTH_TOKEN` - Twilio auth token

## ✅ Payments (Stripe)

### Required
- `STRIPE_SECRET_KEY` - Stripe secret key (live or test)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook endpoint secret
- `STRIPE_SUCCESS_URL` - Payment success redirect URL
- `STRIPE_CANCEL_URL` - Payment cancel redirect URL

## ✅ Meetings (Zoom)

### Optional
- `ZOOM_ACCOUNT_ID` - Zoom account ID
- `ZOOM_CLIENT_ID` - Zoom OAuth client ID
- `ZOOM_CLIENT_SECRET` - Zoom OAuth client secret

## ✅ AI Services (Minerva)

### Required (once Minerva is deployed)
- `MINERVA_BASE_URL` - Minerva service base URL (e.g., `https://minerva.yourdomain.com`)
- `BILLING_BASE_URL` - Billing service base URL (e.g., `https://billing.yourdomain.com`)

### Optional
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude

## ✅ CORS & Security

### Required
- `CORS_ORIGINS` - Comma-separated allowed origins
  
**Example:** `https://www.pleasantcovedesign.com,https://admin.pleasantcovedesign.com,https://yoursite.squarespace.com`

### Optional
- `RAILWAY_PUBLIC_DOMAIN` - Auto-detected Railway domain (Railway provides this)

## ✅ Admin UI Environment Variables

Set these when building the admin UI:

### Required
- `VITE_API_URL` - Backend API URL (e.g., `https://api.pleasantcovedesign.com/api`)
- `VITE_WS_URL` - WebSocket URL (e.g., `https://api.pleasantcovedesign.com`)

### Optional
- `VITE_MINERVA_BASE_URL` - Minerva service URL for frontend

## 📋 Deployment Priority Order

### Week 1: Core Infrastructure
1. **Database:** Set `DATABASE_URL` (Railway Postgres)
2. **File Storage:** Configure all R2 variables
3. **Auth:** Set `ADMIN_PASSWORD` and `JWT_SECRET`

### Week 2: Payments & Communications
4. **Stripe:** Set all Stripe variables + webhook secret
5. **Email:** Configure SendGrid variables
6. **SMS:** Configure Twilio variables

### Week 3: AI & Advanced Features
7. **Minerva:** Deploy and configure AI service URLs
8. **CORS:** Set production domains in `CORS_ORIGINS`

## 🧪 Testing Environment Variables

Create a `.env.test` file for testing:

```bash
# Copy your .env file and modify sensitive values
cp .env .env.test

# Use test Stripe keys, test Twilio numbers, etc.
STRIPE_SECRET_KEY=sk_test_...
TWILIO_FROM_NUMBER=+15005550006
```

## 🔒 Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use strong passwords** - Minimum 20 characters for `ADMIN_PASSWORD`
3. **Rotate secrets regularly** - Especially JWT secrets and API keys
4. **Use Railway's secret management** - Set environment variables in Railway dashboard, not in code
5. **Separate environments** - Use different secrets for staging/production

## 🚨 Required for Production Launch

### Minimum viable production setup:
- ✅ `DATABASE_URL` (PostgreSQL)
- ✅ `R2_*` variables (File storage)
- ✅ `ADMIN_PASSWORD` (Custom password)
- ✅ `STRIPE_*` variables (Payments)
- ✅ `SENDGRID_API_KEY` (Email notifications)
- ✅ `CORS_ORIGINS` (Production domains)

### Everything else can be added incrementally.

## 📝 Sample Production .env Template

```bash
# Core
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://admin.pleasantcovedesign.com

# Database (Railway provides DATABASE_URL automatically)
DATABASE_URL=postgresql://user:pass@host:port/db

# File Storage
R2_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
R2_REGION=auto
R2_BUCKET=pcd-production
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key

# Auth
ADMIN_PASSWORD=your_super_secure_password_here
JWT_SECRET=your_jwt_secret_here

# Email
SENDGRID_API_KEY=SG.your_key_here
FROM_EMAIL=admin@pleasantcovedesign.com
FROM_NAME=Pleasant Cove Design

# SMS
TWILIO_ACCOUNT_SID=AC...
TWILIO_API_KEY_SID=SK...
TWILIO_API_KEY_SECRET=your_secret
TWILIO_FROM_NUMBER=+1234567890

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://www.pleasantcovedesign.com/payment-success
STRIPE_CANCEL_URL=https://www.pleasantcovedesign.com/payment-cancelled

# CORS
CORS_ORIGINS=https://www.pleasantcovedesign.com,https://admin.pleasantcovedesign.com,https://yoursite.squarespace.com

# AI Services (once deployed)
MINERVA_BASE_URL=https://minerva.pleasantcovedesign.com
BILLING_BASE_URL=https://billing.pleasantcovedesign.com
```

## 🎯 Next Steps

1. Set minimum required variables in Railway
2. Test payment flow end-to-end
3. Deploy Minerva AI services separately
4. Configure production domains and CORS
5. Run production health checks

---

**Need help?** Check the individual service setup guides in the `/docs` folder or refer to the main README.md.
