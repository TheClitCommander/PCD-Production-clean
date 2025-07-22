#!/bin/bash
# Stop Pleasant Cove + Minerva Protection Stack

echo "🛑 Stopping Pleasant Cove + Minerva Protection Stack"
echo "=================================================="

# Try to read PIDs from file first
if [ -f protection_stack.pids ]; then
    echo "📄 Reading PIDs from protection_stack.pids..."
    while read pid; do
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            echo "✅ Stopped process $pid"
        fi
    done < protection_stack.pids
    rm protection_stack.pids
fi

# Also kill by name in case PIDs file is missing
echo "🧹 Cleaning up any remaining processes..."
pkill -f "python.*api_gateway_complete" 2>/dev/null
pkill -f "python.*dlq_api" 2>/dev/null
pkill -f "python.*health_dashboard" 2>/dev/null
pkill -f "python.*minimal_health_server" 2>/dev/null

echo ""
echo "✅ All services stopped"
echo ""
echo "📝 To restart: ./start_protection_stack.sh" 