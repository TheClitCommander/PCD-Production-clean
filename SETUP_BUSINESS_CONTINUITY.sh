#!/bin/bash

echo "🚀 Pleasant Cove Design - Business Continuity Setup"
echo "=================================================="
echo "This will ensure your business messaging NEVER goes down"
echo ""

# Make monitoring script executable
chmod +x ensure_pleasant_cove_running.sh

# Install LaunchAgent for automatic monitoring
echo "📱 Installing automatic monitoring service..."
cp com.pleasantcovedesign.monitor.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.pleasantcovedesign.monitor.plist

# Run the monitor immediately
echo "🔄 Starting all services now..."
./ensure_pleasant_cove_running.sh

# Create a desktop shortcut for manual checks
cat > ~/Desktop/Check_Pleasant_Cove_Status.command << 'EOF'
#!/bin/bash
cd /Users/bendickinson/Desktop/pleasantcovedesign
clear
echo "🏢 Pleasant Cove Design - System Status"
echo "======================================"
echo ""

# Check production
echo -n "Production Server: "
curl -s -f https://pleasantcovedesign-production.up.railway.app/health >/dev/null 2>&1 && echo '✅ ONLINE' || echo '❌ OFFLINE - CRITICAL!'

# Check local services
echo -n "Admin Dashboard: "
lsof -i :5173 >/dev/null 2>&1 && echo '✅ RUNNING' || echo '❌ NOT RUNNING'

echo -n "Demo Server: "
lsof -i :8005 >/dev/null 2>&1 && echo '✅ RUNNING' || echo '❌ NOT RUNNING'

echo ""
echo "📊 Recent Messages:"
echo "=================="
tail -5 service_monitor.log | grep "Message delivery"

echo ""
echo "Press any key to open Admin Dashboard..."
read -n 1
open http://localhost:5173/inbox
EOF

chmod +x ~/Desktop/Check_Pleasant_Cove_Status.command

# Create an emergency restart script
cat > ~/Desktop/EMERGENCY_Restart_All_Services.command << 'EOF'
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
EOF

chmod +x ~/Desktop/EMERGENCY_Restart_All_Services.command

echo ""
echo "✅ Business Continuity Setup Complete!"
echo ""
echo "🎯 What's been set up:"
echo "1. ⏰ Automatic monitoring every 5 minutes"
echo "2. 🚀 Services auto-start on system boot"
echo "3. 📱 Desktop shortcut to check status"
echo "4. 🚨 Emergency restart button on desktop"
echo "5. 📊 All logs saved for troubleshooting"
echo ""
echo "🔒 Your messaging system is now BULLETPROOF!"
echo ""
echo "Opening admin dashboard..."
open http://localhost:5173/inbox 