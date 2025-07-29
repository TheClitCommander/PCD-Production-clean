#!/bin/bash

# 🚀 DEPLOY TO RAILWAY - Complete Production Deployment

echo "🚀 Deploying Pleasant Cove Design to Railway..."
echo "==============================================="

# Step 1: Add all changes
echo "📦 Step 1: Adding all changes to git..."
git add .

# Step 2: Commit with deployment message
echo "💾 Step 2: Committing changes..."
git commit -m "🚀 PRODUCTION DEPLOYMENT: Complete system ready for Railway

✅ Features Deployed:
- Unified client management system (scraped leads + companies)
- Fixed unread message notifications (server-side calculation)
- Smart client attribution system for Squarespace widget
- Production-ready widget (points to Railway)
- Admin UI (points to Railway API)
- Health check endpoint for Railway
- Complete API endpoints for all features
- Client portal functionality
- Secure .gitignore for sensitive files
- Railway configuration files (railway.json, Procfile, tsconfig.json)

🔒 Security:
- No sensitive data in git history (ensured by .gitignore)
- Clean deployment ready

🎯 Deployment Target: Railway
🔗 Widget Integration: Squarespace Ready
💳 Payment Processing: Stripe Ready
📧 Email System: SendGrid Ready
💾 Database: PostgreSQL on Railway"

# Step 3: Push to main branch
echo "📤 Step 3: Pushing to GitHub (main branch)..."
git push origin main

echo ""
echo "✅ Deployment script finished!"
echo ""
echo "🔍 Next steps:"
echo "1. Check Railway dashboard for deployment status"
echo "2. Monitor deployment logs"
echo "3. Test health endpoint once deployed"
echo "4. Update Stripe webhook URL to production"
echo ""
echo "🌐 Expected URLs:"
echo "- Health: https://[your-railway-url].up.railway.app/api/health"
echo "- Widget: https://[your-railway-url].up.railway.app/widget/messaging-widget-unified.html"
echo "- Admin API: https://[your-railway-url].up.railway.app/api/*" 