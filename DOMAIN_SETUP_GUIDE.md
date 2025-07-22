# 🌐 Custom Domain Setup Guide
## Setting Up `demos.pleasantcovedesign.com`

### **Step 1: Squarespace DNS Configuration**

1. **Log into Squarespace** and go to your domain settings
2. **Navigate to:** Settings → Domains → `pleasantcovedesign.com` → DNS Settings
3. **Add a CNAME record:**
   - **Host/Name:** `demos`
   - **Points to:** `pub-68bdc8d034ed66782c0cda99d4ffbb4.r2.dev`
   - **TTL:** Default (3600 seconds)

### **Step 2: Cloudflare R2 Custom Domain**

1. **Go to your R2 bucket:** `minerva-lead-mockups-2025`
2. **Settings tab** → **Custom Domains**
3. **Add custom domain:** `demos.pleasantcovedesign.com`
4. **Enable HTTPS** (should be automatic)

### **Step 3: Test the Setup**

After DNS propagates (5-15 minutes):
- Upload a test file to your R2 bucket
- Visit: `https://demos.pleasantcovedesign.com/test.html`

---

## 📋 **Manual Upload Process (Until API Keys Work)**

### **Upload Demo Files:**
1. **Generate demos locally** (we already have this working)
2. **Go to Cloudflare R2** → `minerva-lead-mockups-2025` → Objects
3. **Drag & drop** the HTML files
4. **Share URLs** like: `https://demos.pleasantcovedesign.com/bens-plumbing-demo.html`

### **URL Structure:**
```
https://demos.pleasantcovedesign.com/business-name-demo.html
```

---

## 🎯 **Expected Results**

**Before:** `http://localhost:8000/demo.html`
**After:** `https://demos.pleasantcovedesign.com/demo.html`

**Professional client-ready URLs!** ✨

---

## 🔧 **Configuration Details**

**Your R2 Bucket:** `minerva-lead-mockups-2025`
**Account ID:** `fa7598d9548bb7564ff3585546e3e5a8`
**Public URL:** `https://pub-68bdc8d034ed66782c0cda99d4ffbb4.r2.dev`
**Custom Domain:** `demos.pleasantcovedesign.com`

---

## ✅ **Verification Steps**

1. **DNS Check:** `nslookup demos.pleasantcovedesign.com`
2. **HTTPS Test:** Visit the custom domain
3. **Upload Test:** Try uploading a simple HTML file
4. **Demo Test:** Upload one of our generated demos

---

## 🚨 **Troubleshooting**

**If custom domain doesn't work:**
- Wait 15 minutes for DNS propagation
- Check CNAME record is correct
- Verify R2 custom domain is added
- Try clearing browser cache

**If SSL doesn't work:**
- Cloudflare usually handles this automatically
- May take up to 24 hours for full SSL setup 