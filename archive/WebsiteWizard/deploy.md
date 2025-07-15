# Deployment Guide for Pleasant Cove Design Website Wizard

## Quick Start - Railway (Recommended)

1. **Sign up at [railway.app](https://railway.app)**

2. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

3. **Deploy:**
   ```bash
   railway login
   railway link  # Create new project when prompted
   railway up
   ```

4. **Get your URL:**
   ```bash
   railway open
   ```

Your app will be live at: `https://YOUR-PROJECT.up.railway.app`

## Setting Up Squarespace Webhook

Once deployed, configure your Squarespace webhook:

1. **In Squarespace:**
   - Go to: Settings → Advanced → Developer Tools → Webhooks
   - Click "Create Webhook"
   - Set URL: `https://YOUR-DEPLOYED-URL/api/new-lead`
   - Events: Form Submissions
   - Select your form: `8369e0f3-42c3-4393-a53d-3873bc0d96ca`

2. **Test the webhook:**
   - Submit a test form on Squarespace
   - Check your admin dashboard for the new lead

## Production Database

Your SQLite database (`websitewizard.db`) will be created automatically on first run.

To backup your database:
```bash
railway run sqlite3 websitewizard.db ".backup backup.db"
railway run cat backup.db > local-backup.db
```

## Environment Variables

No additional environment variables needed! The app uses:
- Admin token: `pleasantcove2024admin` (hardcoded for now)
- Database: SQLite file in the project directory

## Custom Domain (Optional)

After deployment:
1. In Railway/Render/Netlify settings, add custom domain
2. Point your domain (e.g., `app.pleasantcovedesign.com`) to the provided URL
3. Update Squarespace webhook URL to use your custom domain

## Monitoring

Check webhook logs:
```
https://YOUR-DEPLOYED-URL/api/webhook-debug
```

## Support

If you encounter issues:
1. Check Railway logs: `railway logs`
2. Verify webhook is sending data to correct URL
3. Check `/api/webhook-debug` endpoint for recent submissions 