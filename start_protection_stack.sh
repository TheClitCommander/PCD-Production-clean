#!/bin/bash
# Start Pleasant Cove + Minerva Protection Stack

echo "🚀 Starting Pleasant Cove + Minerva Protection Stack"
echo "=================================================="

# Kill any existing processes
echo "🧹 Cleaning up old processes..."
pkill -f "python.*api_gateway_complete" 2>/dev/null
pkill -f "python.*dlq_api" 2>/dev/null
pkill -f "python.*health_dashboard" 2>/dev/null
sleep 1

# Set environment variables for non-conflicting ports
export GATEWAY_PORT=8001
export DLQ_PORT=8002
export DASHBOARD_PORT=8003

echo "📍 Using ports:"
echo "   - API Gateway: 8001"
echo "   - DLQ API: 8002"
echo "   - Health Dashboard: 8003"
echo ""

# Check Redis
echo "🔍 Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is not running. Please start Redis first:"
    echo "   brew services start redis"
    exit 1
fi

# Start services
echo ""
echo "🚀 Starting services..."

# Start API Gateway (minimal version without tracing)
echo "Starting API Gateway on port $GATEWAY_PORT..."
python api_gateway_minimal.py > gateway.log 2>&1 &
GATEWAY_PID=$!

# Start DLQ API (minimal version without tracing)
echo "Starting DLQ API on port $DLQ_PORT..."
python dlq_api_minimal.py > dlq.log 2>&1 &
DLQ_PID=$!

# Start Health Dashboard
echo "Starting Health Dashboard on port $DASHBOARD_PORT..."
python health_dashboard.py > dashboard.log 2>&1 &
DASHBOARD_PID=$!

# Wait a bit for services to start
sleep 3

# Check if services are running
echo ""
echo "🔍 Checking service status..."

check_service() {
    local port=$1
    local name=$2
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
        echo "✅ $name is running on port $port"
        return 0
    else
        echo "❌ $name failed to start (check $3)"
        return 1
    fi
}

check_service $GATEWAY_PORT "API Gateway" "gateway.log"
GATEWAY_OK=$?

check_service $DLQ_PORT "DLQ API" "dlq.log"
DLQ_OK=$?

# Dashboard doesn't have /health, just check if port is open
if nc -z localhost $DASHBOARD_PORT 2>/dev/null; then
    echo "✅ Health Dashboard is running on port $DASHBOARD_PORT"
    DASHBOARD_OK=0
else
    echo "❌ Health Dashboard failed to start (check dashboard.log)"
    DASHBOARD_OK=1
fi

# Summary
echo ""
echo "=================================================="
echo "📊 Summary:"
echo ""

if [ $GATEWAY_OK -eq 0 ] && [ $DLQ_OK -eq 0 ] && [ $DASHBOARD_OK -eq 0 ]; then
    echo "🎉 All services started successfully!"
    echo ""
    echo "📍 Access points:"
    echo "   - API Gateway: http://localhost:$GATEWAY_PORT/health"
    echo "   - DLQ Dashboard: http://localhost:$DLQ_PORT/api/dlq"
    echo "   - Health Dashboard: http://localhost:$DASHBOARD_PORT"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Run integration tests: python integration_test_all_systems.py"
    echo "   2. View health dashboard: open http://localhost:$DASHBOARD_PORT"
    echo "   3. Check logs: tail -f *.log"
    echo ""
    echo "🛑 To stop all services: ./stop_protection_stack.sh"
else
    echo "⚠️  Some services failed to start. Check the logs:"
    echo "   - tail gateway.log"
    echo "   - tail dlq.log"
    echo "   - tail dashboard.log"
fi

echo ""
echo "Process IDs saved to protection_stack.pids"
echo "$GATEWAY_PID" > protection_stack.pids
echo "$DLQ_PID" >> protection_stack.pids
echo "$DASHBOARD_PID" >> protection_stack.pids 