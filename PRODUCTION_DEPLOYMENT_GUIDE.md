# 🚀 Production Deployment Guide

## Overview

This guide walks you through deploying Pleasant Cove Design to production, addressing all the "gotchas" and manual steps that Cursor can't automate.

## Pre-Deployment Checklist

### 1. **Environment Setup** (5% Manual Work)

```bash
# 1. Copy environment template
cp ENV_TEMPLATE.md .env.production

# 2. Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -hex 32     # For SESSION_SECRET

# 3. Fill in production values
nano .env.production
```

**Manual Tasks:**
- [ ] Create Zoom Server-to-Server OAuth app
- [ ] Set up Cloudflare R2 bucket
- [ ] Configure Twilio account (if using SMS)
- [ ] Create SSL certificates

### 2. **Domain & DNS Configuration**

```bash
# Example DNS records to add:
A     @        YOUR_SERVER_IP
A     www      YOUR_SERVER_IP
A     api      YOUR_SERVER_IP
A     admin    YOUR_SERVER_IP
CNAME uploads  YOUR_R2_BUCKET_URL
```

### 3. **SSL Certificate Setup**

```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d pleasantcovedesign.com -d www.pleasantcovedesign.com
```

## Platform-Specific Setup

### Communication Features Testing

#### 1. **Phone/FaceTime Testing Matrix**

| Device/Browser | tel: Links | FaceTime | Fallback |
|----------------|-----------|----------|----------|
| iPhone Safari | ✅ Direct dial | ✅ Native | N/A |
| iPhone Chrome | ✅ Direct dial | ❌ Disabled | Show tel: only |
| Android | ✅ Direct dial | ❌ N/A | Hide FaceTime |
| Desktop Chrome | ✅ Skype/System | ❌ N/A | Hide FaceTime |
| macOS Safari | ✅ FaceTime app | ✅ Native | Both options |

#### 2. **Email Client Limits**

```javascript
// Test with real clients:
const emailTests = {
  'Gmail Web': { maxLength: 2000, special: 'OK' },
  'Outlook Desktop': { maxLength: 500, special: 'Limited' },
  'Apple Mail': { maxLength: 8000, special: 'OK' },
  'Mobile Gmail': { maxLength: 2000, special: 'OK' }
};
```

#### 3. **WebSocket/CORS Testing**

```bash
# Test CORS from production domain
curl -I -X OPTIONS https://api.pleasantcovedesign.com \
  -H "Origin: https://pleasantcovedesign.com" \
  -H "Access-Control-Request-Method: POST"

# Test WebSocket connection
wscat -c wss://api.pleasantcovedesign.com/socket.io/
```

## Deployment Steps

### 1. **Server Setup** (Ubuntu/Debian)

```bash
# Install dependencies
sudo apt update
sudo apt install -y nodejs npm nginx postgresql redis-server

# Install PM2 for process management
sudo npm install -g pm2

# Clone repository
git clone https://github.com/yourrepo/pleasantcovedesign.git
cd pleasantcovedesign

# Install dependencies
cd pleasantcovedesign/server && npm install
cd ../admin-ui && npm install
```

### 2. **Database Setup**

```bash
# PostgreSQL setup
sudo -u postgres createdb pleasantcove_prod
sudo -u postgres createuser -P pleasantcove_user

# Run migrations
cd pleasantcovedesign/server
npm run migrate:prod
```

### 3. **Build & Deploy**

```bash
# Build frontend
cd pleasantcovedesign/admin-ui
npm run build

# Build server (if TypeScript)
cd ../server
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 4. **Nginx Configuration**

```nginx
# /etc/nginx/sites-available/pleasantcovedesign
server {
    listen 80;
    server_name pleasantcovedesign.com www.pleasantcovedesign.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pleasantcovedesign.com www.pleasantcovedesign.com;

    ssl_certificate /etc/letsencrypt/live/pleasantcovedesign.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pleasantcovedesign.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        root /var/www/pleasantcovedesign/admin-ui/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:3000/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 5. **Third-Party Services**

#### Zoom Integration
1. Go to https://marketplace.zoom.us/
2. Create Server-to-Server OAuth app
3. Copy credentials to `.env.production`
4. Test with: `curl -X POST /api/test-zoom`

#### Cloudflare R2
1. Create R2 bucket
2. Set up CORS rules
3. Create API token
4. Update `.env.production`

## Post-Deployment Verification

### 1. **Critical Path Testing**

```bash
# Health check
curl https://api.pleasantcovedesign.com/health

# Test appointment booking
curl -X POST https://api.pleasantcovedesign.com/api/book-appointment \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Test WebSocket
npm install -g wscat
wscat -c wss://api.pleasantcovedesign.com
```

### 2. **Communication Feature Tests**

```javascript
// Run from browser console on production
const tests = {
  phone: () => window.open('tel:+15551234567'),
  faceTime: () => window.open('facetime:+15551234567'),
  email: () => window.open('mailto:test@example.com?subject=Test&body=Hello'),
  websocket: () => new WebSocket('wss://api.pleasantcovedesign.com')
};

// Test each feature
Object.entries(tests).forEach(([name, test]) => {
  console.log(`Testing ${name}...`);
  try {
    test();
    console.log(`✅ ${name} works`);
  } catch (e) {
    console.error(`❌ ${name} failed:`, e);
  }
});
```

### 3. **Monitoring Setup**

```bash
# Install monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Set up alerts
pm2 install pm2-slack
pm2 set pm2-slack:slack_url YOUR_SLACK_WEBHOOK
```

## Troubleshooting Common Issues

### Issue: FaceTime links not working
**Solution:** Check Safari and ensure running on HTTPS

### Issue: CORS errors
**Solution:** Verify origin in allowed list and HTTPS

### Issue: WebSocket connection failed
**Solution:** Check nginx upgrade headers and firewall

### Issue: Email template too long
**Solution:** Use clipboard fallback for long templates

### Issue: Zoom rate limiting
**Solution:** Implement exponential backoff

## Security Hardening

```bash
# Firewall setup
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban for brute force protection
sudo apt install fail2ban
sudo systemctl enable fail2ban

# Regular updates
sudo apt update && sudo apt upgrade
```

## Backup Strategy

```bash
# Database backup script
#!/bin/bash
pg_dump pleasantcove_prod | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
aws s3 cp backup_*.sql.gz s3://your-backup-bucket/
find . -name "backup_*.sql.gz" -mtime +7 -delete
```

## Performance Optimization

1. **Enable Gzip**
```nginx
gzip on;
gzip_types text/plain application/json application/javascript text/css;
```

2. **CDN Setup**
- Upload static assets to CDN
- Update asset URLs in build

3. **Database Indexes**
```sql
CREATE INDEX idx_appointments_datetime ON appointments(datetime);
CREATE INDEX idx_companies_email ON companies(email);
```

## Final Checklist

- [ ] All environment variables set
- [ ] SSL certificates installed and auto-renewing
- [ ] Database backed up and tested restore
- [ ] All communication features tested on real devices
- [ ] Monitoring and alerts configured
- [ ] Rate limiting enabled
- [ ] Security headers verified
- [ ] WebSocket connections working
- [ ] Zoom integration tested (if using)
- [ ] Error tracking connected (Sentry)

## Quick Commands

```bash
# View logs
pm2 logs

# Restart app
pm2 restart all

# Check status
pm2 status

# Monitor performance
pm2 monit

# Database backup
npm run backup:prod

# Run migrations
npm run migrate:prod
```

---

**Remember:** Cursor handles 95% of the code, but these manual steps are critical for a bulletproof production deployment! 