#!/usr/bin/env python3
"""
Test script for distributed tracing functionality
Run this after starting Jaeger and your API Gateway to verify tracing is working
"""

import requests
import time
import json
import logging
from concurrent.futures import ThreadPoolExecutor
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:5000"
JAEGER_URL = "http://localhost:16686"

def test_basic_trace():
    """Test that basic requests generate traces"""
    logger.info("\n🧪 TEST 1: Basic Request Tracing")
    logger.info("="*50)
    
    # Make a simple request
    response = requests.get(f"{BASE_URL}/health")
    data = response.json()
    
    trace_id = response.headers.get('X-Trace-ID')
    logger.info(f"Response: {json.dumps(data, indent=2)}")
    logger.info(f"Trace ID: {trace_id}")
    
    if trace_id:
        logger.info(f"✅ Trace ID found: {trace_id}")
        logger.info(f"View trace in Jaeger: {JAEGER_URL}/trace/{trace_id}")
        return True
    else:
        logger.error("❌ No trace ID in response")
        return False

def test_authenticated_request():
    """Test tracing with authentication"""
    logger.info("\n🧪 TEST 2: Authenticated Request Tracing")
    logger.info("="*50)
    
    # Create a fake JWT token
    headers = {
        'Authorization': 'Bearer fake-jwt-token-for-testing'
    }
    
    response = requests.get(
        f"{BASE_URL}/api/control/analytics",
        headers=headers
    )
    
    trace_id = response.headers.get('X-Trace-ID')
    logger.info(f"Status: {response.status_code}")
    logger.info(f"Trace ID: {trace_id}")
    
    if trace_id:
        logger.info(f"✅ Authenticated request traced: {trace_id}")
        return True
    else:
        logger.error("❌ No trace ID for authenticated request")
        return False

def test_circuit_breaker_trace():
    """Test that circuit breaker operations are traced"""
    logger.info("\n🧪 TEST 3: Circuit Breaker Tracing")
    logger.info("="*50)
    
    trace_ids = []
    
    # Make requests that will fail (assuming control API is not running)
    for i in range(7):
        try:
            response = requests.get(
                f"{BASE_URL}/api/control/test",
                headers={'Authorization': 'Bearer test'},
                timeout=2
            )
            
            trace_id = response.headers.get('X-Trace-ID')
            if trace_id:
                trace_ids.append(trace_id)
                
            logger.info(f"Request {i+1}: Status={response.status_code}, Trace={trace_id}")
            
        except requests.exceptions.RequestException as e:
            logger.info(f"Request {i+1}: Failed (expected)")
        
        time.sleep(0.5)
    
    logger.info(f"✅ Collected {len(trace_ids)} trace IDs from circuit breaker test")
    
    if trace_ids:
        logger.info("View circuit breaker behavior in traces:")
        for tid in trace_ids[:3]:  # Show first 3
            logger.info(f"  - {JAEGER_URL}/trace/{tid}")
    
    return len(trace_ids) > 0

def test_concurrent_traces():
    """Test tracing under concurrent load"""
    logger.info("\n🧪 TEST 4: Concurrent Request Tracing")
    logger.info("="*50)
    
    trace_ids = []
    
    def make_request(i):
        try:
            endpoint = random.choice(['/health', '/health/dependencies', '/metrics'])
            response = requests.get(f"{BASE_URL}{endpoint}")
            trace_id = response.headers.get('X-Trace-ID')
            return trace_id
        except:
            return None
    
    # Send 20 concurrent requests
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_request, i) for i in range(20)]
        trace_ids = [f.result() for f in futures if f.result()]
    
    unique_traces = set(trace_ids)
    logger.info(f"✅ Generated {len(unique_traces)} unique traces from 20 concurrent requests")
    
    # All requests should have unique trace IDs
    return len(unique_traces) >= 15  # Allow for some failures

def test_trace_propagation():
    """Test trace context propagation"""
    logger.info("\n🧪 TEST 5: Trace Context Propagation")
    logger.info("="*50)
    
    # This would test if traces propagate to downstream services
    # For now, we'll check if the gateway adds proper headers
    
    response = requests.post(
        f"{BASE_URL}/api/minerva/chat",
        json={
            "message": "Hello, test trace propagation",
            "session_id": "test-session"
        },
        headers={'Authorization': 'Bearer test'}
    )
    
    trace_id = response.headers.get('X-Trace-ID')
    
    if response.status_code == 503:  # Circuit breaker open
        logger.info("Circuit breaker open (expected if Minerva not running)")
        data = response.json()
        trace_id = data.get('trace_id')
    
    logger.info(f"Trace ID: {trace_id}")
    logger.info(f"✅ Trace propagation test completed")
    
    return trace_id is not None

def check_jaeger_connectivity():
    """Check if Jaeger is accessible"""
    logger.info("\n🧪 Checking Jaeger Connectivity")
    logger.info("="*50)
    
    try:
        # Check Jaeger API
        response = requests.get(f"{JAEGER_URL}/api/services")
        services = response.json()
        
        logger.info(f"✅ Jaeger is running")
        logger.info(f"Services found: {services.get('data', [])}")
        
        # Look for our service
        if 'api-gateway' in services.get('data', []):
            logger.info("✅ 'api-gateway' service found in Jaeger!")
        else:
            logger.info("⚠️  'api-gateway' service not yet in Jaeger (will appear after first trace)")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Cannot connect to Jaeger: {e}")
        logger.error(f"Make sure Jaeger is running: docker-compose -f docker-compose.jaeger.yml up -d")
        return False

def test_trace_search():
    """Test searching for traces in Jaeger"""
    logger.info("\n🧪 TEST 6: Trace Search in Jaeger")
    logger.info("="*50)
    
    # Generate a few traces
    trace_ids = []
    for i in range(3):
        response = requests.get(f"{BASE_URL}/health")
        trace_id = response.headers.get('X-Trace-ID')
        if trace_id:
            trace_ids.append(trace_id)
        time.sleep(0.5)
    
    if trace_ids:
        logger.info(f"✅ Generated {len(trace_ids)} traces")
        logger.info("\nTo view traces in Jaeger:")
        logger.info(f"1. Open {JAEGER_URL}")
        logger.info("2. Select 'api-gateway' from Service dropdown")
        logger.info("3. Click 'Find Traces'")
        logger.info("\nDirect links to traces:")
        for tid in trace_ids:
            logger.info(f"  - {JAEGER_URL}/trace/{tid}")
        
        return True
    
    return False

def main():
    """Run all distributed tracing tests"""
    logger.info("🚀 Starting Distributed Tracing Tests")
    logger.info("Prerequisites:")
    logger.info("  1. Jaeger is running (docker-compose -f docker-compose.jaeger.yml up -d)")
    logger.info("  2. API Gateway is running (python api_gateway_with_tracing.py)")
    logger.info("")
    
    # Check Jaeger first
    if not check_jaeger_connectivity():
        logger.error("\n⚠️  Please start Jaeger first!")
        return
    
    input("\nPress Enter to start tests...")
    
    tests = [
        test_basic_trace,
        test_authenticated_request,
        test_circuit_breaker_trace,
        test_concurrent_traces,
        test_trace_propagation,
        test_trace_search
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append((test.__name__, result))
        except Exception as e:
            logger.error(f"Test {test.__name__} failed with error: {e}")
            results.append((test.__name__, False))
        
        time.sleep(1)  # Give traces time to be sent
    
    # Summary
    logger.info("\n" + "="*50)
    logger.info("📊 TEST SUMMARY")
    logger.info("="*50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        logger.info(f"{test_name}: {status}")
    
    logger.info(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("\n🎉 All distributed tracing tests passed!")
        logger.info(f"\n📈 View your traces at: {JAEGER_URL}")
        logger.info("💡 Try the following searches in Jaeger:")
        logger.info("   - Service: api-gateway")
        logger.info("   - Operation: health.basic")
        logger.info("   - Tags: http.status_code=503 (to find circuit breaker opens)")
        logger.info("   - Tags: error=true (to find errors)")
    else:
        logger.info("\n⚠️  Some tests failed. Check your configuration.")

if __name__ == "__main__":
    main() 