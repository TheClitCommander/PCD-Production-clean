# Webhooks: The No-Bullshit Guide

## What Happens When Someone Fills Your Form:

```
1. Customer fills form on Squarespace
   ↓
2. Customer hits "Submit"
   ↓
3. Squarespace sends that data to YOUR webhook URL
   ↓
4. Your server catches it instantly
   ↓
5. Your bot processes it
   ↓
6. Lead appears in your dashboard
```

## 🏗️ Setting Up a Webhook (Start to Finish):

### Step 1: You Need a URL That Can Receive Data

Your server needs an endpoint like:
```
https://yourserver.com/api/new-lead
```

We already built this! It's in your code at:
```javascript
app.post("/api/new-lead", async (req, res) => {
  // This catches the webhook data
})
```

### Step 2: Make Your Local Server Accessible

Problem: Your server is on your computer (localhost)
Solution: Use ngrok to give it a public URL

```bash
# Start your local server
cd WebsiteWizard && npm run dev

# In another terminal, expose it to the internet
ngrok http 5173

# You get a URL like:
https://abc123.ngrok.io
```

### Step 3: Tell Squarespace Where to Send Data

1. Log into Squarespace
2. Go to: Settings → Advanced → Form & Pop-Up Storage
3. Find your form
4. Click "Add Storage"
5. Choose "Webhook"
6. Enter: `https://abc123.ngrok.io/api/new-lead`

### Step 4: What Actually Happens

When someone submits your form:

```json
// Squarespace sends this to your webhook:
{
  "formId": "123",
  "data": {
    "name": "Bob's Plumbing",
    "email": "bob@plumbing.com",
    "phone": "555-1234",
    "message": "I need a website"
  }
}
```

Your server catches it and responds:
```json
{
  "success": true,
  "message": "Got it!"
}
```

## 🧪 Testing Your Webhook:

### Test 1: Is my server running?
```bash
curl http://localhost:5173/api/new-lead
```

### Test 2: Can I receive data?
```bash
curl -X POST http://localhost:5173/api/new-lead \
  -H "Content-Type: application/json" \
  -d '{"data": {"name": "Test Company"}}'
```

### Test 3: Full integration
1. Set up ngrok
2. Add webhook to Squarespace
3. Submit a test form
4. Check your dashboard

## 🚨 Common Webhook Problems:

**"It's not working!"**
- Is your server running? (`npm run dev`)
- Is ngrok running? (`ngrok http 5173`)
- Did you use the ngrok URL, not localhost?
- Is the URL exactly right? (no typos)

**"Squarespace says error"**
- Your server must respond with status 200
- Must respond within 10 seconds
- Check your server logs for errors

**"Data looks weird"**
- Log what you receive: `console.log(req.body)`
- Squarespace wraps data in a `data` field
- We handle this in the code already

## 🎯 The Magic Part:

Once it's set up:
1. Customer fills form at 2am
2. Your webhook catches it instantly
3. Bot enriches the lead automatically
4. You wake up to scored, tagged, ready-to-call leads

No more:
- Checking emails
- Copying from Zapier
- Manual data entry
- Missing hot leads

## 🔥 Production Setup:

When you're ready to go live:
1. Deploy to Vercel/Railway/Heroku
2. Get a permanent URL (not ngrok)
3. Update Squarespace webhook
4. That's it - runs 24/7

---

**Bottom line**: A webhook is just a URL that catches data. That's it. No magic. 