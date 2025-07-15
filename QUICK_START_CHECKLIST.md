# 🚀 Quick Start Checklist - Start Making Money TODAY

## ✅ Step 1: Server is Running
Your server is starting now. You should see:
- Vite server running on http://localhost:5173
- Ngrok URL like: https://xxxxx.ngrok.io

## ✅ Step 2: Add Webhook to Squarespace (5 minutes)

1. Log into Squarespace
2. Go to: **Settings → Advanced → Form & Pop-Up Storage**
3. Find your contact form
4. Click **"Add Storage"**
5. Choose **"Webhook"**
6. Enter your webhook URL: `https://YOUR-NGROK-URL.ngrok.io/api/new-lead`
7. Method: **POST**
8. Format: **JSON**
9. Save

## ✅ Step 3: Test It! (2 minutes)

1. Go to your Squarespace site
2. Fill out your contact form with test data:
   - Business Name: "Test Plumbing Co"
   - Phone: "207-555-TEST"
   - Email: "test@example.com"
3. Submit the form
4. Check http://localhost:5173/leads - Your lead should appear!

## ✅ Step 4: Monitor Your First Real Leads

Open these tabs in your browser:
- **http://localhost:5173/leads** - Your lead dashboard
- **Your terminal** - Watch for webhook hits
- **Squarespace form** - Ready for real submissions

## 📊 What Happens Automatically:

1. Lead comes in from Squarespace ✓
2. Shows in dashboard instantly ✓
3. Auto-enriched with score ✓
4. Tagged if no website (score 85+) ✓
5. Ready for you to click "Launch Bot" ✓

## 🎯 Your Daily Workflow:

### Morning (5 mins)
1. Start server: `./start-webhook-server.sh`
2. Check dashboard for overnight leads
3. Review high-score leads (80+)

### Midday (10 mins)
1. Select hot leads
2. Click "Launch Bot" to send SMS (currently in test mode)
3. Note responses in the UI

### Evening (5 mins)
1. Export day's leads
2. Plan follow-ups
3. Celebrate new opportunities!

## 💰 Money-Making Tips:

1. **Focus on Score 80+ leads** - These don't have websites!
2. **Call within 1 hour** - Speed wins deals
3. **$400 website + $50/month** - Your proven offer
4. **Track everything** - The UI shows all activity

## 🚨 Troubleshooting:

**"Webhook not working"**
- Check ngrok is running
- Verify URL in Squarespace has no typos
- Look for errors in terminal

**"No enrichment happening"**
- Check terminal for Python errors
- Enrichment runs 1 second after lead arrives

**"Can't see leads"**
- Refresh http://localhost:5173/leads
- Check PostgreSQL is running

## 📈 When You're Ready to Scale:

After 5-10 interested leads, deploy to production:
```bash
cd WebsiteWizard
railway up  # or use Vercel, Heroku, etc.
```

---

**Remember**: You have a working system NOW. Every lead that comes in is a potential $400 + $50/month client. 

Start collecting leads today! 🚀 