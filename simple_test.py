#!/usr/bin/env python3
"""
Simple port connectivity test
"""

import socket
import time

def check_port(host, port, name):
    """Check if a port is open"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            print(f"✅ {name} (port {port}): LISTENING")
            return True
        else:
            print(f"❌ {name} (port {port}): NOT LISTENING")
            return False
    except Exception as e:
        print(f"❌ {name} (port {port}): ERROR - {e}")
        return False

def main():
    """Check all protection stack ports"""
    print("🔍 Checking Protection Stack Ports")
    print("=" * 40)
    
    services = [
        ("API Gateway", 8001),
        ("DLQ API", 8002),
        ("Health Dashboard", 8003)
    ]
    
    all_good = True
    for name, port in services:
        if not check_port("localhost", port, name):
            all_good = False
    
    print("\n" + "=" * 40)
    if all_good:
        print("🎉 All services are listening!")
        print("\n📝 Try accessing:")
        print("   - API Gateway: http://localhost:8001/health")
        print("   - DLQ API: http://localhost:8002/api/dlq/health") 
        print("   - Dashboard: http://localhost:8003")
    else:
        print("⚠️  Some services are not running")
        print("\n📝 Check running processes:")
        print("   ps aux | grep python")

if __name__ == "__main__":
    main() 