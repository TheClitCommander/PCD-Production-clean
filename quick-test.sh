#!/bin/bash

echo "🚀 Quick Test - WebsiteWizard Local Setup"
echo "========================================="

# Check if we're in the right directory
if [ ! -d "WebsiteWizard" ]; then
    echo "❌ WebsiteWizard directory not found!"
    exit 1
fi

cd WebsiteWizard

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies first..."
    npm install
fi

echo ""
echo "🖥️  Starting server (this might take 10-15 seconds)..."
echo ""

# Start the dev server
npm run dev &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
sleep 10

# Check if server is running
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ Server is running!"
    echo ""
    echo "📝 Test Steps:"
    echo "1. Open your browser to: http://localhost:5173/leads"
    echo "2. You should see the leads dashboard"
    echo ""
    echo "🧪 Let's send a test lead..."
    sleep 2
    
    # Send test data
    curl -X POST http://localhost:5173/api/new-lead \
      -H "Content-Type: application/json" \
      -d '{
        "formId": "demo-123",
        "submissionId": "demo-456",
        "data": {
          "name": "Demo Roofing Company",
          "email": "demo@roofing.com",
          "phone": "207-555-1234",
          "message": "Need a professional website"
        }
      }' \
      -s | jq '.' 2>/dev/null || echo "Response received"
    
    echo ""
    echo "✅ Test lead sent!"
    echo ""
    echo "🎯 Now refresh http://localhost:5173/leads"
    echo "   You should see 'Demo Roofing Company' in the list!"
    echo ""
    echo "Press Ctrl+C to stop the server"
else
    echo "❌ Server failed to start"
    echo "Check for errors above"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Keep running until Ctrl+C
trap "kill $SERVER_PID; exit" INT
wait 