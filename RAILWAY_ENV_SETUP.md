# Railway Environment Variables Setup

## Core Application
```
NODE_ENV=production
PORT=3000
```

## Database (Railway Postgres Plugin)
```
DATABASE_URL=postgresql://...  # Set by Railway Postgres plugin
```

## Authentication
```
ADMIN_PASSWORD=Lorrainefriant1!
JWT_SECRET=your-jwt-secret-here-generate-random-string
```

## Lead Pipeline Configuration
```
# Verification Mode
RESOLVER_MODE=scrape  # or 'api' for Google Places API

# Cost Controls
MAX_DAILY_LEADS=500
MAX_CONCURRENT_FETCHES=4
REQUEST_TIMEOUT_MS=9000

# Feature Flags
VITE_FEATURE_EXPORT_LEADS=true
VITE_FEATURE_CLIENT_ADD=true
VITE_FEATURE_VIDEO_CALL=false
VITE_FEATURE_REPORTS=false
VITE_FEATURE_BULK_FOLLOWUP=false
```

## CORS & Origins
```
CORS_ORIGINS=https://your-squarespace-domain.com,https://pcd-production-clean-production-e6f3.up.railway.app
RAILWAY_PUBLIC_DOMAIN=pcd-production-clean-production-e6f3.up.railway.app
```

## Optional External Services
```
# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@pleasantcovedesign.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Stripe (if billing enabled)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cloudflare R2 (if file uploads enabled)
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret
CLOUDFLARE_R2_BUCKET_NAME=pcd-uploads
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

## 5-Minute Acceptance Test Checklist

1. **Access Admin UI**: `https://your-railway-url.up.railway.app/`
   - Should redirect to login if not authenticated
   - Login with `ADMIN_PASSWORD`

2. **Navigate to Leads**: `https://your-railway-url.up.railway.app/leads`
   - Should show empty leads table initially
   - "Start Scraping" button should be visible

3. **Test Scraping**:
   - Click "Start Scraping"
   - Enter: City: "Portland, Maine", Category: "plumbers", Limit: 25
   - Progress panel should appear
   - Leads should stream in with website status badges

4. **Test Website Verification**:
   - Check 3-5 leads marked "HAS_SITE" - URLs should resolve and match business
   - Check 2-3 leads marked "NO_SITE" - should truly have no website
   - Click "Re-verify" button on 1-2 "UNSURE" leads

5. **Test Data Persistence**:
   - Refresh page - data should persist
   - Filter by website status - results should update

## Build Commands for Railway

Railway should use these commands (already configured in `railway.json`):

**Build:**
```bash
cd pleasantcovedesign/server && npm ci && npm run build && cd ../admin-ui && npm ci && VITE_API_URL=/api VITE_WS_URL= npm run build && cd ../server && mkdir -p dist/public/admin && cp -R ../admin-ui/dist/client/* dist/public/admin/ && ls -la dist/
```

**Start:**
```bash
node dist/index.js
```

## Testing API Endpoints

Once deployed, test these endpoints:

```bash
# Health check
curl https://your-railway-url.up.railway.app/health

# Get leads (requires auth token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://your-railway-url.up.railway.app/api/leads

# Start scrape (requires auth token)  
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"city":"Portland, Maine","category":"plumbers","limit":10}' \
  https://your-railway-url.up.railway.app/api/scrape-runs
```

## Troubleshooting

**If scraping fails:**
- Check Railway logs for Python script errors
- Ensure `scrapers/verify_site.py` is executable
- Verify `requests` package is available in Python environment

**If UI shows localhost URLs:**
- Check `VITE_API_URL=/api` in build command
- Verify Admin UI is served from `/` route in server

**If database errors:**
- Check `DATABASE_URL` is set correctly
- Verify Railway Postgres plugin is connected
- Check server logs for migration/table creation errors
