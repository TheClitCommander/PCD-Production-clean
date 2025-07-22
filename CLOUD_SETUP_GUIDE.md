# 🚀 Cloud Setup Guide - Minerva Production Deployment

## Current Status: **Ready for Cloud Setup**

Your Minerva system is **production-ready** but needs cloud configuration for full deployment. Here's what you need to set up:

---

## ☁️ **Cloud Storage Setup (Required for Production)**

### **Option 1: Cloudflare R2 (Recommended - Cheapest)**

#### **Why Cloudflare R2:**
- ✅ **$0.015/GB/month** storage (10x cheaper than S3)
- ✅ **Free egress** (no bandwidth costs)
- ✅ **S3-compatible API** (works with existing code)
- ✅ **Global CDN** included

#### **Setup Steps:**
1. **Create Cloudflare Account**: https://dash.cloudflare.com/sign-up
2. **Go to R2 Object Storage**: https://dash.cloudflare.com/r2
3. **Create a bucket** named: `minerva-demos` (or your preferred name)
4. **Generate API Token**:
   - Go to "Manage R2 API tokens"
   - Click "Create API token"
   - Give it "Object Read and Write" permissions
   - Save the **Account ID**, **Access Key ID**, and **Secret Access Key**

#### **Environment Variables to Set:**
```bash
export USE_CLOUD_STORAGE=true
export CLOUDFLARE_R2_BUCKET=minerva-demos
export CLOUDFLARE_R2_ENDPOINT=https://[YOUR-ACCOUNT-ID].r2.cloudflarestorage.com
export AWS_ACCESS_KEY_ID=[YOUR-R2-ACCESS-KEY]
export AWS_SECRET_ACCESS_KEY=[YOUR-R2-SECRET-KEY]
```

---

### **Option 2: Amazon S3 (Alternative)**

#### **Setup Steps:**
1. **AWS Console**: https://console.aws.amazon.com/s3/
2. **Create bucket** named: `minerva-demos-[your-name]`
3. **Create IAM user** with S3 permissions
4. **Generate access keys**

#### **Environment Variables:**
```bash
export USE_CLOUD_STORAGE=true
export CLOUDFLARE_R2_BUCKET=minerva-demos-yourname
export CLOUDFLARE_R2_ENDPOINT=https://s3.amazonaws.com
export AWS_ACCESS_KEY_ID=[YOUR-AWS-ACCESS-KEY]
export AWS_SECRET_ACCESS_KEY=[YOUR-AWS-SECRET-KEY]
```

---

## 📧 **Email Notifications Setup (For Error Alerts)**

### **Gmail App Password (Recommended)**

#### **Setup Steps:**
1. **Enable 2FA** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. **Set environment variables**:

```bash
export NOTIFICATION_EMAIL=your-email@gmail.com
export EMAIL_USER=your-email@gmail.com
export EMAIL_PASSWORD=[your-app-password]
export SMTP_SERVER=smtp.gmail.com
export SMTP_PORT=587
```

---

## 📊 **Analytics Webhook (Optional)**

### **For Advanced Analytics:**
If you want to send analytics to external services (Google Analytics, Mixpanel, etc.):

```bash
export ANALYTICS_WEBHOOK_URL=https://your-analytics-endpoint.com/webhook
```

---

## 🔧 **Quick Setup Script**

Save this as `setup_production.sh`:

```bash
#!/bin/bash
# Minerva Production Setup Script

echo "🚀 Setting up Minerva for production..."

# Check if .env file exists
if [ ! -f .env ]; then
    touch .env
fi

# Add cloud storage config
echo "☁️ Configuring cloud storage..."
echo "USE_CLOUD_STORAGE=true" >> .env
echo "CLOUDFLARE_R2_BUCKET=minerva-demos" >> .env

# Prompt for user input
echo ""
echo "📝 Please provide the following information:"
read -p "Cloudflare Account ID: " ACCOUNT_ID
read -p "R2 Access Key ID: " ACCESS_KEY
read -s -p "R2 Secret Access Key: " SECRET_KEY
echo ""
read -p "Notification Email: " NOTIFICATION_EMAIL
read -p "Gmail Email: " EMAIL_USER
read -s -p "Gmail App Password: " EMAIL_PASSWORD
echo ""

# Add to .env file
echo "CLOUDFLARE_R2_ENDPOINT=https://$ACCOUNT_ID.r2.cloudflarestorage.com" >> .env
echo "AWS_ACCESS_KEY_ID=$ACCESS_KEY" >> .env
echo "AWS_SECRET_ACCESS_KEY=$SECRET_KEY" >> .env
echo "NOTIFICATION_EMAIL=$NOTIFICATION_EMAIL" >> .env
echo "EMAIL_USER=$EMAIL_USER" >> .env
echo "EMAIL_PASSWORD=$EMAIL_PASSWORD" >> .env
echo "BASE_PUBLIC_URL=https://your-domain.com" >> .env

echo ""
echo "✅ Production configuration saved to .env file"
echo "🔧 Don't forget to update BASE_PUBLIC_URL with your actual domain!"
```

---

## 🌐 **Domain Setup (For Production URLs)**

### **Current Demo URLs:**
- Local: `http://localhost:8005/preview/demo_id?token=abc123`
- Production: `https://your-domain.com/preview/demo_id?token=abc123`

### **You'll Need:**
1. **Domain name** (like `minerva.pleasantcovedesign.com`)
2. **SSL certificate** (free with Cloudflare or Let's Encrypt)
3. **Update BASE_PUBLIC_URL** environment variable

---

## ✅ **What You DON'T Need to Set Up:**

- ✅ **Redis** - You already have it running locally
- ✅ **Database** - System uses file-based storage
- ✅ **Python environment** - Already configured
- ✅ **Code** - Everything is ready!

---

## 🧪 **Test Your Setup:**

Once configured, test with:

```bash
# Test cloud storage
source protection_env/bin/activate
python minerva_visual_generator.py test

# Test error notifications
python minerva_error_handler.py test_notification

# Test full system
python minerva_smart_outreach.py run 1
```

---

## 💰 **Expected Costs:**

### **Cloudflare R2:**
- **Storage**: ~$0.015/GB/month (100 demos = ~$0.01/month)
- **Bandwidth**: **FREE**
- **Requests**: $4.50/million (you'll use ~1000/month = $0.005)
- **Total**: **~$1-2/month**

### **Alternative: AWS S3:**
- **Storage**: ~$0.023/GB/month
- **Bandwidth**: $0.09/GB (can get expensive)
- **Total**: **~$5-20/month** depending on traffic

---

## 🚀 **Next Steps:**

1. **Choose**: Cloudflare R2 (recommended) or AWS S3
2. **Set up**: Create bucket and get API keys
3. **Configure**: Set environment variables
4. **Test**: Run the test commands above
5. **Deploy**: You're ready for production!

**Want me to help you set up any of these?** Just let me know which option you prefer! 🎯 