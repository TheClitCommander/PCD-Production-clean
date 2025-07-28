#!/bin/bash
cd /Users/bendickinson/Desktop/pleasantcovedesign
echo "🚨 EMERGENCY SERVICE RESTART"
echo "=========================="
echo "Killing all processes..."

# Kill everything
pkill -f "npm"
pkill -f "node"
pkill -f "vite"
pkill -f "python3 demo_server.py"
pkill -f "minerva-bridge"

sleep 3

echo "Starting all services..."
./ensure_pleasant_cove_running.sh

echo ""
echo "✅ All services restarted!"
echo "Opening admin dashboard in 5 seconds..."
sleep 5
open http://localhost:5173/inbox
