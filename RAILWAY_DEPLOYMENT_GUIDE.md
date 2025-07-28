# 🚂 Railway Deployment Guide - Pleasant Cove Design

## Quick Deploy to Railway

Railway is a modern hosting platform perfect for Node.js applications. This guide walks you through deploying Pleasant Cove Design to Railway.

---

## 🚀 Method 1: One-Click Deploy (Recommended)

### 1. Deploy via GitHub
1. Push your code to GitHub repository
2. Go to [Railway.app](https://railway.app)
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose your Pleasant Cove Design repository
6. Railway will automatically detect it's a Node.js app

### 2. Add PostgreSQL Database
```bash
# In Railway dashboard
1. Click "New" -> "Database" -> "PostgreSQL"
2. Railway will automatically create DATABASE_URL
3. Your app will restart with database connection
```

### 3. Configure Environment Variables
In Railway dashboard → **Variables** tab, add all variables from your `.env.production`:

**Critical Variables:**
```
NODE_ENV=production
SENDGRID_API_KEY=SG.your_sendgrid_key
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
OPENAI_API_KEY=sk-your_openai_key
JWT_SECRET=your_generated_jwt_secret
SESSION_SECRET=your_generated_session_secret
```

---

## 🛠 Method 2: Railway CLI

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Login and Initialize
```bash
railway login
railway init
```

### 3. Add Database
```bash
railway add --service postgresql
```

### 4. Deploy
```bash
railway deploy
```

### 5. Set Environment Variables
```bash
# Set variables one by one
railway variables set SENDGRID_API_KEY=SG.your_key
railway variables set STRIPE_SECRET_KEY=sk_live_your_key

# Or upload from file
railway variables set --from-file .env.production
```

---

## 🌐 Custom Domain Setup

### 1. Add Domain in Railway
1. Go to your project **Settings**
2. Click **Domains**
3. Click **Custom Domain**
4. Enter: `api.pleasantcovedesign.com`

### 2. Configure DNS
Add CNAME record in your DNS provider:
```
api.pleasantcovedesign.com → CNAME → your-app.railway.app
```

### 3. SSL Certificate
Railway automatically provisions SSL certificates for custom domains.

---

## ⚙️ Railway Configuration Files

### railway.json (Optional)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30
  }
}
```

### Dockerfile (Alternative)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🔧 Environment Variables Reference

### Required for Production
```bash
# Server
NODE_ENV=production
PORT=3000

# Database (automatically set by Railway)
DATABASE_URL=postgresql://...

# SendGrid Email
SENDGRID_API_KEY=SG.your_sendgrid_api_key
FROM_EMAIL=hello@pleasantcovedesign.com

# Stripe Payments
STRIPE_SECRET_KEY=sk_live_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Security
JWT_SECRET=your_secure_jwt_secret
SESSION_SECRET=your_secure_session_secret

# URLs
API_BASE_URL=https://api.pleasantcovedesign.com
FRONTEND_URL=https://pleasantcovedesign.com
CORS_ORIGINS=https://pleasantcovedesign.com https://www.pleasantcovedesign.com
```

### Optional but Recommended
```bash
# Minerva AI (powered by OpenAI)
OPENAI_API_KEY=sk-your_openai_key
MINERVA_URL=http://localhost:8000

# File Storage
R2_BUCKET_NAME=pleasant-cove-uploads
AWS_ACCESS_KEY_ID=your_r2_access_key

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

---

## 🧪 Testing Your Deployment

### 1. Health Check
```bash
curl https://api.pleasantcovedesign.com/health
```

### 2. Test Order Creation
```bash
curl -X POST https://api.pleasantcovedesign.com/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "company": {"name": "Test Co", "email": "test@example.com"},
    "package": "basic",
    "total": 299
  }'
```

### 3. Test Email Service
```bash
curl -X POST https://api.pleasantcovedesign.com/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

---

## 📊 Monitoring & Logs

### View Logs
```bash
# Railway CLI
railway logs

# Or in Railway dashboard
Project → Deployments → View Logs
```

### Database Access
```bash
# Connect to PostgreSQL
railway connect postgresql
```

### Metrics
Railway provides built-in metrics:
- CPU usage
- Memory usage
- Network traffic
- Response times

---

## 🚨 Troubleshooting

### Common Issues

**Build Fails:**
```bash
# Check build logs in Railway dashboard
# Usually missing dependencies or TypeScript errors
```

**Database Connection:**
```bash
# Verify DATABASE_URL is set
railway variables

# Test connection
railway run npm run db:test
```

**Environment Variables:**
```bash
# List all variables
railway variables

# Check specific variable
railway variables get SENDGRID_API_KEY
```

**Webhook Issues:**
```bash
# Verify webhook URL in Stripe dashboard
# Should be: https://your-app.railway.app/api/stripe/webhook
```

### Debug Commands
```bash
# Check service status
railway status

# View recent deployments
railway logs --deployment

# Restart service
railway redeploy
```

---

## 💰 Railway Pricing

### Hobby Plan (Free)
- $5 monthly usage credit
- Perfect for development/testing
- Sleeps after 24h inactivity

### Pro Plan ($20/month)
- $20 monthly usage credit
- Always-on services
- Custom domains
- Priority support

### Usage Costs
- **CPU**: ~$0.000463/vCPU-hour
- **Memory**: ~$0.000231/GB-hour
- **Network**: $0.10/GB

**Typical costs for Pleasant Cove Design:**
- Small app: $5-10/month
- Medium traffic: $15-25/month
- High traffic: $30-50/month

---

## 🔒 Security Best Practices

### Environment Variables
- Never commit production secrets
- Use Railway's built-in secrets management
- Rotate keys regularly

### Database Security
- Railway PostgreSQL includes SSL by default
- Database is private by default
- Regular automated backups

### Network Security
- HTTPS enforced automatically
- Railway provides DDoS protection
- Private networking between services

---

## 🎉 Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] PostgreSQL database added
- [ ] All environment variables configured
- [ ] Custom domain configured
- [ ] DNS records updated
- [ ] SSL certificate active
- [ ] Health checks passing
- [ ] Stripe webhooks configured
- [ ] Email sending tested
- [ ] Monitoring set up

**🚂 You're live on Railway!**

---

## 📞 Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Railway Support**: https://railway.app/help
- **Status Page**: https://status.railway.app 