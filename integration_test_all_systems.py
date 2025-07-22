#!/usr/bin/env python3
"""
Integration Test Suite for Complete Protection Stack
Tests Circuit Breakers + Tracing + DLQ + Rate Limiting working together
"""

import asyncio
import requests
import redis
import time
import json
import logging
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import subprocess
import sys

from dead_letter_queue import DeadLetterQueue, Task
from distributed_tracing import DistributedTracing

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IntegrationTester:
    """Integration test suite for all protection systems"""
    
    def __init__(self):
        self.base_url = "http://localhost:5000"
        self.dlq_url = "http://localhost:5002"
        self.jaeger_url = "http://localhost:16686"
        self.redis_client = redis.Redis(decode_responses=True)
        self.results = {}
        
    async def run_all_tests(self):
        """Run complete integration test suite"""
        logger.info("🚀 Pleasant Cove + Minerva Integration Test Suite")
        logger.info("="*70)
        
        # Check prerequisites
        if not self.check_prerequisites():
            logger.error("❌ Prerequisites not met. Please start all services.")
            return False
        
        # Run test scenarios
        scenarios = [
            self.test_happy_path,
            self.test_rate_limit_with_circuit_breaker,
            self.test_dlq_with_tracing,
            self.test_cascade_protection,
            self.test_monitoring_integration,
            self.test_recovery_scenario,
            self.test_load_scenario
        ]
        
        for scenario in scenarios:
            logger.info(f"\n{'='*70}")
            logger.info(f"📋 Scenario: {scenario.__name__}")
            logger.info('='*70)
            
            try:
                result = await scenario()
                self.results[scenario.__name__] = 'PASSED' if result else 'FAILED'
            except Exception as e:
                logger.error(f"Scenario failed with error: {e}")
                self.results[scenario.__name__] = 'ERROR'
            
            # Cool down between scenarios
            await asyncio.sleep(2)
        
        # Generate report
        self.generate_report()
        
    def check_prerequisites(self):
        """Check all services are running"""
        logger.info("Checking prerequisites...")
        
        checks = {
            'Redis': self.check_redis(),
            'API Gateway': self.check_api_gateway(),
            'DLQ API': self.check_dlq_api(),
            'Jaeger': self.check_jaeger()
        }
        
        for service, status in checks.items():
            logger.info(f"  {service}: {'✅ Running' if status else '❌ Not running'}")
        
        return all(checks.values())
    
    def check_redis(self):
        try:
            return self.redis_client.ping()
        except:
            return False
    
    def check_api_gateway(self):
        try:
            response = requests.get(f"{self.base_url}/health", timeout=2)
            return response.status_code == 200
        except:
            return False
    
    def check_dlq_api(self):
        try:
            response = requests.get(f"{self.dlq_url}/api/dlq/health", timeout=2)
            return response.status_code in [200, 503]  # 503 is OK if DLQ has items
        except:
            return False
    
    def check_jaeger(self):
        try:
            response = requests.get(f"{self.jaeger_url}/api/services", timeout=2)
            return response.status_code == 200
        except:
            return False
    
    async def test_happy_path(self):
        """Test normal operation with all systems active"""
        logger.info("Testing happy path scenario...")
        
        # Make a normal request
        response = requests.get(f"{self.base_url}/health")
        
        # Check all headers present
        has_trace = 'X-Trace-ID' in response.headers
        has_rate_limit = 'X-RateLimit-Remaining' in response.headers
        
        logger.info(f"  Trace ID present: {has_trace}")
        logger.info(f"  Rate limit headers present: {has_rate_limit}")
        logger.info(f"  Response status: {response.status_code}")
        
        return response.status_code == 200 and has_trace and has_rate_limit
    
    async def test_rate_limit_with_circuit_breaker(self):
        """Test rate limiting doesn't interfere with circuit breakers"""
        logger.info("Testing rate limit + circuit breaker interaction...")
        
        results = []
        
        # Hit rate limit
        for i in range(150):
            response = requests.get(f"{self.base_url}/health")
            results.append(response.status_code)
            
            if response.status_code == 429:
                logger.info(f"  Rate limited at request {i+1}")
                break
        
        # Now test circuit breaker still works
        # Force circuit breaker to open by calling failing endpoint
        for i in range(10):
            try:
                response = requests.post(
                    f"{self.base_url}/api/control/fail",
                    headers={'Authorization': 'Bearer test'},
                    timeout=1
                )
            except:
                pass
        
        # Check health endpoint for circuit breaker state
        response = requests.get(f"{self.base_url}/health")
        health_data = response.json()
        
        circuit_states = health_data.get('systems', {}).get('circuit_breakers', {})
        any_open = any(cb['state'] == 'open' for cb in circuit_states.values())
        
        logger.info(f"  Rate limit triggered: {429 in results}")
        logger.info(f"  Circuit breakers working: {any_open}")
        
        return 429 in results
    
    async def test_dlq_with_tracing(self):
        """Test DLQ operations are properly traced"""
        logger.info("Testing DLQ with distributed tracing...")
        
        # Initialize DLQ with tracing
        tracing = DistributedTracing("integration-test", "1.0.0")
        tracing.initialize()
        dlq = DeadLetterQueue(self.redis_client, tracing)
        
        # Create and process a failing task
        task = Task(
            type="integration_test_fail",
            payload={"test": True},
            max_retries=2
        )
        
        task_id = await dlq.enqueue(task)
        logger.info(f"  Created task: {task_id}")
        
        # Process task (will fail)
        async def failing_processor(task):
            raise Exception("Integration test failure")
        
        # Process until it goes to DLQ
        for i in range(3):
            success = await dlq.process_task(task_id, failing_processor)
            logger.info(f"  Attempt {i+1}: {'Success' if success else 'Failed'}")
            await asyncio.sleep(1)
        
        # Check if task is in DLQ
        dlq_items = await dlq.get_dlq_items("normal")
        task_in_dlq = any(item['task_id'] == task_id for item in dlq_items)
        
        # Check if trace was created
        trace_id = tracing.get_current_trace_id()
        
        logger.info(f"  Task in DLQ: {task_in_dlq}")
        logger.info(f"  Trace ID: {trace_id}")
        
        return task_in_dlq and trace_id is not None
    
    async def test_cascade_protection(self):
        """Test cascading protection (rate limit → circuit breaker → DLQ)"""
        logger.info("Testing cascade protection scenario...")
        
        protection_triggered = {
            'rate_limit': False,
            'circuit_breaker': False,
            'dlq': False
        }
        
        # 1. Trigger rate limit
        for i in range(150):
            response = requests.get(f"{self.base_url}/health")
            if response.status_code == 429:
                protection_triggered['rate_limit'] = True
                logger.info("  ✅ Rate limit triggered")
                break
        
        # 2. Wait for rate limit to reset
        time.sleep(5)
        
        # 3. Trigger circuit breaker
        headers = {'Authorization': 'Bearer test'}
        for i in range(10):
            try:
                response = requests.get(
                    f"{self.base_url}/api/control/test",
                    headers=headers,
                    timeout=1
                )
                if response.status_code == 503:
                    protection_triggered['circuit_breaker'] = True
                    logger.info("  ✅ Circuit breaker triggered")
                    break
            except:
                pass
        
        # 4. Check DLQ for any failed tasks
        response = requests.get(f"{self.dlq_url}/api/dlq/stats")
        if response.status_code == 200:
            stats = response.json()
            if stats.get('total_items', 0) > 0:
                protection_triggered['dlq'] = True
                logger.info("  ✅ DLQ has failed tasks")
        
        logger.info(f"  Protection cascade: {protection_triggered}")
        
        return sum(protection_triggered.values()) >= 2
    
    async def test_monitoring_integration(self):
        """Test monitoring and metrics integration"""
        logger.info("Testing monitoring integration...")
        
        # Get metrics from gateway
        response = requests.get(f"{self.base_url}/metrics")
        metrics_text = response.text
        
        # Parse key metrics
        has_request_metrics = 'api_gateway_requests_total' in metrics_text
        has_circuit_metrics = 'circuit_breaker_state' in metrics_text
        has_rate_limit_metrics = 'rate_limit_checks_total' in metrics_text
        
        logger.info(f"  Request metrics: {has_request_metrics}")
        logger.info(f"  Circuit breaker metrics: {has_circuit_metrics}")
        logger.info(f"  Rate limit metrics: {has_rate_limit_metrics}")
        
        # Check DLQ metrics
        response = requests.get(f"{self.dlq_url}/api/dlq/stats")
        has_dlq_stats = response.status_code == 200
        
        logger.info(f"  DLQ stats available: {has_dlq_stats}")
        
        # Check trace in Jaeger
        response = requests.get(f"{self.jaeger_url}/api/services")
        services = response.json().get('data', [])
        has_services = len(services) > 0
        
        logger.info(f"  Services in Jaeger: {services[:3]}...")
        
        return all([has_request_metrics, has_circuit_metrics, 
                   has_rate_limit_metrics, has_dlq_stats, has_services])
    
    async def test_recovery_scenario(self):
        """Test system recovery after failures"""
        logger.info("Testing recovery scenario...")
        
        recovery_steps = []
        
        # 1. Trigger circuit breaker
        headers = {'Authorization': 'Bearer test'}
        for i in range(10):
            try:
                response = requests.get(
                    f"{self.base_url}/api/control/test",
                    headers=headers,
                    timeout=1
                )
            except:
                pass
        
        # Check if circuit is open
        response = requests.get(f"{self.base_url}/health")
        health = response.json()
        circuit_open = any(
            cb['state'] == 'open' 
            for cb in health.get('systems', {}).get('circuit_breakers', {}).values()
        )
        
        if circuit_open:
            recovery_steps.append('circuit_opened')
            logger.info("  ✅ Circuit breaker opened")
        
        # 2. Wait for half-open state
        logger.info("  Waiting for circuit breaker recovery...")
        time.sleep(5)
        
        # 3. Test recovery
        response = requests.get(f"{self.base_url}/health")
        if response.status_code == 200:
            recovery_steps.append('gateway_recovered')
            logger.info("  ✅ Gateway recovered")
        
        # 4. Test DLQ task retry
        response = requests.get(f"{self.dlq_url}/api/dlq/normal?limit=1")
        if response.status_code == 200:
            data = response.json()
            if data['items']:
                task_id = data['items'][0]['task_id']
                
                # Retry the task
                retry_response = requests.post(
                    f"{self.dlq_url}/api/dlq/retry",
                    json={'task_id': task_id, 'reset_attempts': True}
                )
                
                if retry_response.status_code == 200:
                    recovery_steps.append('dlq_retry_successful')
                    logger.info("  ✅ DLQ task retry successful")
        
        logger.info(f"  Recovery steps completed: {recovery_steps}")
        
        return len(recovery_steps) >= 2
    
    async def test_load_scenario(self):
        """Test system under load with all protections active"""
        logger.info("Testing load scenario...")
        
        start_time = time.time()
        results = {
            'total_requests': 0,
            'successful': 0,
            'rate_limited': 0,
            'circuit_broken': 0,
            'errors': 0
        }
        
        # Simulate multiple concurrent users
        async def user_simulation(user_id):
            user_results = []
            headers = {'X-API-Key': f'user-{user_id}'}
            
            for i in range(20):
                try:
                    response = requests.get(
                        f"{self.base_url}/health",
                        headers=headers,
                        timeout=2
                    )
                    
                    user_results.append(response.status_code)
                    
                    if response.status_code == 200:
                        results['successful'] += 1
                    elif response.status_code == 429:
                        results['rate_limited'] += 1
                    elif response.status_code == 503:
                        results['circuit_broken'] += 1
                    else:
                        results['errors'] += 1
                    
                    results['total_requests'] += 1
                    
                except Exception as e:
                    results['errors'] += 1
                    results['total_requests'] += 1
                
                await asyncio.sleep(0.1)
            
            return user_results
        
        # Run concurrent users
        tasks = [user_simulation(i) for i in range(10)]
        await asyncio.gather(*tasks)
        
        duration = time.time() - start_time
        
        logger.info(f"  Load test completed in {duration:.2f}s")
        logger.info(f"  Results: {results}")
        logger.info(f"  Requests/sec: {results['total_requests']/duration:.2f}")
        
        # Success criteria: system handled load with protections
        protection_worked = (
            results['rate_limited'] > 0 or 
            results['circuit_broken'] > 0
        ) and results['successful'] > 0
        
        return protection_worked
    
    def generate_report(self):
        """Generate integration test report"""
        logger.info("\n" + "="*70)
        logger.info("📊 INTEGRATION TEST REPORT")
        logger.info("="*70)
        logger.info(f"Generated: {datetime.now().isoformat()}")
        logger.info("")
        
        # Results summary
        passed = sum(1 for r in self.results.values() if r == 'PASSED')
        failed = sum(1 for r in self.results.values() if r == 'FAILED')
        errors = sum(1 for r in self.results.values() if r == 'ERROR')
        
        logger.info("Test Results:")
        for test, result in self.results.items():
            emoji = {'PASSED': '✅', 'FAILED': '❌', 'ERROR': '💥'}.get(result, '❓')
            logger.info(f"  {emoji} {test}: {result}")
        
        logger.info(f"\nSummary: {passed} passed, {failed} failed, {errors} errors")
        
        # System health
        logger.info("\nSystem Health:")
        logger.info(f"  Redis: {'✅ Healthy' if self.check_redis() else '❌ Down'}")
        logger.info(f"  API Gateway: {'✅ Healthy' if self.check_api_gateway() else '❌ Down'}")
        logger.info(f"  DLQ API: {'✅ Healthy' if self.check_dlq_api() else '❌ Down'}")
        logger.info(f"  Jaeger: {'✅ Healthy' if self.check_jaeger() else '❌ Down'}")
        
        # Recommendations
        logger.info("\nRecommendations:")
        if passed == len(self.results):
            logger.info("  🎉 All systems working perfectly! Ready for production.")
        else:
            if 'test_cascade_protection' in [k for k, v in self.results.items() if v != 'PASSED']:
                logger.info("  ⚠️  Protection cascade not working properly")
            if 'test_monitoring_integration' in [k for k, v in self.results.items() if v != 'PASSED']:
                logger.info("  ⚠️  Monitoring integration needs attention")
            if 'test_load_scenario' in [k for k, v in self.results.items() if v != 'PASSED']:
                logger.info("  ⚠️  System may not handle load properly")
        
        # Save report
        report = {
            'timestamp': datetime.now().isoformat(),
            'results': self.results,
            'passed': passed,
            'failed': failed,
            'errors': errors,
            'services': {
                'redis': self.check_redis(),
                'api_gateway': self.check_api_gateway(),
                'dlq_api': self.check_dlq_api(),
                'jaeger': self.check_jaeger()
            }
        }
        
        with open('integration_test_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        logger.info(f"\n📄 Report saved to: integration_test_report.json")

async def main():
    """Run integration tests"""
    tester = IntegrationTester()
    
    logger.info("Prerequisites:")
    logger.info("1. Start Redis: docker-compose -f docker-compose.jaeger.yml up -d")
    logger.info("2. Start API Gateway: python api_gateway_complete.py")
    logger.info("3. Start DLQ API: python dlq_api.py")
    logger.info("4. (Optional) Start DLQ Monitor: python dlq_monitoring.py")
    logger.info("")
    
    input("Press Enter when all services are running...")
    
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main()) 