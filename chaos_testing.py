#!/usr/bin/env python3
"""
Chaos Testing Suite for Pleasant Cove + Minerva
Tests resilience patterns and failure scenarios
"""

import asyncio
import random
import requests
import time
from concurrent.futures import ThreadPoolExecutor
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChaosMonkey:
    """Chaos testing framework"""
    
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.results = []
        
    async def run_chaos_suite(self):
        """Run complete chaos testing suite"""
        logger.info("🐵 Starting Chaos Monkey Testing Suite")
        
        tests = [
            self.test_circuit_breaker,
            self.test_rate_limiting,
            self.test_task_queue_overflow,
            self.test_database_failure,
            self.test_concurrent_bookings,
            self.test_websocket_failover,
            self.test_service_timeout,
            self.test_memory_pressure
        ]
        
        for test in tests:
            logger.info(f"\n{'='*60}")
            logger.info(f"Running: {test.__name__}")
            logger.info('='*60)
            
            try:
                result = await test()
                self.results.append({
                    'test': test.__name__,
                    'status': 'PASSED' if result else 'FAILED',
                    'timestamp': datetime.now()
                })
            except Exception as e:
                logger.error(f"Test failed with exception: {e}")
                self.results.append({
                    'test': test.__name__,
                    'status': 'ERROR',
                    'error': str(e),
                    'timestamp': datetime.now()
                })
        
        self.print_results()
    
    async def test_circuit_breaker(self):
        """Test circuit breaker opens after failures"""
        logger.info("Testing circuit breaker behavior...")
        
        # Cause service to fail
        failing_endpoint = f"{self.base_url}/api/control/analytics"
        
        # Send requests until circuit opens
        failures = 0
        circuit_opened = False
        
        for i in range(10):
            try:
                # Simulate service failure
                response = requests.get(
                    failing_endpoint,
                    headers={'X-Chaos-Fail': 'true'},
                    timeout=1
                )
                
                if response.status_code == 503:  # Circuit open
                    circuit_opened = True
                    logger.info(f"✅ Circuit opened after {failures} failures")
                    break
                    
            except:
                failures += 1
                
            await asyncio.sleep(0.1)
        
        return circuit_opened
    
    async def test_rate_limiting(self):
        """Test rate limiting kicks in"""
        logger.info("Testing rate limiting...")
        
        endpoint = f"{self.base_url}/api/lead/1/context"
        rate_limited = False
        
        # Burst requests
        async def send_request():
            try:
                response = requests.get(endpoint)
                return response.status_code
            except:
                return None
        
        # Send 100 requests quickly
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(requests.get, endpoint) for _ in range(100)]
            
            for future in futures:
                try:
                    response = future.result(timeout=5)
                    if response.status_code == 429:  # Rate limited
                        rate_limited = True
                        break
                except:
                    pass
        
        logger.info(f"✅ Rate limiting: {'Active' if rate_limited else 'Not triggered'}")
        return rate_limited
    
    async def test_task_queue_overflow(self):
        """Test task queue handles overflow gracefully"""
        logger.info("Testing task queue overflow handling...")
        
        # Enqueue many tasks rapidly
        tasks_sent = 0
        dlq_triggered = False
        
        for i in range(1000):
            try:
                response = requests.post(
                    f"{self.base_url}/api/control/scrape",
                    json={
                        'business_type': f'test_{i}',
                        'location': 'Portland, ME',
                        'max_results': 5
                    }
                )
                tasks_sent += 1
                
                # Check if tasks going to DLQ
                if response.json().get('queue_status') == 'overflow':
                    dlq_triggered = True
                    
            except:
                pass
                
            if i % 100 == 0:
                await asyncio.sleep(0.01)  # Small delay
        
        logger.info(f"✅ Sent {tasks_sent} tasks, DLQ triggered: {dlq_triggered}")
        return tasks_sent > 900  # Should handle most tasks
    
    async def test_database_failure(self):
        """Test graceful degradation on database failure"""
        logger.info("Testing database failure handling...")
        
        # Simulate DB failure
        headers = {'X-Chaos-DB-Fail': 'true'}
        
        # Try to get analytics (should return cached/degraded)
        response = requests.get(
            f"{self.base_url}/api/control/analytics",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'degraded':
                logger.info("✅ Graceful degradation active")
                return True
        
        return False
    
    async def test_concurrent_bookings(self):
        """Test idempotency for concurrent booking attempts"""
        logger.info("Testing concurrent booking idempotency...")
        
        lead_id = "test_123"
        appointment_time = "2024-12-25T10:00:00"
        
        # Try to book same slot concurrently
        async def book_appointment():
            return requests.post(
                f"{self.base_url}/api/control/book",
                json={
                    'lead_id': lead_id,
                    'datetime': appointment_time,
                    'duration': 60
                }
            )
        
        # Send 5 concurrent requests
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(book_appointment) 
                for _ in range(5)
            ]
            
            results = []
            for future in futures:
                try:
                    response = future.result()
                    results.append(response.json())
                except:
                    pass
        
        # Count successful bookings
        successful = sum(1 for r in results if r.get('status') == 'booked')
        duplicates_prevented = sum(1 for r in results if r.get('status') == 'duplicate_prevented')
        
        logger.info(f"✅ Bookings: {successful} successful, {duplicates_prevented} duplicates prevented")
        return successful == 1 and duplicates_prevented >= 1
    
    async def test_websocket_failover(self):
        """Test WebSocket reconnection and message delivery"""
        logger.info("Testing WebSocket failover...")
        
        # This would connect to your WebSocket server
        # Simplified for demonstration
        
        # Simulate server restart
        response = requests.post(
            f"{self.base_url}/api/chaos/restart-websocket",
            json={'duration': 2}
        )
        
        await asyncio.sleep(3)
        
        # Check if clients reconnected
        status = requests.get(f"{self.base_url}/api/websocket/status").json()
        
        reconnected = status.get('connected_clients', 0) > 0
        logger.info(f"✅ WebSocket clients reconnected: {reconnected}")
        
        return reconnected
    
    async def test_service_timeout(self):
        """Test timeout handling for slow services"""
        logger.info("Testing service timeout handling...")
        
        # Request with simulated slow response
        start_time = time.time()
        
        try:
            response = requests.get(
                f"{self.base_url}/api/control/analytics",
                headers={'X-Chaos-Delay': '10'},  # 10 second delay
                timeout=5  # 5 second timeout
            )
        except requests.exceptions.Timeout:
            elapsed = time.time() - start_time
            logger.info(f"✅ Request timed out after {elapsed:.2f} seconds")
            return elapsed < 6  # Should timeout around 5 seconds
        
        return False
    
    async def test_memory_pressure(self):
        """Test behavior under memory pressure"""
        logger.info("Testing memory pressure handling...")
        
        # Send memory-intensive requests
        large_payload = {
            'business_type': 'restaurant',
            'location': 'Portland, ME',
            'max_results': 1000,  # Large result set
            'include_details': True
        }
        
        responses = []
        for i in range(10):
            try:
                response = requests.post(
                    f"{self.base_url}/api/control/scrape",
                    json=large_payload,
                    timeout=30
                )
                responses.append(response.status_code)
            except:
                responses.append(None)
        
        # Should handle some requests even under pressure
        successful = sum(1 for r in responses if r == 200)
        logger.info(f"✅ Handled {successful}/10 requests under memory pressure")
        
        return successful >= 5
    
    def print_results(self):
        """Print test results summary"""
        logger.info("\n" + "="*60)
        logger.info("CHAOS TESTING RESULTS")
        logger.info("="*60)
        
        passed = sum(1 for r in self.results if r['status'] == 'PASSED')
        failed = sum(1 for r in self.results if r['status'] == 'FAILED')
        errors = sum(1 for r in self.results if r['status'] == 'ERROR')
        
        for result in self.results:
            status_emoji = {
                'PASSED': '✅',
                'FAILED': '❌',
                'ERROR': '💥'
            }.get(result['status'], '❓')
            
            logger.info(f"{status_emoji} {result['test']}: {result['status']}")
            if 'error' in result:
                logger.info(f"   Error: {result['error']}")
        
        logger.info(f"\nSummary: {passed} passed, {failed} failed, {errors} errors")
        logger.info("="*60)
        
        # Return overall success
        return failed == 0 and errors == 0

async def run_load_test():
    """Run load testing scenario"""
    logger.info("🔥 Starting Load Test")
    
    base_url = "http://localhost:5000"
    duration = 60  # 1 minute
    concurrent_users = 50
    
    async def user_scenario():
        """Simulate a user journey"""
        # Get analytics
        requests.get(f"{base_url}/api/control/analytics")
        await asyncio.sleep(random.uniform(0.5, 2))
        
        # Search for leads
        requests.post(f"{base_url}/api/control/scrape", json={
            'business_type': 'restaurant',
            'location': 'Portland, ME',
            'max_results': 10
        })
        await asyncio.sleep(random.uniform(1, 3))
        
        # Send emails
        requests.post(f"{base_url}/api/control/outreach", json={
            'channel': 'email',
            'template': 'cold_email_v1',
            'segment': 'prime_prospects',
            'limit': 5
        })
    
    # Run concurrent users
    start_time = time.time()
    tasks = []
    
    while time.time() - start_time < duration:
        tasks = [user_scenario() for _ in range(concurrent_users)]
        await asyncio.gather(*tasks, return_exceptions=True)
        await asyncio.sleep(1)
    
    logger.info("✅ Load test completed")

if __name__ == "__main__":
    # Run chaos tests
    monkey = ChaosMonkey()
    asyncio.run(monkey.run_chaos_suite())
    
    # Optional: Run load test
    # asyncio.run(run_load_test()) 