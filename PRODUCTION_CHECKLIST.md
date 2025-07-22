# 🚀 Production Deployment Checklist

## Pre-Deployment Requirements

### 1. **Environment Variables** ✅
Create `.env.production` with all required values:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.pleasantcovedesign.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/pleasant_cove_prod

# Zoom Integration (optional)
ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here

# AWS/Cloudflare R2 Storage
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=auto
R2_BUCKET_NAME=pleasant-cove-uploads
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret

# CORS Origins (space-separated)
CORS_ORIGINS="https://pleasantcovedesign.com https://www.pleasantcovedesign.com https://admin.pleasantcovedesign.com"

# JWT/Authentication
JWT_SECRET=generate_a_secure_random_string_here
SESSION_SECRET=another_secure_random_string

# Email Service (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password

# SMS Service (optional)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 2. **SSL/TLS Certificates** 🔒
- [ ] Obtain SSL certificates for all domains
- [ ] Configure HTTPS redirect
- [ ] Test certificate chain validity
- [ ] Set up auto-renewal (Let's Encrypt/Certbot)

### 3. **DNS Configuration** 🌐
- [ ] A records for main domain
- [ ] CNAME for www subdomain
- [ ] MX records for email (if using domain email)
- [ ] TXT records for SPF/DKIM (email authentication)

## Platform-Specific Checks

### 4. **Communication Features** 📱

#### Phone/FaceTime
- [ ] Test `tel:` links on:
  - [ ] iOS Safari
  - [ ] Android Chrome
  - [ ] Desktop Chrome (should open Skype/system dialer)
  - [ ] Desktop Safari
- [ ] Test FaceTime links on Apple devices
- [ ] Verify fallback behavior on non-Apple devices
- [ ] Check international phone number formats

#### Email
- [ ] Test mailto: links with:
  - [ ] Gmail web
  - [ ] Outlook desktop
  - [ ] Apple Mail
  - [ ] Mobile email clients
- [ ] Verify template length handling
- [ ] Test clipboard fallback for long templates
- [ ] Check special character encoding

#### Messaging/Chat
- [ ] Test WebSocket connections
- [ ] Verify CORS headers
- [ ] Test fallback to polling (if implemented)
- [ ] Check file upload limits
- [ ] Test real-time message delivery

### 5. **Third-Party API Integration** 🔗

#### Zoom (if using)
- [ ] Create Server-to-Server OAuth app
- [ ] Store credentials securely
- [ ] Test meeting creation
- [ ] Monitor rate limits
- [ ] Set up webhook endpoints (optional)

#### Payment Processing (if applicable)
- [ ] Switch to production API keys
- [ ] Test payment flow end-to-end
- [ ] Verify webhook security
- [ ] Enable fraud protection

### 6. **Security Hardening** 🛡️

- [ ] Enable rate limiting on all endpoints
- [ ] Configure CSP headers
- [ ] Set secure cookie flags
- [ ] Implement request validation
- [ ] Add SQL injection protection
- [ ] Enable XSS protection headers
- [ ] Audit npm dependencies (`npm audit`)

### 7. **Performance Optimization** ⚡

- [ ] Enable gzip/brotli compression
- [ ] Configure CDN for static assets
- [ ] Optimize images (WebP with fallbacks)
- [ ] Minify CSS/JS bundles
- [ ] Enable HTTP/2
- [ ] Set proper cache headers

### 8. **Monitoring & Logging** 📊

- [ ] Set up error tracking (Sentry/Rollbar)
- [ ] Configure application logs
- [ ] Set up uptime monitoring
- [ ] Create performance dashboards
- [ ] Configure alert thresholds
- [ ] Set up backup automation

## Device Testing Matrix

### 9. **Cross-Platform Testing** 📱💻

| Feature | iOS Safari | iOS Chrome | Android Chrome | macOS Safari | Windows Chrome | Windows Edge |
|---------|-----------|------------|----------------|--------------|----------------|--------------|
| Phone Links | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| FaceTime | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Email | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chat | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| File Upload | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 10. **Accessibility Testing** ♿
- [ ] Screen reader compatibility
- [ ] Keyboard navigation
- [ ] Color contrast ratios
- [ ] Focus indicators
- [ ] ARIA labels

## Deployment Steps

### 11. **Pre-Production Testing** 🧪
- [ ] Deploy to staging environment
- [ ] Run full test suite
- [ ] Perform load testing
- [ ] Test backup/restore procedures
- [ ] Verify all integrations

### 12. **Production Deployment** 🚀
- [ ] Create database backup
- [ ] Deploy backend services
- [ ] Run database migrations
- [ ] Deploy frontend assets
- [ ] Clear CDN cache
- [ ] Verify health checks

### 13. **Post-Deployment Verification** ✅
- [ ] Test critical user flows
- [ ] Verify all communication features
- [ ] Check payment processing
- [ ] Monitor error rates
- [ ] Verify analytics tracking

## Rollback Plan

### 14. **Emergency Procedures** 🚨
- [ ] Document rollback steps
- [ ] Keep previous version ready
- [ ] Test rollback procedure
- [ ] Have database backups ready
- [ ] Prepare incident communication

## Ongoing Maintenance

### 15. **Regular Tasks** 📅
- [ ] Weekly security updates
- [ ] Monthly dependency updates
- [ ] Quarterly security audits
- [ ] Annual SSL renewal
- [ ] Regular backup testing

## Quick Reference

### Critical URLs
- Production: https://pleasantcovedesign.com
- Admin: https://admin.pleasantcovedesign.com
- API: https://api.pleasantcovedesign.com
- Staging: https://staging.pleasantcovedesign.com

### Support Contacts
- DevOps: devops@pleasantcovedesign.com
- Security: security@pleasantcovedesign.com
- On-call: +1 (555) 123-4567

### Monitoring Dashboards
- Uptime: [StatusPage URL]
- Metrics: [Grafana URL]
- Logs: [LogSearch URL]
- Errors: [Sentry URL]

---

**Last Updated**: [Date]
**Next Review**: [Date + 30 days]
**Approved By**: [Name] 