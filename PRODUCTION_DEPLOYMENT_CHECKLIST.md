# 🚀 Pleasant Cove Design - Production Deployment Checklist

## 🔴 CRITICAL: Your Production Server is Missing Code!

**Current Issue:** The production server at `https://pleasantcovedesign-production.up.railway.app` is missing critical endpoints like `/api/messages/:id/read`, causing 404 errors and making your business look unprofessional.

## ✅ Immediate Fix (Do This NOW!)

### 1. Push Latest Code to GitHub
```bash
# Stage all changes
git add .

# Commit with clear message
git commit -m "Fix: Add missing read receipt endpoints and error handling"

# Push to main branch (Railway auto-deploys from here)
git push origin main
```

### 2. Monitor Railway Deployment
1. Go to https://railway.app/dashboard
2. Watch the deployment logs
3. Wait for "Deployment successful" (usually 2-3 minutes)

### 3. Verify Deployment
```bash
# Test the read endpoint exists
curl -X POST https://pleasantcovedesign-production.up.railway.app/api/messages/1/read \
  -H "Authorization: Bearer pleasantcove2024admin" \
  -H "Content-Type: application/json"

# Should return 200 OK or 404 for non-existent message (not 404 for missing endpoint)
```

## 🛡️ Preventing Future Issues

### Pre-Deployment Checklist
- [ ] All local changes committed
- [ ] Local testing complete
- [ ] No console errors in development
- [ ] API endpoints tested with curl/Postman

### Deployment Process
1. **Always deploy immediately after making changes**
   ```bash
   git add . && git commit -m "feat: your change" && git push origin main
   ```

2. **Set up deployment notifications**
   - Enable Railway Discord/Slack notifications
   - Get alerts when deployments fail

3. **Use environment variables properly**
   ```bash
   # Check production has all required vars:
   # - OPENAI_API_KEY
   # - R2_ACCESS_KEY_ID
   # - R2_SECRET_ACCESS_KEY
   # - R2_ENDPOINT
   # - R2_BUCKET_NAME
   ```

## 🔄 Automatic Deployment Setup

### GitHub Actions (Recommended)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          curl -X POST https://api.railway.app/v1/deployments \
            -H "Authorization: Bearer ${{ secrets.RAILWAY_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"projectId": "${{ secrets.RAILWAY_PROJECT_ID }}"}'
```

## 📊 Monitoring Production Health

### Daily Checks
```bash
# Run this every morning
./ensure_pleasant_cove_running.sh

# Check production endpoints
curl https://pleasantcovedesign-production.up.railway.app/health
```

### Critical Endpoints to Monitor
- `/health` - Overall server health
- `/api/public/project/:token/messages` - Customer messaging
- `/api/messages/:id/read` - Read receipts
- `/api/admin/conversations` - Admin inbox

## 🚨 Emergency Response

### If Production is Down:
1. **Check Railway Dashboard** - Look for deployment failures
2. **Rollback if needed** - Railway has one-click rollback
3. **Check logs**: 
   ```bash
   railway logs --last 100
   ```

### If Endpoints are 404:
1. **Verify deployment completed** - Check Railway dashboard
2. **Force redeploy**:
   ```bash
   git commit --allow-empty -m "Force redeploy"
   git push origin main
   ```

## 📱 Customer Communication

### If Issues Persist:
1. Update your Squarespace site with a banner:
   ```html
   <div style="background: #ff6b6b; color: white; padding: 10px; text-align: center;">
     We're experiencing technical difficulties with our messaging system. 
     Please email us directly at support@pleasantcovedesign.com
   </div>
   ```

2. Set up email fallback in widget

## 🎯 Business Continuity

### Never Let This Happen Again:
1. **Deploy immediately after changes** - Don't wait
2. **Test production after deployment** - Always verify
3. **Monitor customer messages** - Check inbox hourly
4. **Set up alerts** - Get notified of failures

### Quick Deploy Script
Save this as `deploy.sh`:
```bash
#!/bin/bash
echo "🚀 Deploying to production..."
git add .
git commit -m "$1"
git push origin main
echo "⏳ Waiting for deployment..."
sleep 180
curl https://pleasantcovedesign-production.up.railway.app/health
echo "✅ Deployment complete!"
```

Usage: `./deploy.sh "Your commit message"`

---

## 🔥 DO THIS RIGHT NOW:
```bash
git add .
git commit -m "Fix: Add missing read receipt endpoints"
git push origin main
```

Your customers are waiting! 🚀 