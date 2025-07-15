# Squarespace → Bot Direct Connection Setup

## Option 1: Use ngrok (Easiest for Testing)

1. Install ngrok:
```bash
brew install ngrok
```

2. Start your WebsiteWizard server:
```bash
cd WebsiteWizard
npm run dev
```

3. In another terminal, expose your local server:
```bash
ngrok http 5173
```

4. You'll get a URL like: `https://abc123.ngrok.io`

5. Your webhook URL will be:
```
https://abc123.ngrok.io/api/new-lead
```

## Option 2: Deploy to a Real Server (Production)

Use Vercel, Railway, or any Node.js host. But for now, let's test locally with ngrok.

## 🔧 Squarespace Setup

1. **Log into Squarespace**
2. **Go to:** Settings → Advanced → Form & Pop-Up Storage
3. **Find your contact form**
4. **Click:** "Add Storage"
5. **Choose:** "Webhook"
6. **Enter URL:** `https://YOUR-NGROK-URL.ngrok.io/api/new-lead`
7. **Method:** POST
8. **Format:** JSON

## 📝 What Squarespace Sends

Your webhook will receive data like this:
```json
{
  "formId": "123456",
  "submissionId": "789",
  "data": {
    "name": "John's Plumbing",
    "email": "john@plumbing.com",
    "phone": "207-555-1234",
    "message": "Need a website for my plumbing business"
  }
}
```

## ✅ Test It

1. Submit a test form on your Squarespace site
2. Check your terminal - you should see the webhook hit
3. Check the UI at http://localhost:5173/leads - new lead should appear!

## 🚀 That's It!

No more:
- ❌ Zapier subscriptions
- ❌ Email parsing
- ❌ Google Sheets delays
- ❌ Manual copying

Just:
- ✅ Form → API → Bot → UI
- ✅ Instant enrichment
- ✅ Automatic scoring
- ✅ One-click outreach 