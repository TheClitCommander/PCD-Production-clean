#!/bin/bash

# Pleasant Cove Design - System Startup Script
# This script automatically starts all critical business services

set -e

# Configuration
PROJECT_ROOT="/Users/bendickinson/Desktop/pleasantcovedesign"
STARTUP_LOG="$PROJECT_ROOT/startup.log"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$STARTUP_LOG"
}

log "🚀 Pleasant Cove Design - System Startup Initiated"

# Change to project directory
cd "$PROJECT_ROOT"

# Wait for system to fully boot
log "⏳ Waiting for system to stabilize..."
sleep 10

# Check if servers are already running
log "🔍 Checking current server status..."
if ./ensure_servers_running.sh status > /dev/null 2>&1; then
    log "✅ All servers are already running"
    exit 0
fi

# Start all critical services
log "🔧 Starting all Pleasant Cove Design services..."
./ensure_servers_running.sh start

# Verify startup
sleep 5
if ./ensure_servers_running.sh status > /dev/null 2>&1; then
    log "🎉 Pleasant Cove Design startup completed successfully"
    log "📱 CRM ready to receive messages and appointments"
    log "🌐 Demo generation system operational"
    log "💼 Admin dashboard accessible at http://localhost:5173"
else
    log "❌ Startup failed - some services may not be running"
    exit 1
fi 