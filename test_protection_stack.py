#!/usr/bin/env python3
"""
Simple Protection Stack Test
Tests API Gateway, DLQ API, and Health Dashboard
"""

import requests
import time
import json

def test_service(name, url, timeout=5):
    """Test a service endpoint"""
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            print(f"✅ {name}: OK (status: {response.status_code})")
            try:
                data = response.json()
                if 'status' in data:
                    print(f"   Status: {data['status']}")
                return True
            except:
                print(f"   Response: {response.text[:100]}...")
                return True
        else:
            print(f"❌ {name}: Failed (status: {response.status_code})")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ {name}: Connection refused")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ {name}: Timeout")
        return False
    except Exception as e:
        print(f"❌ {name}: Error - {str(e)}")
        return False

def test_rate_limiting():
    """Test rate limiting functionality"""
    print("\n🔄 Testing Rate Limiting...")
    
    # Make multiple requests quickly
    for i in range(5):
        try:
            response = requests.get("http://localhost:8001/api/test", timeout=2)
            print(f"   Request {i+1}: {response.status_code}")
            
            # Check rate limit headers
            if 'X-RateLimit-Limit' in response.headers:
                limit = response.headers.get('X-RateLimit-Limit')
                remaining = response.headers.get('X-RateLimit-Remaining')
                print(f"     Rate Limit: {remaining}/{limit}")
            
            time.sleep(0.1)
        except Exception as e:
            print(f"   Request {i+1}: Error - {str(e)}")

def main():
    """Run all tests"""
    print("🚀 Pleasant Cove Protection Stack Tests")
    print("=" * 50)
    
    # Services to test
    services = [
        ("API Gateway", "http://localhost:8001/health"),
        ("DLQ API", "http://localhost:8002/api/dlq/health"),
        ("Health Dashboard", "http://localhost:8003")
    ]
    
    # Test each service
    results = []
    for name, url in services:
        success = test_service(name, url)
        results.append((name, success))
    
    # Test protection features
    test_rate_limiting()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary:")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"   {name}: {status}")
    
    print(f"\n🎯 Result: {passed}/{total} services operational")
    
    if passed == total:
        print("🎉 All protection services are working!")
        print("\n📋 Next Steps:")
        print("   1. Test circuit breakers: Access http://localhost:8001/health")
        print("   2. View health dashboard: http://localhost:8003")
        print("   3. Check DLQ status: http://localhost:8002/api/dlq/stats")
        print("   4. Start integrating with Pleasant Cove business logic")
    else:
        print("⚠️  Some services need attention. Check the logs:")
        print("   - Gateway: tail gateway.log")
        print("   - DLQ: tail dlq.log") 
        print("   - Dashboard: tail dashboard.log")

if __name__ == "__main__":
    main() 