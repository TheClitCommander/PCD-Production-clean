#!/bin/bash

echo "🚀 Starting WebsiteWizard Webhook Server"
echo "========================================"

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok not found. Installing..."
    brew install ngrok
fi

# Check if we're in the right directory
if [ ! -d "WebsiteWizard" ]; then
    echo "❌ WebsiteWizard directory not found!"
    echo "Please run this script from the localwebsitebuilder directory"
    exit 1
fi

# Start the server
echo "📦 Starting WebsiteWizard server..."
cd WebsiteWizard

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start server in background
echo "🖥️  Starting server on port 5173..."
npm run dev &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Start ngrok
echo "🌐 Starting ngrok tunnel..."
ngrok http 5173 &
NGROK_PID=$!

# Wait a bit for ngrok to start
sleep 3

# Get ngrok URL
echo ""
echo "✅ Server is running!"
echo ""
echo "📝 Next Steps:"
echo "1. Look for your ngrok URL above (https://xxxxx.ngrok.io)"
echo "2. Your webhook URL is: https://xxxxx.ngrok.io/api/new-lead"
echo "3. Add this URL to Squarespace:"
echo "   - Settings → Advanced → Form & Pop-Up Storage"
echo "   - Add Storage → Webhook"
echo "   - Enter the webhook URL"
echo "   - Method: POST, Format: JSON"
echo ""
echo "🎯 Local UI: http://localhost:5173/leads"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $SERVER_PID $NGROK_PID; exit" INT
wait 