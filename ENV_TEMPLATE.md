# Environment Variables Template

Create a `.env` file in the server directory with these variables:

```bash
# ==========================================
# SERVER CONFIGURATION
# ==========================================
NODE_ENV=development
PORT=3000
HOST=localhost

# Production URLs (update for your domain)
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5173

# ==========================================
# DATABASE
# ==========================================
# SQLite (development)
DATABASE_URL=./websitewizard.db

# PostgreSQL (production example)
# DATABASE_URL=postgresql://username:password@localhost:5432/pleasantcove_prod

# ==========================================
# CORS CONFIGURATION
# ==========================================
# Space-separated list of allowed origins
CORS_ORIGINS="http://localhost:5173 http://localhost:3000 http://localhost:8080"

# Production CORS example:
# CORS_ORIGINS="https://pleasantcovedesign.com https://www.pleasantcovedesign.com https://admin.pleasantcovedesign.com"

# ==========================================
# AUTHENTICATION & SECURITY
# ==========================================
# Generate secure random strings for production!
JWT_SECRET=your_jwt_secret_here_change_in_production
SESSION_SECRET=your_session_secret_here_change_in_production

# Token expiry times
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# ==========================================
# ZOOM INTEGRATION (Optional)
# ==========================================
# Create a Server-to-Server OAuth app at https://marketplace.zoom.us/
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=

# ==========================================
# FILE STORAGE (Cloudflare R2 / AWS S3)
# ==========================================
# R2/S3 Compatible Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=auto
R2_BUCKET_NAME=pleasant-cove-uploads
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_PUBLIC_URL=https://uploads.pleasantcovedesign.com

# Local storage fallback
LOCAL_UPLOAD_PATH=./uploads

# ==========================================
# EMAIL SERVICE (Optional)
# ==========================================
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password

# Email settings
EMAIL_FROM="Pleasant Cove Design <hello@pleasantcovedesign.com>"
EMAIL_REPLY_TO=support@pleasantcovedesign.com

# ==========================================
# SMS SERVICE (Optional - Twilio)
# ==========================================
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_MESSAGING_SERVICE_SID=

# ==========================================
# WEBHOOK ENDPOINTS
# ==========================================
# Acuity Scheduling
ACUITY_USER_ID=
ACUITY_API_KEY=
ACUITY_WEBHOOK_SECRET=

# Squarespace
SQUARESPACE_WEBHOOK_SECRET=

# ==========================================
# MONITORING & ANALYTICS (Optional)
# ==========================================
# Sentry Error Tracking
SENTRY_DSN=

# Google Analytics
GA_MEASUREMENT_ID=

# Posthog Analytics
POSTHOG_API_KEY=
POSTHOG_HOST=https://app.posthog.com

# ==========================================
# RATE LIMITING
# ==========================================
# Requests per minute
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Specific endpoint limits
API_RATE_LIMIT=1000
UPLOAD_RATE_LIMIT=10
AUTH_RATE_LIMIT=5

# ==========================================
# FEATURE FLAGS
# ==========================================
ENABLE_ZOOM_INTEGRATION=true
ENABLE_SMS_NOTIFICATIONS=false
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_FILE_UPLOADS=true
ENABLE_WEBSOCKETS=true

# ==========================================
# DEVELOPMENT TOOLS
# ==========================================
# Only for development!
DEBUG=false
LOG_LEVEL=info
MOCK_WEBHOOKS=false
DISABLE_AUTH=false

# ==========================================
# PAYMENT PROCESSING (Optional)
# ==========================================
# Stripe
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# ==========================================
# BACKUP CONFIGURATION
# ==========================================
BACKUP_ENABLED=false
BACKUP_SCHEDULE="0 2 * * *"  # 2 AM daily
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=
```

## Security Notes

1. **NEVER** commit `.env` files with real values to git
2. Use strong, unique passwords for all secrets
3. Rotate secrets regularly in production
4. Use different values for staging/production
5. Enable 2FA on all service accounts

## Generating Secure Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate session secret
openssl rand -hex 32

# Generate strong password
openssl rand -base64 16
```

## Environment-Specific Files

- `.env` - Default, usually for development
- `.env.local` - Local overrides (git ignored)
- `.env.production` - Production values
- `.env.staging` - Staging values
- `.env.test` - Test environment 