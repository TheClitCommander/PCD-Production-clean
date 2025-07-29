# 🚀 Railway Environment Variables Setup

## Required Environment Variables for Production

Copy these to your Railway project's Variables section:

### **Core Application**
```
NODE_ENV=production
PORT=3000
```

### **Database (Use Railway's PostgreSQL)**
```
DATABASE_URL=postgresql://[RAILWAY_POSTGRES_URL]
```

### **Authentication & Security**
```
JWT_SECRET=[Generate new 32-character random string]
SESSION_SECRET=[Generate new 32-character random string]
ADMIN_PASSWORD=[Your secure admin password]
```

### **Stripe (Copy from your current setup)**
```
STRIPE_API_KEY=sk_test_[YOUR_STRIPE_TEST_KEY_HERE]
STRIPE_WEBHOOK_SECRET=[Get from Stripe dashboard after setting webhook]
```

### **OpenAI (Minerva AI)**
```
OPENAI_API_KEY=[Your OpenAI API key]
```

### **Twilio (SMS)**
```
TWILIO_ACCOUNT_SID=[Your Twilio SID]
TWILIO_AUTH_TOKEN=[Your Twilio token]
TWILIO_PHONE_NUMBER=[Your Twilio phone]
```

### **SendGrid (Email)**
```
SENDGRID_API_KEY=[Your SendGrid API key]
FROM_EMAIL=support@pleasantcovedesign.com
```

### **Application URLs**
```
DEPLOY_URL=https://[YOUR_RAILWAY_URL].up.railway.app
FRONTEND_URL=https://[YOUR_RAILWAY_URL].up.railway.app
```

### **CORS Origins**
```
ALLOWED_ORIGINS=https://[YOUR_RAILWAY_URL].up.railway.app,https://www.pleasantcovedesign.com,https://nectarine-sparrow-dwsp.squarespace.com
```

## 📝 Setup Steps:

1. **Add PostgreSQL**: In Railway dashboard, click "+ Add Service" → PostgreSQL
2. **Copy DATABASE_URL**: From PostgreSQL service variables
3. **Set all variables**: In main service → Variables tab
4. **Update Stripe webhook**: Point to `https://[YOUR_RAILWAY_URL].up.railway.app/api/stripe/webhook`
5. **Test deployment**: Check logs for successful startup

## 🔍 Post-Deployment Checklist:

- [ ] Health check responds: `https://[YOUR_RAILWAY_URL].up.railway.app/api/health`
- [ ] Widget loads: `https://[YOUR_RAILWAY_URL].up.railway.app/widget/messaging-widget-unified.html`
- [ ] Admin UI connects (update api.ts if needed)
- [ ] Stripe webhook receives events
- [ ] Database connection works
- [ ] File uploads work (or configure R2 storage)

## 🚨 Important Notes:

- **Never commit secrets** - only set in Railway Variables
- **Use live Stripe keys** for production (when ready)
- **Set up domain**: Connect your custom domain in Railway settings
- **Monitor logs**: Check Railway logs for any startup errors 