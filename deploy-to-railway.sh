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
- Admin UI (points to Railway)
- Health check endpoint for Railway
- Complete API endpoints for all features
- Client portal functionality
- Demo management system
- Order builder with Stripe integration
- Real-time messaging with WebSocket
- File upload system
- Analytics dashboard
- Team management

🔧 Infrastructure:
- Railway.json configuration
- TypeScript build setup
- Health checks
- Production environment variables
- CORS configuration for production domains

🎯 Ready for: pleasantcovedesign-production.up.railway.app"

# Step 3: Push to main branch (Railway will auto-deploy)
echo "🌐 Step 3: Pushing to GitHub (Railway auto-deploy)..."
git push origin main

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo "🔗 Your app will be live at:"
echo "   https://pleasantcovedesign-production.up.railway.app"
echo ""
echo "📊 Monitor deployment at:"
echo "   https://railway.app"
echo ""
echo "🧪 Test endpoints:"
echo "   GET  /api/health"
echo "   POST /api/token" 
echo "   GET  /api/admin/conversations"
echo ""
echo "🎯 Next steps:"
echo "1. Update Stripe webhook URL to Railway"
echo "2. Test widget on Squarespace site"
echo "3. Update any hardcoded localhost URLs"
echo ""
echo "🚀 Ready for production use!" 