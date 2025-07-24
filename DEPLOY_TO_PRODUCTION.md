# 🚀 Deploy Latest Code to Production (Railway)

## Quick Deploy Steps

1. **Commit your changes:**
```bash
git add .
git commit -m "Fix: Handle missing endpoints gracefully in messaging widget"
git push origin main
```

2. **Railway will auto-deploy** from your GitHub repo

3. **Monitor deployment:**
- Go to https://railway.app/dashboard
- Check your Pleasant Cove Design project
- Watch the deployment logs

## What's Fixed in This Update

✅ **Messaging widget now handles missing endpoints gracefully:**
- No more 404 errors breaking the widget
- Read receipts fail silently if endpoint not available
- Squarespace API calls already disabled

## Verify Deployment

After deployment completes (usually 2-3 minutes), test:

```bash
# Check health
curl https://pleasantcovedesign-production.up.railway.app/health

# Test messaging endpoint
curl https://pleasantcovedesign-production.up.railway.app/api/public/project/mc50o9qu_69gdwmMznqd-4weVuSkXxQ/messages
```

## Update Widget on Squarespace

1. Go to your Squarespace site
2. Navigate to the page with the messaging widget
3. Edit the Code Block
4. Replace with the updated widget from:
   `/Users/bendickinson/Desktop/pleasantcovedesign/pleasantcovedesign/client-widget/messaging-widget-unified.html`

## Troubleshooting

If messages still aren't showing:

1. **Hard refresh** your browser (Cmd+Shift+R)
2. **Clear browser cache**
3. **Check browser console** - errors should now be informational only
4. **Verify admin UI** is connected to production (check the .env file) 