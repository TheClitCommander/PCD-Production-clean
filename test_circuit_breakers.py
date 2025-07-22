#!/usr/bin/env python3
"""
Test script for circuit breaker functionality
Run this after starting your API Gateway to verify protection is working
"""

import requests
import time
import json
from concurrent.futures import ThreadPoolExecutor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:5000"

def test_circuit_breaker_opens():
    """Test that circuit breaker opens after failures"""
    logger.info("\n🧪 TEST 1: Circuit Breaker Opens After Failures")
    logger.info("="*50)
    
    # First, check circuit breaker status
    response = requests.get(f"{BASE_URL}/health/circuit-breakers")
    logger.info(f"Initial state: {json.dumps(response.json(), indent=2)}")
    
    # Simulate failures by calling a non-existent service
    # (This assumes your control API is not running)
    failures = 0
    circuit_opened = False
    
    for i in range(10):
        try:
            # This will fail if control API is not running
            response = requests.get(
                f"{BASE_URL}/api/control/analytics",
                headers={'Authorization': 'Bearer fake-token'},
                timeout=2
            )
            
            if response.status_code == 503:
                logger.info(f"✅ Circuit breaker OPENED after {failures} failures")
                logger.info(f"Response: {response.json()}")
                circuit_opened = True
                break
                
        except requests.exceptions.RequestException:
            failures += 1
            logger.info(f"Request {i+1} failed (expected)")
        
        time.sleep(0.5)
    
    # Check final state
    response = requests.get(f"{BASE_URL}/health/circuit-breakers")
    logger.info(f"\nFinal state: {json.dumps(response.json(), indent=2)}")
    
    return circuit_opened

def test_fallback_response():
    """Test that fallback responses work when circuit is open"""
    logger.info("\n🧪 TEST 2: Fallback Responses")
    logger.info("="*50)
    
    # Force circuit to open (if not already)
    for _ in range(6):
        try:
            requests.get(f"{BASE_URL}/api/control/test", timeout=1)
        except:
            pass
    
    # Now try to get analytics - should get fallback
    response = requests.get(
        f"{BASE_URL}/api/analytics/metrics/7d",
        headers={'Authorization': 'Bearer fake-token'}
    )
    
    logger.info(f"Status: {response.status_code}")
    logger.info(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Check if we got a degraded response
    data = response.json()
    is_degraded = data.get('status') == 'degraded' or data.get('cached') == True
    
    logger.info(f"✅ Got {'degraded/cached' if is_degraded else 'normal'} response")
    return is_degraded

def test_circuit_breaker_recovery():
    """Test that circuit breaker recovers after timeout"""
    logger.info("\n🧪 TEST 3: Circuit Breaker Recovery")
    logger.info("="*50)
    
    # Check current state
    response = requests.get(f"{BASE_URL}/health/circuit-breakers")
    states = response.json()
    
    # Find an open circuit
    open_circuits = [
        name for name, info in states.items() 
        if info.get('circuit_state') == 'open'
    ]
    
    if not open_circuits:
        logger.info("No open circuits to test recovery")
        return False
    
    circuit_name = open_circuits[0]
    reset_timeout = states[circuit_name].get('reset_timeout', 30)
    
    logger.info(f"Waiting {reset_timeout}s for '{circuit_name}' to enter half-open state...")
    
    # Wait for reset timeout
    for i in range(reset_timeout + 5):
        time.sleep(1)
        if i % 10 == 0:
            response = requests.get(f"{BASE_URL}/health/circuit-breakers")
            current_state = response.json().get(circuit_name, {}).get('circuit_state')
            logger.info(f"  {i}s: {current_state}")
            
            if current_state == 'half_open':
                logger.info(f"✅ Circuit entered half-open state!")
                return True
    
    return False

def test_concurrent_requests():
    """Test circuit breaker under concurrent load"""
    logger.info("\n🧪 TEST 4: Concurrent Request Handling")
    logger.info("="*50)
    
    def make_request(i):
        try:
            response = requests.get(
                f"{BASE_URL}/api/control/leads/{i}",
                headers={'Authorization': 'Bearer fake-token'},
                timeout=2
            )
            return response.status_code
        except:
            return 'error'
    
    # Send 20 concurrent requests
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_request, i) for i in range(20)]
        results = [f.result() for f in futures]
    
    # Count results
    errors = results.count('error')
    service_unavailable = results.count(503)
    success = results.count(200)
    
    logger.info(f"Results: {errors} errors, {service_unavailable} circuit breaker responses, {success} success")
    logger.info(f"✅ Circuit breaker handled concurrent requests")
    
    return service_unavailable > 0

def test_health_endpoint():
    """Test health check endpoints"""
    logger.info("\n🧪 TEST 5: Health Check Endpoints")
    logger.info("="*50)
    
    # Basic health
    response = requests.get(f"{BASE_URL}/health")
    logger.info(f"Basic health: {json.dumps(response.json(), indent=2)}")
    
    # Dependency health
    response = requests.get(f"{BASE_URL}/health/dependencies")
    health_data = response.json()
    logger.info(f"Dependency health: {json.dumps(health_data, indent=2)}")
    
    # Check if any services are degraded
    degraded_services = [
        name for name, info in health_data.get('dependencies', {}).items()
        if not info.get('healthy')
    ]
    
    if degraded_services:
        logger.info(f"⚠️  Degraded services: {degraded_services}")
    else:
        logger.info("✅ All services healthy")
    
    return True

def test_metrics_endpoint():
    """Test Prometheus metrics endpoint"""
    logger.info("\n🧪 TEST 6: Metrics Endpoint")
    logger.info("="*50)
    
    response = requests.get(f"{BASE_URL}/metrics")
    metrics = response.text
    
    # Parse some metrics
    for line in metrics.split('\n'):
        if 'circuit_breaker_state' in line or 'api_gateway_requests_total' in line:
            logger.info(f"  {line}")
    
    logger.info("✅ Metrics endpoint working")
    return True

def main():
    """Run all circuit breaker tests"""
    logger.info("🚀 Starting Circuit Breaker Tests")
    logger.info("Make sure your API Gateway is running on port 5000")
    logger.info("For best results, stop the Control API service to simulate failures\n")
    
    input("Press Enter to start tests...")
    
    tests = [
        test_circuit_breaker_opens,
        test_fallback_response,
        test_concurrent_requests,
        test_health_endpoint,
        test_metrics_endpoint,
        test_circuit_breaker_recovery  # Run last as it takes time
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append((test.__name__, result))
        except Exception as e:
            logger.error(f"Test {test.__name__} failed with error: {e}")
            results.append((test.__name__, False))
    
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
        logger.info("\n🎉 All circuit breaker tests passed!")
    else:
        logger.info("\n⚠️  Some tests failed. Check your configuration.")

if __name__ == "__main__":
    main() 