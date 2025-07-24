#!/bin/bash

# Pleasant Cove Design - Business Critical Service Monitor
# This script ensures ALL services are running 24/7
# Run this on system startup and periodically via cron

LOG_FILE="/Users/bendickinson/Desktop/pleasantcovedesign/service_monitor.log"
ADMIN_UI_ENV="/Users/bendickinson/Desktop/pleasantcovedesign/pleasantcovedesign/admin-ui/.env"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if a port is in use
check_port() {
    lsof -i :$1 >/dev/null 2>&1
    return $?
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port)
    if [ ! -z "$pid" ]; then
        kill -9 $pid 2>/dev/null
        sleep 2
    fi
}

log_message "=== Pleasant Cove Design Service Monitor Starting ==="

# 1. CHECK PRODUCTION CONNECTION
log_message "Checking production server..."
if curl -s -f "https://pleasantcovedesign-production.up.railway.app/health" >/dev/null 2>&1; then
    log_message "✅ Production server is healthy"
else
    log_message "⚠️ WARNING: Production server may be down!"
    # Send alert (you can add email/SMS notification here)
fi

# 2. ENSURE ADMIN UI HAS PRODUCTION CONFIG
if [ ! -f "$ADMIN_UI_ENV" ]; then
    log_message "Creating production config for admin UI..."
    cat > "$ADMIN_UI_ENV" << EOF
# Pleasant Cove Design Admin UI - Production Configuration
VITE_API_URL=https://pleasantcovedesign-production.up.railway.app
VITE_WS_URL=https://pleasantcovedesign-production.up.railway.app
EOF
fi

# 3. CHECK AND START ADMIN UI (Port 5173)
if check_port 5173; then
    log_message "✅ Admin UI already running on port 5173"
else
    log_message "🔄 Starting Admin UI..."
    kill_port 5173  # Clean up any stuck processes
    cd /Users/bendickinson/Desktop/pleasantcovedesign/pleasantcovedesign/admin-ui
    nohup npm run dev > /Users/bendickinson/Desktop/pleasantcovedesign/admin-ui.log 2>&1 &
    sleep 5
    if check_port 5173; then
        log_message "✅ Admin UI started successfully"
    else
        log_message "❌ ERROR: Failed to start Admin UI"
    fi
fi

# 4. CHECK AND START DEMO SERVER (Port 8005)
if check_port 8005; then
    log_message "✅ Demo server already running on port 8005"
else
    log_message "🔄 Starting Demo Server..."
    kill_port 8005  # Clean up any stuck processes
    cd /Users/bendickinson/Desktop/pleasantcovedesign
    nohup python3 demo_server.py > /Users/bendickinson/Desktop/pleasantcovedesign/demo-server.log 2>&1 &
    sleep 3
    if check_port 8005; then
        log_message "✅ Demo server started successfully"
    else
        log_message "❌ ERROR: Failed to start Demo Server"
    fi
fi

# 5. CHECK AND START MINERVA BRIDGE (Port 8001) - Optional
if check_port 8001; then
    log_message "✅ Minerva Bridge already running on port 8001"
else
    log_message "🔄 Starting Minerva Bridge..."
    kill_port 8001  # Clean up any stuck processes
    cd /Users/bendickinson/Desktop/pleasantcovedesign/pleasantcovedesign/server
    nohup npx tsx minerva-bridge.ts > /Users/bendickinson/Desktop/pleasantcovedesign/minerva-bridge.log 2>&1 &
    sleep 3
    if check_port 8001; then
        log_message "✅ Minerva Bridge started successfully"
    else
        log_message "⚠️ WARNING: Minerva Bridge failed to start (non-critical)"
    fi
fi

# 6. VERIFY MESSAGE FLOW
log_message "Testing message flow to production..."
TEST_RESPONSE=$(curl -s -X POST "https://pleasantcovedesign-production.up.railway.app/api/public/project/mc50o9qu_69gdwmMznqd-4weVuSkXxQ/messages" \
  -H "Content-Type: application/json" \
  -d '{"content":"🤖 Automated health check from monitoring system","senderName":"System Monitor","senderType":"client"}' 2>&1)

if echo "$TEST_RESPONSE" | grep -q '"success":true'; then
    log_message "✅ Message delivery test PASSED"
else
    log_message "❌ ERROR: Message delivery test FAILED"
    log_message "Response: $TEST_RESPONSE"
fi

# 7. SUMMARY
log_message "=== Service Status Summary ==="
echo "Production Server: $(curl -s -f https://pleasantcovedesign-production.up.railway.app/health >/dev/null 2>&1 && echo '✅ UP' || echo '❌ DOWN')"
echo "Admin UI (5173): $(check_port 5173 && echo '✅ UP' || echo '❌ DOWN')"
echo "Demo Server (8005): $(check_port 8005 && echo '✅ UP' || echo '❌ DOWN')"
echo "Minerva Bridge (8001): $(check_port 8001 && echo '✅ UP' || echo '❌ DOWN')"

log_message "=== Monitor Complete ==="

# Open admin UI if not already open
if check_port 5173; then
    open -g http://localhost:5173/inbox 2>/dev/null
fi 