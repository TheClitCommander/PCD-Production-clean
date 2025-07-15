#!/bin/bash

# Setup script for webhook handlers
echo "🚀 Setting up webhook handlers for Pleasant Cove Design"
echo "======================================================="

# Navigate to the backend directory
cd "$(dirname "$0")/backend" || exit 1

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start the server in development mode
echo "🚀 Starting the webhook server..."
echo "📝 Webhook logs will be saved to webhook.log"
echo ""
echo "🧪 You can test the webhooks using:"
echo "  • Squarespace webhook: curl -X POST http://localhost:5173/api/new-lead -H \"Content-Type: application/json\" -d @../test-squarespace-payload.json"
echo "  • Acuity webhook: curl -X POST http://localhost:5173/api/appointment-webhook -H \"Content-Type: application/json\" -d @../test-acuity-payload.json"
echo ""
echo "💾 Check database using: sqlite3 ../websitewizard.db \"SELECT * FROM leads; SELECT * FROM appointments;\""
echo ""
echo "Press Ctrl+C to stop the server"
npm run dev
