#!/bin/bash

# Pleasant Cove Design - Critical Server Monitor & Auto-Restart
# This script ensures all business-critical servers are always running

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/Users/bendickinson/Desktop/pleasantcovedesign"
BACKEND_PORT=3000
ADMIN_UI_PORT=5173
WIDGET_PORT=8080
DEMO_SERVER_PORT=8005
MINERVA_BRIDGE_PORT=8001

# Logging
LOG_FILE="$PROJECT_ROOT/server_monitor.log"
DATE_FORMAT='%Y-%m-%d %H:%M:%S'

log() {
    echo "$(date +"$DATE_FORMAT") - $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}$(date +"$DATE_FORMAT") - ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}$(date +"$DATE_FORMAT") - SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}$(date +"$DATE_FORMAT") - WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}$(date +"$DATE_FORMAT") - INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Check if port is in use
check_port() {
    local port=$1
    lsof -i :$port > /dev/null 2>&1
}

# Health check endpoint
health_check() {
    local url=$1
    local timeout=${2:-5}
    curl -s --max-time $timeout "$url" > /dev/null 2>&1
}

# Kill process on port
kill_port() {
    local port=$1
    local processes=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$processes" ]; then
        log_warning "Killing processes on port $port: $processes"
        echo "$processes" | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

# Start Main Backend Server (Port 3000)
start_backend() {
    log_info "Checking backend server (port $BACKEND_PORT)..."
    
    if health_check "http://localhost:$BACKEND_PORT/health"; then
        log_success "Backend server is healthy"
        return 0
    fi
    
    log_warning "Backend server not responding, restarting..."
    kill_port $BACKEND_PORT
    
    cd "$PROJECT_ROOT/pleasantcovedesign"
    log_info "Starting backend server..."
    
    # Start in background with proper logging
    npm run dev:server > "$PROJECT_ROOT/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$PROJECT_ROOT/backend.pid"
    
    # Wait for server to start
    for i in {1..30}; do
        if health_check "http://localhost:$BACKEND_PORT/health"; then
            log_success "Backend server started successfully (PID: $BACKEND_PID)"
            return 0
        fi
        sleep 1
    done
    
    log_error "Backend server failed to start"
    return 1
}

# Start Admin UI (Port 5173)
start_admin_ui() {
    log_info "Checking admin UI (port $ADMIN_UI_PORT)..."
    
    if check_port $ADMIN_UI_PORT; then
        log_success "Admin UI is running"
        return 0
    fi
    
    log_warning "Admin UI not running, starting..."
    
    cd "$PROJECT_ROOT/pleasantcovedesign"
    log_info "Starting admin UI..."
    
    npm run dev:admin > "$PROJECT_ROOT/admin-ui.log" 2>&1 &
    ADMIN_PID=$!
    echo $ADMIN_PID > "$PROJECT_ROOT/admin-ui.pid"
    
    # Wait for UI to start
    for i in {1..20}; do
        if check_port $ADMIN_UI_PORT; then
            log_success "Admin UI started successfully (PID: $ADMIN_PID)"
            return 0
        fi
        sleep 1
    done
    
    log_error "Admin UI failed to start"
    return 1
}

# Start Widget Server (Port 8080)
start_widget() {
    log_info "Checking widget server (port $WIDGET_PORT)..."
    
    if check_port $WIDGET_PORT; then
        log_success "Widget server is running"
        return 0
    fi
    
    log_warning "Widget server not running, starting..."
    
    cd "$PROJECT_ROOT/pleasantcovedesign"
    log_info "Starting widget server..."
    
    npm run dev:widget > "$PROJECT_ROOT/widget.log" 2>&1 &
    WIDGET_PID=$!
    echo $WIDGET_PID > "$PROJECT_ROOT/widget.pid"
    
    # Wait for widget to start
    for i in {1..20}; do
        if check_port $WIDGET_PORT; then
            log_success "Widget server started successfully (PID: $WIDGET_PID)"
            return 0
        fi
        sleep 1
    done
    
    log_error "Widget server failed to start"
    return 1
}

# Start Demo Server (Port 8005)
start_demo_server() {
    log_info "Checking demo server (port $DEMO_SERVER_PORT)..."
    
    if check_port $DEMO_SERVER_PORT; then
        log_success "Demo server is running"
        return 0
    fi
    
    log_warning "Demo server not running, starting..."
    kill_port $DEMO_SERVER_PORT
    
    cd "$PROJECT_ROOT"
    log_info "Starting demo server..."
    
    python3 demo_server.py > "$PROJECT_ROOT/demo-server.log" 2>&1 &
    DEMO_PID=$!
    echo $DEMO_PID > "$PROJECT_ROOT/demo-server.pid"
    
    # Wait for demo server to start
    for i in {1..15}; do
        if check_port $DEMO_SERVER_PORT; then
            log_success "Demo server started successfully (PID: $DEMO_PID)"
            return 0
        fi
        sleep 1
    done
    
    log_error "Demo server failed to start"
    return 1
}

# Start Minerva Bridge (Port 8001)
start_minerva_bridge() {
    log_info "Checking Minerva bridge (port $MINERVA_BRIDGE_PORT)..."
    
    if check_port $MINERVA_BRIDGE_PORT; then
        log_success "Minerva bridge is running"
        return 0
    fi
    
    log_warning "Minerva bridge not running, starting..."
    kill_port $MINERVA_BRIDGE_PORT
    
    cd "$PROJECT_ROOT/pleasantcovedesign/server"
    log_info "Starting Minerva bridge..."
    
    npx tsx minerva-bridge.ts > "$PROJECT_ROOT/minerva-bridge.log" 2>&1 &
    MINERVA_PID=$!
    echo $MINERVA_PID > "$PROJECT_ROOT/minerva-bridge.pid"
    
    # Wait for bridge to start
    for i in {1..15}; do
        if check_port $MINERVA_BRIDGE_PORT; then
            log_success "Minerva bridge started successfully (PID: $MINERVA_PID)"
            return 0
        fi
        sleep 1
    done
    
    log_error "Minerva bridge failed to start"
    return 1
}

# Full system status check
check_system_status() {
    log_info "=== PLEASANT COVE DESIGN SYSTEM STATUS ==="
    
    local all_healthy=true
    
    # Backend API
    if health_check "http://localhost:$BACKEND_PORT/health"; then
        log_success "✅ Backend API (port $BACKEND_PORT) - HEALTHY"
    else
        log_error "❌ Backend API (port $BACKEND_PORT) - DOWN"
        all_healthy=false
    fi
    
    # Admin UI
    if check_port $ADMIN_UI_PORT; then
        log_success "✅ Admin UI (port $ADMIN_UI_PORT) - RUNNING"
    else
        log_error "❌ Admin UI (port $ADMIN_UI_PORT) - DOWN"
        all_healthy=false
    fi
    
    # Widget Server
    if check_port $WIDGET_PORT; then
        log_success "✅ Widget Server (port $WIDGET_PORT) - RUNNING"
    else
        log_error "❌ Widget Server (port $WIDGET_PORT) - DOWN"
        all_healthy=false
    fi
    
    # Demo Server
    if check_port $DEMO_SERVER_PORT; then
        log_success "✅ Demo Server (port $DEMO_SERVER_PORT) - RUNNING"
    else
        log_error "❌ Demo Server (port $DEMO_SERVER_PORT) - DOWN"
        all_healthy=false
    fi
    
    # Minerva Bridge
    if check_port $MINERVA_BRIDGE_PORT; then
        log_success "✅ Minerva Bridge (port $MINERVA_BRIDGE_PORT) - RUNNING"
    else
        log_error "❌ Minerva Bridge (port $MINERVA_BRIDGE_PORT) - DOWN"
        all_healthy=false
    fi
    
    if [ "$all_healthy" = true ]; then
        log_success "🎉 ALL SYSTEMS OPERATIONAL"
        return 0
    else
        log_error "⚠️  SYSTEM ISSUES DETECTED"
        return 1
    fi
}

# Start all services
start_all_services() {
    log_info "=== STARTING ALL PLEASANT COVE DESIGN SERVICES ==="
    
    # Start in order of dependency
    start_backend || log_error "Failed to start backend"
    sleep 2
    
    start_demo_server || log_error "Failed to start demo server"
    sleep 1
    
    start_minerva_bridge || log_error "Failed to start Minerva bridge"
    sleep 1
    
    start_admin_ui || log_error "Failed to start admin UI"
    sleep 1
    
    start_widget || log_error "Failed to start widget server"
    
    # Final status check
    sleep 3
    check_system_status
}

# Stop all services
stop_all_services() {
    log_info "=== STOPPING ALL SERVICES ==="
    
    for port in $BACKEND_PORT $ADMIN_UI_PORT $WIDGET_PORT $DEMO_SERVER_PORT $MINERVA_BRIDGE_PORT; do
        kill_port $port
    done
    
    # Clean up PID files
    rm -f "$PROJECT_ROOT"/*.pid
    
    log_success "All services stopped"
}

# Main script logic
case "${1:-status}" in
    "start")
        start_all_services
        ;;
    "stop")
        stop_all_services
        ;;
    "restart")
        stop_all_services
        sleep 3
        start_all_services
        ;;
    "status")
        check_system_status
        ;;
    "backend")
        start_backend
        ;;
    "admin")
        start_admin_ui
        ;;
    "widget")
        start_widget
        ;;
    "demo")
        start_demo_server
        ;;
    "minerva")
        start_minerva_bridge
        ;;
    "monitor")
        log_info "Starting continuous monitoring (press Ctrl+C to stop)..."
        while true; do
            if ! check_system_status > /dev/null 2>&1; then
                log_warning "Issues detected, attempting auto-repair..."
                start_all_services
            fi
            sleep 30
        done
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|monitor|backend|admin|widget|demo|minerva}"
        echo ""
        echo "Commands:"
        echo "  start    - Start all services"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  status   - Check status of all services"
        echo "  monitor  - Continuous monitoring with auto-restart"
        echo "  backend  - Start only backend server"
        echo "  admin    - Start only admin UI"
        echo "  widget   - Start only widget server"
        echo "  demo     - Start only demo server"
        echo "  minerva  - Start only Minerva bridge"
        exit 1
        ;;
esac 