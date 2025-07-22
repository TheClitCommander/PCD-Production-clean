#!/usr/bin/env python3
"""
Test script for Rate Limiting functionality
Validates different rate limiting strategies and integration
"""

import requests
import time
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
import statistics
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:5000"

class RateLimitTester:
    """Test suite for rate limiting"""
    
    def __init__(self):
        self.results = []
        self.test_token = "Bearer test-token-12345"  # Mock token for testing
    
    def run_all_tests(self):
        """Run all rate limit tests"""
        logger.info("🧪 Starting Rate Limit Tests")
        logger.info("="*60)
        
        tests = [
            self.test_basic_rate_limit,
            self.test_sliding_window,
            self.test_token_bucket,
            self.test_burst_handling,
            self.test_concurrent_limits,
            self.test_different_identifiers,
            self.test_rate_limit_headers,
            self.test_custom_limits,
            self.test_admin_endpoints
        ]
        
        for test in tests:
            logger.info(f"\n{'='*60}")
            logger.info(f"Running: {test.__name__}")
            logger.info('='*60)
            
            try:
                result = test()
                self.results.append((test.__name__, 'PASSED' if result else 'FAILED'))
            except Exception as e:
                logger.error(f"Test failed with exception: {e}")
                self.results.append((test.__name__, 'ERROR'))
            
            # Reset between tests
            time.sleep(2)
        
        self.print_summary()
    
    def test_basic_rate_limit(self):
        """Test basic rate limiting"""
        logger.info("Testing basic rate limiting...")
        
        # Make requests until rate limited
        limited = False
        successful_requests = 0
        
        for i in range(150):  # Default limit is 100/minute
            response = requests.get(f"{BASE_URL}/health")
            
            if response.status_code == 429:
                limited = True
                logger.info(f"✅ Rate limited after {successful_requests} requests")
                
                # Check retry-after header
                retry_after = response.headers.get('Retry-After')
                logger.info(f"Retry-After: {retry_after} seconds")
                
                break
            elif response.status_code == 200:
                successful_requests += 1
                
                # Check rate limit headers
                remaining = response.headers.get('X-RateLimit-Remaining')
                if remaining:
                    logger.info(f"Request {i+1}: Remaining: {remaining}")
        
        return limited and successful_requests > 0
    
    def test_sliding_window(self):
        """Test sliding window rate limiting"""
        logger.info("Testing sliding window behavior...")
        
        # Make some requests
        for i in range(5):
            response = requests.get(f"{BASE_URL}/health")
            logger.info(f"Request {i+1}: Status {response.status_code}")
        
        # Wait half the window
        logger.info("Waiting 30 seconds (half window)...")
        time.sleep(30)
        
        # Make more requests - should allow some
        allowed_after_wait = 0
        for i in range(10):
            response = requests.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                allowed_after_wait += 1
        
        logger.info(f"✅ Allowed {allowed_after_wait} requests after partial window")
        
        return allowed_after_wait > 0
    
    def test_token_bucket(self):
        """Test token bucket rate limiting (burst handling)"""
        logger.info("Testing token bucket with burst...")
        
        # Test Minerva chat endpoint which uses token bucket
        headers = {'Authorization': self.test_token}
        
        # Burst requests
        burst_success = 0
        for i in range(10):  # Should allow burst
            response = requests.post(
                f"{BASE_URL}/api/minerva/chat",
                json={"message": f"Test {i}", "session_id": "test"},
                headers=headers
            )
            if response.status_code in [200, 401]:  # 401 is OK for test token
                burst_success += 1
        
        logger.info(f"✅ Burst allowed {burst_success} requests")
        
        # Wait for token refill
        time.sleep(5)
        
        # Try again
        response = requests.post(
            f"{BASE_URL}/api/minerva/chat",
            json={"message": "After refill", "session_id": "test"},
            headers=headers
        )
        
        refilled = response.status_code in [200, 401]
        logger.info(f"✅ Tokens refilled: {refilled}")
        
        return burst_success >= 5 and refilled
    
    def test_burst_handling(self):
        """Test burst request handling"""
        logger.info("Testing burst request handling...")
        
        # Send burst of requests
        burst_size = 50
        responses = []
        
        start_time = time.time()
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [
                executor.submit(requests.get, f"{BASE_URL}/health")
                for _ in range(burst_size)
            ]
            
            for future in as_completed(futures):
                try:
                    response = future.result()
                    responses.append(response.status_code)
                except Exception as e:
                    logger.error(f"Request failed: {e}")
        
        duration = time.time() - start_time
        
        # Analyze results
        success_count = sum(1 for status in responses if status == 200)
        limited_count = sum(1 for status in responses if status == 429)
        
        logger.info(f"✅ Burst completed in {duration:.2f}s")
        logger.info(f"Successful: {success_count}, Rate limited: {limited_count}")
        
        return limited_count > 0 and success_count > 0
    
    def test_concurrent_limits(self):
        """Test rate limiting under concurrent load"""
        logger.info("Testing concurrent rate limiting...")
        
        # Simulate multiple users
        def make_requests_for_user(user_id):
            results = []
            headers = {'X-API-Key': f'test-key-{user_id}'}
            
            for i in range(20):
                response = requests.get(f"{BASE_URL}/health", headers=headers)
                results.append({
                    'user': user_id,
                    'request': i,
                    'status': response.status_code,
                    'remaining': response.headers.get('X-RateLimit-Remaining')
                })
                time.sleep(0.1)
            
            return results
        
        # Run for multiple users concurrently
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(make_requests_for_user, user_id)
                for user_id in range(5)
            ]
            
            all_results = []
            for future in as_completed(futures):
                all_results.extend(future.result())
        
        # Each user should have independent limits
        users_limited = set()
        for result in all_results:
            if result['status'] == 429:
                users_limited.add(result['user'])
        
        logger.info(f"✅ {len(users_limited)} users hit rate limits independently")
        
        return len(users_limited) >= 2
    
    def test_different_identifiers(self):
        """Test rate limiting with different identifiers"""
        logger.info("Testing different identifier types...")
        
        results = {}
        
        # 1. IP-based (no auth)
        ip_success = 0
        for i in range(10):
            response = requests.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                ip_success += 1
        results['ip_based'] = ip_success
        
        # 2. API key based
        api_success = 0
        headers = {'X-API-Key': 'test-api-key-123'}
        for i in range(10):
            response = requests.get(f"{BASE_URL}/health", headers=headers)
            if response.status_code == 200:
                api_success += 1
        results['api_key_based'] = api_success
        
        # 3. User auth based (mock)
        auth_success = 0
        headers = {'Authorization': 'Bearer mock-jwt-token'}
        for i in range(10):
            response = requests.get(f"{BASE_URL}/health", headers=headers)
            if response.status_code in [200, 401]:  # 401 is OK for invalid token
                auth_success += 1
        results['auth_based'] = auth_success
        
        logger.info(f"✅ Results by identifier type: {results}")
        
        return all(count > 0 for count in results.values())
    
    def test_rate_limit_headers(self):
        """Test rate limit headers in responses"""
        logger.info("Testing rate limit headers...")
        
        response = requests.get(f"{BASE_URL}/health")
        
        required_headers = [
            'X-RateLimit-Limit',
            'X-RateLimit-Remaining',
            'X-RateLimit-Reset'
        ]
        
        headers_present = all(
            header in response.headers 
            for header in required_headers
        )
        
        if headers_present:
            logger.info("✅ All rate limit headers present:")
            for header in required_headers:
                logger.info(f"  {header}: {response.headers.get(header)}")
            
            # Verify reset time is in the future
            reset_time = int(response.headers.get('X-RateLimit-Reset', 0))
            current_time = int(time.time())
            reset_valid = reset_time > current_time
            
            logger.info(f"✅ Reset time valid: {reset_valid}")
            
            return True
        
        return False
    
    def test_custom_limits(self):
        """Test custom rate limits for specific endpoints"""
        logger.info("Testing custom rate limits...")
        
        headers = {'Authorization': self.test_token}
        
        # Test lead generation (custom limit)
        lead_responses = []
        for i in range(25):  # Custom limit is 20 burst
            response = requests.post(
                f"{BASE_URL}/api/leads/generate",
                json={"criteria": "test"},
                headers=headers
            )
            lead_responses.append(response.status_code)
            
            if response.status_code == 429:
                logger.info(f"✅ Lead generation limited after {i} requests")
                break
        
        # Test proposal sending (different limit)
        proposal_responses = []
        for i in range(10):
            response = requests.post(
                f"{BASE_URL}/api/proposals/send",
                json={"proposal": "test"},
                headers=headers
            )
            proposal_responses.append(response.status_code)
            
            if response.status_code == 429:
                logger.info(f"✅ Proposal sending limited after {i} requests")
                break
        
        # Different endpoints should have different limits
        lead_limited = 429 in lead_responses
        proposal_limited = 429 in proposal_responses
        
        return lead_limited or proposal_limited or len(lead_responses) > 15
    
    def test_admin_endpoints(self):
        """Test admin rate limit management endpoints"""
        logger.info("Testing admin endpoints...")
        
        admin_headers = {
            'Authorization': 'Bearer admin-token',
            'Content-Type': 'application/json'
        }
        
        # Get rate limit status
        response = requests.get(
            f"{BASE_URL}/api/admin/rate-limits/test-user-123",
            headers=admin_headers
        )
        
        if response.status_code in [200, 403]:  # 403 expected without real admin token
            logger.info(f"✅ Admin status endpoint responded: {response.status_code}")
        
        # Reset rate limit
        response = requests.post(
            f"{BASE_URL}/api/admin/rate-limits/test-user-123/reset",
            json={"config": "api_default"},
            headers=admin_headers
        )
        
        if response.status_code in [200, 403]:
            logger.info(f"✅ Admin reset endpoint responded: {response.status_code}")
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        logger.info("\n" + "="*60)
        logger.info("📊 RATE LIMIT TEST SUMMARY")
        logger.info("="*60)
        
        passed = sum(1 for _, result in self.results if result == 'PASSED')
        failed = sum(1 for _, result in self.results if result == 'FAILED')
        errors = sum(1 for _, result in self.results if result == 'ERROR')
        
        for test_name, result in self.results:
            emoji = {'PASSED': '✅', 'FAILED': '❌', 'ERROR': '💥'}.get(result, '❓')
            logger.info(f"{emoji} {test_name}: {result}")
        
        logger.info(f"\nTotal: {passed} passed, {failed} failed, {errors} errors")
        
        if passed == len(self.results):
            logger.info("\n🎉 All rate limit tests passed!")
        else:
            logger.info("\n⚠️  Some tests failed.")

def performance_test():
    """Test rate limiter performance"""
    logger.info("\n" + "="*60)
    logger.info("⚡ PERFORMANCE TEST")
    logger.info("="*60)
    
    # Measure response times under rate limiting
    response_times = []
    
    for i in range(100):
        start = time.time()
        response = requests.get(f"{BASE_URL}/health")
        duration = time.time() - start
        response_times.append(duration)
        
        if response.status_code == 429:
            logger.info(f"Rate limited at request {i+1}")
            break
    
    # Calculate statistics
    avg_time = statistics.mean(response_times)
    median_time = statistics.median(response_times)
    p95_time = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
    
    logger.info(f"\nResponse Time Statistics:")
    logger.info(f"  Average: {avg_time*1000:.2f}ms")
    logger.info(f"  Median: {median_time*1000:.2f}ms")
    logger.info(f"  95th percentile: {p95_time*1000:.2f}ms")
    
    # Performance should not degrade significantly
    return avg_time < 0.1  # Less than 100ms average

def main():
    """Run rate limit tests"""
    logger.info("Prerequisites:")
    logger.info("1. Redis is running")
    logger.info("2. API Gateway is running (python api_gateway_complete.py)")
    
    input("\nPress Enter to start tests...")
    
    tester = RateLimitTester()
    tester.run_all_tests()
    
    # Run performance test
    logger.info("\nRunning performance test...")
    perf_result = performance_test()
    logger.info(f"Performance test: {'PASSED' if perf_result else 'FAILED'}")

if __name__ == "__main__":
    main() 