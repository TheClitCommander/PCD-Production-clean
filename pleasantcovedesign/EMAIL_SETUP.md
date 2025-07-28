# 📧 Professional Email Setup Guide

This guide walks you through setting up **beautiful, professional email sending** for Pleasant Cove Design using SendGrid.

---

## ✨ **What You Get**

After setup, your system will automatically send:

- 🧾 **Professional receipts** with transaction details
- 🎉 **Welcome emails** with project timelines
- 📄 **Invoice emails** with secure payment links
- 📊 **Team notifications** for new projects

All with beautiful HTML templates and your branding!

---

## 🚀 **Quick Setup (5 minutes)**

### **Step 1: Get Your SendGrid API Key**

1. Go to [SendGrid.com](https://sendgrid.com) and create a free account
2. Navigate to **Settings > API Keys**
3. Click **Create API Key**
4. Choose **Full Access** (or **Restricted** with Mail Send permissions)
5. Copy your API key (starts with `SG.`)

### **Step 2: Configure Environment Variables**

Add these to your `.env` file:

```bash
# Email Configuration
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
FROM_EMAIL=hello@pleasantcovedesign.com
FROM_NAME=Pleasant Cove Design
```

### **Step 3: Verify Domain (Recommended)**

1. In SendGrid, go to **Settings > Sender Authentication**
2. Click **Authenticate Your Domain**
3. Add your domain (e.g., `pleasantcovedesign.com`)
4. Follow DNS setup instructions

### **Step 4: Test the System**

```bash
# Start your server
cd server && npm start

# Run the complete test
../test-stripe-integration.sh
```

Look for these success messages:
```
✅ Receipt email sent to client@example.com
✅ Welcome email sent to client@example.com
✅ Payment link email sent to client@example.com
```

---

## 🎨 **Email Templates Included**

### **📄 Invoice Email**
- Clean, branded header with your logo
- One-click payment button
- Professional invoice details
- Mobile-responsive design

### **🧾 Receipt Email**
- Detailed transaction information
- Professional receipt formatting
- Next steps for the client
- Contact information

### **🎉 Welcome Email**
- Congratulations message
- Project timeline
- Package features breakdown
- Team contact information

---

## 🔧 **Advanced Configuration**

### **Custom Branding**

Update these variables in your `.env`:

```bash
FROM_EMAIL=billing@yourdomain.com
FROM_NAME=Your Company Name
```

### **Development vs Production**

**Development (No API Key):**
- Emails are logged to console
- Perfect for testing flows
- No emails actually sent

**Production (With API Key):**
- Real emails sent via SendGrid
- Professional delivery
- Tracking and analytics

### **Alternative Email Providers**

If you prefer not to use SendGrid, you can modify `email-service.ts` to use:

- **Nodemailer + Gmail SMTP**
- **AWS SES**
- **Mailgun**
- **Postmark**

---

## 📊 **Monitoring & Analytics**

### **SendGrid Dashboard**
- Track email delivery rates
- Monitor bounce rates
- View email engagement
- Set up alerts for failures

### **System Logs**
Check your server logs for:
```
✅ Email sent successfully to client@example.com
❌ Email sending failed: [error details]
📧 [SIMULATION] Email would be sent: [in development]
```

---

## 🛠️ **Testing & Troubleshooting**

### **Test Checklist**

1. ✅ API key is valid and has permissions
2. ✅ FROM_EMAIL is verified in SendGrid
3. ✅ Server is running without email errors
4. ✅ Test emails appear in recipient inbox (not spam)

### **Common Issues**

**❌ "Email sending failed: Forbidden"**
- Check API key permissions
- Verify sender authentication

**❌ Emails going to spam**
- Complete domain authentication
- Add SPF/DKIM records
- Verify sender reputation

**❌ "SENDGRID_API_KEY not found"**
- Check `.env` file exists
- Verify environment variable names
- Restart server after adding keys

### **Test Commands**

```bash
# Test order creation with email
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "test-company",
    "package": "standard",
    "custom_items": []
  }'

# Test invoice sending
curl -X POST http://localhost:3001/api/orders/ORDER_ID/send-invoice

# Test payment webhook (simulated)
curl -X POST http://localhost:3001/api/orders/ORDER_ID/record-payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "method": "stripe",
    "transaction_id": "pi_test_123"
  }'
```

---

## 🔐 **Security Best Practices**

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Verify sender authentication** in SendGrid
4. **Monitor for suspicious activity** in email logs
5. **Use HTTPS** for all webhook endpoints

---

## 📈 **Production Deployment**

Before going live:

1. ✅ **Domain authentication** completed
2. ✅ **Production API key** configured  
3. ✅ **FROM_EMAIL** using your domain
4. ✅ **Email templates** customized with your branding
5. ✅ **Webhook URLs** updated to production domains
6. ✅ **Rate limiting** configured if high volume

---

## 💡 **Next Steps**

Once email is working:

1. **A) Test Everything** - Run full end-to-end tests
2. **C) Production Database** - Upgrade from in-memory storage
3. **D) Deploy to Production** - Make it live!

---

**🎯 Result: Professional, automated email system that makes your business look incredibly polished and trustworthy!**

---

## 📞 **Need Help?**

- Check server logs for detailed error messages
- Test with SendGrid's email validation tools
- Verify DNS records with online DNS checkers
- Review SendGrid documentation for advanced features

**Happy emailing!** 📧✨ 