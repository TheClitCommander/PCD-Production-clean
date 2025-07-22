# 🎯 Minerva Production Checklist - What YOU Need to Do

## 🚨 **CRITICAL - Ben Must Do These (I Can't Help):**

### 1. **☁️ Cloud Storage Setup**
**What:** Create Cloudflare R2 bucket for hosting demos
**Why:** So demo links work when sent to clients
**Steps:**
- [ ] Sign up at https://dash.cloudflare.com/sign-up
- [ ] Go to R2 Object Storage
- [ ] Create bucket named `minerva-demos` 
- [ ] Generate API tokens (Account ID, Access Key, Secret Key)
- [ ] Give me the credentials to configure

**Cost:** ~$1-2/month

---

### 2. **📧 Email Setup for Notifications**
**What:** Gmail app password for error alerts
**Why:** Know immediately if something breaks
**Steps:**
- [ ] Enable 2FA on Gmail
- [ ] Generate App Password (Google Account → Security → App passwords)
- [ ] Give me the app password to configure

**Cost:** Free

---

### 3. **🌐 Domain & SSL Setup**
**What:** Public domain for demo links
**Why:** Professional URLs instead of localhost
**Options:**
- [ ] **Option A:** Use existing domain (pleasantcovedesign.com)
- [ ] **Option B:** Buy new subdomain (demos.pleasantcovedesign.com)
- [ ] **Option C:** Use free service (Netlify/Vercel)

**Cost:** $0-15/year

---

### 4. **💳 Payment Processing**
**What:** Stripe account for collecting payments
**Why:** Automate payment collection from demos
**Steps:**
- [ ] Create Stripe account
- [ ] Get API keys (Publishable + Secret)
- [ ] Set up webhook endpoint
- [ ] Give me credentials to integrate

**Cost:** 2.9% + 30¢ per transaction

---

### 5. **📱 SMS/Email Service**
**What:** Real sending capability (currently just previews)
**Why:** Actually send messages to prospects
**Options:**
- [ ] **SMS:** Twilio ($0.0075/message)
- [ ] **Email:** SendGrid (100 free/day, then $15/month)

---

### 6. **👨‍💻 Upwork Integration**
**What:** How to hire developers automatically
**Why:** Fulfill paid projects without manual work
**Needs Planning:**
- [ ] Standard project template
- [ ] Budget ranges per service type
- [ ] Quality control process
- [ ] Communication flow with developers

---

### 7. **💰 Business Model Decisions**
**What:** Pricing and service structure
**Why:** Know what to charge and deliver
**Decide:**
- [ ] **Pricing tiers** (Basic $X, Premium $Y, etc.)
- [ ] **Service packages** (What's included in each tier)
- [ ] **Timeline expectations** (How fast delivery)
- [ ] **Revision policy** (How many changes included)

---

## 🧪 **TESTING - We Can Do Together:**

### 8. **✅ Demo Quality Testing**
- [ ] Test all business types (plumbing, restaurant, etc.)
- [ ] Check mobile responsiveness
- [ ] Verify all links work
- [ ] Test analytics tracking

### 9. **✅ Outreach Message Testing**
- [ ] Review SMS templates for different industries
- [ ] Test email formatting and deliverability
- [ ] A/B test different messaging approaches
- [ ] Verify personalization works correctly

### 10. **✅ End-to-End Flow Testing**
- [ ] Full pipeline test with fake data
- [ ] Error handling and retry logic
- [ ] Performance under load
- [ ] Analytics and reporting accuracy

### 11. **✅ Security & Reliability**
- [ ] Test token-based access control
- [ ] Verify demo expiration works
- [ ] Test error notifications
- [ ] Backup and recovery procedures

---

## 📋 **IMMEDIATE PRIORITIES (In Order):**

### **Phase 1: Foundation (This Week)**
1. **Cloud Storage** (#1) - Host demos publicly
2. **Domain Setup** (#3) - Professional demo URLs
3. **Email Notifications** (#2) - Know when things break

### **Phase 2: Business Model (Next Week)**
4. **Pricing Strategy** (#7) - What to charge
5. **Service Packages** (#7) - What to deliver
6. **Upwork Process** (#6) - How to fulfill

### **Phase 3: Payment & Automation (Week 3)**
7. **Stripe Integration** (#4) - Collect payments
8. **SMS/Email Services** (#5) - Real sending
9. **Full Testing** (#8-11) - Everything bulletproof

---

## 🎯 **WHAT WE CAN TEST RIGHT NOW:**

While you work on the setup items, we can test:

```bash
# Test demo generation for all business types
python minerva_test_mode.py templates

# Test complete flow with your contact info
python minerva_test_mode.py run 5

# Test error handling and edge cases
python minerva_error_handler.py test_notification
```

---

## 🚀 **RECOMMENDED START:**

**This Week:** Focus on **Cloud Storage + Domain** (#1 + #3)
- This gets demos working with real URLs
- Everything else can wait until this is solid
- We can test extensively with these two pieces

**Questions for you:**
1. Do you want to use your existing domain or get a new one?
2. Should we start with Cloudflare R2 or try a free alternative first?
3. What's your comfort level with the monthly costs (~$3-5 total)?

**Once you have credentials, I can configure everything and we'll test until it's bulletproof!** 💪 