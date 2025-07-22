#!/usr/bin/env python3
"""
Startup script for Pleasant Cove + Minerva services
Handles missing dependencies gracefully
"""

import subprocess
import time
import sys
import os

def check_import(module_name):
    """Check if a module can be imported"""
    try:
        __import__(module_name)
        return True
    except ImportError:
        return False

def start_service(name, command, required_modules):
    """Start a service if dependencies are met"""
    print(f"\n🚀 Starting {name}...")
    
    # Check dependencies
    missing = [m for m in required_modules if not check_import(m)]
    if missing:
        print(f"❌ Missing dependencies for {name}: {', '.join(missing)}")
        print(f"   Run: python3 -m pip install {' '.join(missing)}")
        return None
    
    # Start the service
    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True
        )
        time.sleep(2)  # Give it time to start
        
        # Check if it's still running
        if process.poll() is None:
            print(f"✅ {name} started (PID: {process.pid})")
            return process
        else:
            print(f"❌ {name} failed to start")
            stderr = process.stderr.read().decode()
            if stderr:
                print(f"   Error: {stderr[:200]}")
            return None
    except Exception as e:
        print(f"❌ Failed to start {name}: {e}")
        return None

def main():
    print("🏥 Pleasant Cove + Minerva Service Startup")
    print("="*50)
    
    processes = []
    
    # Check Redis
    print("\n📦 Checking Redis...")
    try:
        result = subprocess.run(['redis-cli', 'ping'], capture_output=True, text=True)
        if result.stdout.strip() == 'PONG':
            print("✅ Redis is running")
        else:
            print("❌ Redis is not running. Please start Redis first.")
            return
    except:
        print("❌ Redis is not installed or not running")
        return
    
    # Try to start services with minimal dependencies
    
    # 1. Simple health check server (no dependencies)
    print("\n🏥 Starting minimal health server...")
    health_code = '''
import http.server
import json
import time

start_time = time.time()
requests = 0

class HealthHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global requests
        requests += 1
        
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            
            data = {
                "status": "healthy",
                "uptime_seconds": int(time.time() - start_time),
                "request_count": requests,
                "service": "minimal-gateway"
            }
            self.wfile.write(json.dumps(data).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass  # Suppress logs

print("Minimal health server running on :5000")
server = http.server.HTTPServer(("", 5000), HealthHandler)
server.serve_forever()
'''
    
    with open('minimal_health_server.py', 'w') as f:
        f.write(health_code)
    
    health_process = subprocess.Popen(
        [sys.executable, 'minimal_health_server.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    processes.append(('Health Server', health_process))
    print("✅ Minimal health server started on port 5000")
    
    # 2. Try to start full services if dependencies exist
    if check_import('flask'):
        gateway_proc = start_service(
            "API Gateway", 
            f"{sys.executable} api_gateway_complete.py",
            ['flask', 'redis', 'pybreaker']
        )
        if gateway_proc:
            processes.append(('API Gateway', gateway_proc))
    
    if check_import('flask'):
        dlq_proc = start_service(
            "DLQ API",
            f"{sys.executable} dlq_api.py",
            ['flask', 'redis']
        )
        if dlq_proc:
            processes.append(('DLQ API', dlq_proc))
    
    # Summary
    print("\n" + "="*50)
    print("📊 Service Status:")
    for name, proc in processes:
        if proc and proc.poll() is None:
            print(f"  ✅ {name} - Running (PID: {proc.pid})")
        else:
            print(f"  ❌ {name} - Not running")
    
    print("\n💡 Tips:")
    print("  - Check service health: curl http://localhost:5000/health")
    print("  - View logs: tail -f *.log")
    print("  - Stop all: pkill -f 'python.*api_gateway|dlq_api|minimal_health'")
    
    # Keep running
    if processes:
        print("\n✅ Services started. Press Ctrl+C to stop all.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Stopping services...")
            for name, proc in processes:
                if proc and proc.poll() is None:
                    proc.terminate()
                    print(f"  Stopped {name}")
    else:
        print("\n❌ No services could be started.")

if __name__ == "__main__":
    main() 