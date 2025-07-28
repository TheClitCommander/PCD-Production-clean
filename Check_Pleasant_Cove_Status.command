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
