# 🚂 Railway Deployment Checklist

## ✅ Step 1: Set Build & Start Commands

Go to **Railway → Your Service → Settings → Build & Deploy**

### Build Command (paste as ONE LINE):
```bash
npm ci --prefix pleasantcovedesign/server && npm run build --prefix pleasantcovedesign/server && npm ci --prefix pleasantcovedesign/admin-ui && VITE_API_URL=/api VITE_WS_URL= npm run build --prefix pleasantcovedesign/admin-ui && mkdir -p pleasantcovedesign/server/dist/public/admin && cp -R pleasantcovedesign/admin-ui/dist/client/* pleasantcovedesign/server/dist/public/admin/
```

### Start Command:
```bash
node pleasantcovedesign/server/dist/index.js
```

### Root Directory:
Leave empty (uses repository root)

---

## ✅ Step 2: Set Environment Variables

**Minimum Required:**
```bash
NODE_ENV=production
DATABASE_URL=[Railway provides this automatically]
ADMIN_PASSWORD=your_secure_password_here
JWT_SECRET=your_jwt_secret_here
```

**Recommended:**
```bash
# File Storage (prevents data loss on redeploy)
R2_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
R2_REGION=auto
R2_BUCKET=your-bucket-name
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret

# Email
SENDGRID_API_KEY=SG.your_key
FROM_EMAIL=admin@pleasantcovedesign.com
FROM_NAME=Pleasant Cove Design

# Payments
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_SUCCESS_URL=https://your-domain.com/success
STRIPE_CANCEL_URL=https://your-domain.com/cancel

# CORS (add your Squarespace domain)
CORS_ORIGINS=https://your-site.squarespace.com,https://www.pleasantcovedesign.com
```

---

## ✅ Step 3: Deploy

Click **Deploy** or **Redeploy** in Railway

Watch the build logs for:
- ✅ "Building Admin UI..."
- ✅ "Serving Admin UI from: /app/pleasantcovedesign/server/dist/public/admin"
- ✅ "Admin UI routes configured - accessible at /"

---

## ✅ Step 4: Test Your Deployment

### 1. API Health Check:
```
https://your-service.up.railway.app/api/health
```
Should return: `{"status":"ok"}`

### 2. Admin UI Login:
```
https://your-service.up.railway.app/leads
```
- Login page should appear
- Use your `ADMIN_PASSWORD` to login

### 3. WebSocket Connection:
- Open Inbox
- Should show "Connected" in green

### 4. Database Persistence:
- Create a test company
- Refresh the page
- Company should still be there

### 5. File Upload (if R2 configured):
- Upload a file in Inbox
- Copy the file URL
- Redeploy the service
- File should still be accessible

---

## ✅ Step 5: Update Desktop Shortcut

### macOS:
1. Right-click your existing shortcut
2. Change URL from `http://localhost:5173/leads` to:
   ```
   https://your-service.up.railway.app/leads
   ```

### Or create a new `.webloc` file:
1. Open TextEdit
2. Paste:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
       <key>URL</key>
       <string>https://your-service.up.railway.app/leads</string>
   </dict>
   </plist>
   ```
3. Save as `Pleasant Cove Admin.webloc` on Desktop

---

## 🚨 Troubleshooting

### Blank page on `/leads`:
- Check Railway logs for "Admin UI directory not found"
- Ensure build command ran successfully
- Check that files exist at `/app/pleasantcovedesign/server/dist/public/admin`

### CORS errors:
- Admin UI should NOT have CORS errors (same-origin)
- If you see CORS errors, you might be accessing wrong URL
- CORS_ORIGINS should only include external domains (Squarespace, etc.)

### WebSocket not connecting:
- Check that you're using HTTPS (not HTTP)
- Railway Pro plan required for WebSocket support
- Check browser console for connection errors

### Old UI after deploy:
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Clear browser cache
- Check Railway build logs to confirm new build completed

### 404 on API routes:
- Ensure routes start with `/api/`
- Check that regex in index.ts is: `/^\/(?!api\/).*/`

---

## 📝 Quick Reference

### Your URLs:
- **Admin Dashboard:** `https://your-service.up.railway.app/dashboard`
- **Leads:** `https://your-service.up.railway.app/leads`
- **Inbox:** `https://your-service.up.railway.app/inbox`
- **API Health:** `https://your-service.up.railway.app/api/health`

### Making Updates:
1. Make changes locally
2. Commit and push to GitHub
3. Railway auto-deploys (or click Redeploy)
4. Admin UI rebuilds automatically with build command

---

## ✅ Success Indicators

You know it's working when:
1. ✅ No more `localhost:5173` errors
2. ✅ Admin UI loads from Railway URL
3. ✅ WebSocket shows "Connected"
4. ✅ Data persists after refresh
5. ✅ Desktop shortcut opens Railway URL

---

## 🎉 That's it!

Your Admin UI now lives at your Railway URL. No more localhost, no more two servers, just one stable production URL!
