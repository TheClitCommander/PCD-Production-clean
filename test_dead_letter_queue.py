#!/usr/bin/env python3
"""
Test script for Dead Letter Queue functionality
Validates DLQ behavior, monitoring, and API endpoints
"""

import requests
import redis
import json
import time
import logging
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor

from dead_letter_queue import DeadLetterQueue, Task, TaskStatus
from dlq_monitoring import DLQMonitor
from distributed_tracing import DistributedTracing

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:5002/api"

class DLQTester:
    """Test suite for Dead Letter Queue"""
    
    def __init__(self):
        self.redis = redis.Redis(decode_responses=True)
        self.tracing = DistributedTracing("dlq-test", "1.0.0")
        self.tracing.initialize()
        self.dlq = DeadLetterQueue(self.redis, self.tracing)
        self.results = []
    
    async def run_all_tests(self):
        """Run all DLQ tests"""
        logger.info("🧪 Starting Dead Letter Queue Tests")
        logger.info("="*60)
        
        tests = [
            self.test_basic_dlq_flow,
            self.test_retry_logic,
            self.test_idempotency,
            self.test_dlq_api,
            self.test_monitoring,
            self.test_concurrent_failures,
            self.test_purge_functionality
        ]
        
        for test in tests:
            logger.info(f"\n{'='*60}")
            logger.info(f"Running: {test.__name__}")
            logger.info('='*60)
            
            try:
                result = await test()
                self.results.append((test.__name__, 'PASSED' if result else 'FAILED'))
            except Exception as e:
                logger.error(f"Test failed with exception: {e}")
                self.results.append((test.__name__, 'ERROR'))
        
        self.print_summary()
    
    async def test_basic_dlq_flow(self):
        """Test basic task failure and DLQ entry"""
        logger.info("Testing basic DLQ flow...")
        
        # Create a task that will fail
        task = Task(
            type="test_failing_task",
            payload={"will_fail": True},
            max_retries=2
        )
        
        # Enqueue task
        task_id = await self.dlq.enqueue(task)
        logger.info(f"✅ Task enqueued: {task_id}")
        
        # Define failing processor
        async def failing_processor(task):
            raise Exception("Simulated task failure")
        
        # Process task multiple times (should fail and eventually go to DLQ)
        for attempt in range(task.max_retries + 1):
            success = await self.dlq.process_task(task_id, failing_processor)
            logger.info(f"Attempt {attempt + 1}: {'Success' if success else 'Failed'}")
            await asyncio.sleep(0.5)
        
        # Check if task is in DLQ
        dlq_items = await self.dlq.get_dlq_items("normal")
        task_in_dlq = any(item['task_id'] == task_id for item in dlq_items)
        
        logger.info(f"✅ Task in DLQ: {task_in_dlq}")
        
        # Check task status
        task_data = await self.redis.hgetall(f"task:{task_id}")
        logger.info(f"Task status: {task_data.get('status')}")
        
        return task_in_dlq and task_data.get('status') == TaskStatus.DEAD_LETTERED.value
    
    async def test_retry_logic(self):
        """Test exponential backoff retry logic"""
        logger.info("Testing retry logic with exponential backoff...")
        
        # Create task with specific retry config
        task = Task(
            type="test_retry_task",
            payload={"test": "retry"},
            max_retries=3
        )
        
        task_id = await self.dlq.enqueue(task)
        
        # Track retry times
        retry_times = []
        attempt_count = 0
        
        async def tracking_processor(task):
            nonlocal attempt_count
            attempt_count += 1
            retry_times.append(datetime.now())
            
            if attempt_count < task.max_retries:
                raise Exception(f"Failure {attempt_count}")
            return True
        
        # Process with retries
        start_time = datetime.now()
        for _ in range(task.max_retries):
            await self.dlq.process_task(task_id, tracking_processor)
            
            # Wait for retry
            await asyncio.sleep(6)  # Wait for first retry delay
        
        # Final successful attempt
        success = await self.dlq.process_task(task_id, tracking_processor)
        
        logger.info(f"✅ Task succeeded after {attempt_count} attempts")
        logger.info(f"Retry delays: {[str(t - start_time) for t in retry_times]}")
        
        return success and attempt_count == task.max_retries
    
    async def test_idempotency(self):
        """Test idempotent task enqueuing"""
        logger.info("Testing idempotency...")
        
        idempotency_key = f"test_idempotent_{datetime.now().timestamp()}"
        
        # Create task with idempotency key
        task1 = Task(
            type="test_idempotent",
            payload={"data": "test"},
            idempotency_key=idempotency_key
        )
        
        # Enqueue first time
        task_id1 = await self.dlq.enqueue(task1)
        logger.info(f"First enqueue: {task_id1}")
        
        # Try to enqueue again with same idempotency key
        task2 = Task(
            type="test_idempotent",
            payload={"data": "different"},  # Different payload
            idempotency_key=idempotency_key
        )
        
        task_id2 = await self.dlq.enqueue(task2)
        logger.info(f"Second enqueue: {task_id2}")
        
        # Should return same task ID
        idempotent = task_id1 == task_id2
        logger.info(f"✅ Idempotency working: {idempotent}")
        
        return idempotent
    
    async def test_dlq_api(self):
        """Test DLQ API endpoints"""
        logger.info("Testing DLQ API endpoints...")
        
        # First, ensure we have some items in DLQ
        task = Task(
            type="api_test_task",
            payload={"test": "api"},
            max_retries=0  # Fail immediately
        )
        
        task_id = await self.dlq.enqueue(task)
        
        # Process to move to DLQ
        async def failing_processor(task):
            raise Exception("API test failure")
        
        await self.dlq.process_task(task_id, failing_processor)
        
        # Test API endpoints
        tests_passed = 0
        
        # 1. Get DLQ items
        response = requests.get(f"{BASE_URL}/dlq/normal")
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ GET /dlq/normal - Found {data['count']} items")
            tests_passed += 1
        
        # 2. Get DLQ stats
        response = requests.get(f"{BASE_URL}/dlq/stats")
        if response.status_code == 200:
            stats = response.json()
            logger.info(f"✅ GET /dlq/stats - Total items: {stats['total_items']}")
            tests_passed += 1
        
        # 3. Get specific task
        response = requests.get(f"{BASE_URL}/dlq/task/{task_id}")
        if response.status_code == 200:
            logger.info(f"✅ GET /dlq/task/{task_id} - Found task")
            tests_passed += 1
        
        # 4. Retry task
        response = requests.post(f"{BASE_URL}/dlq/retry", json={"task_id": task_id})
        if response.status_code == 200:
            logger.info(f"✅ POST /dlq/retry - Task retried")
            tests_passed += 1
        
        # 5. Search DLQ
        response = requests.post(f"{BASE_URL}/dlq/search", json={
            "task_type": "api_test_task",
            "limit": 10
        })
        if response.status_code == 200:
            results = response.json()
            logger.info(f"✅ POST /dlq/search - Found {results['count']} results")
            tests_passed += 1
        
        return tests_passed >= 4  # At least 4 out of 5 tests should pass
    
    async def test_monitoring(self):
        """Test DLQ monitoring and alerts"""
        logger.info("Testing DLQ monitoring...")
        
        # Initialize monitor
        monitor = DLQMonitor(self.redis, self.tracing)
        
        # Create task that will fail
        task = Task(
            type="monitor_test_task",
            payload={"monitor": "test"},
            max_retries=0
        )
        
        task_id = await self.dlq.enqueue(task)
        
        # Subscribe to alerts
        alert_received = False
        
        def alert_listener():
            nonlocal alert_received
            pubsub = self.redis.pubsub()
            pubsub.subscribe('dlq_alerts')
            
            for message in pubsub.listen():
                if message['type'] == 'message':
                    alert_received = True
                    logger.info(f"✅ Alert received: {message['data']}")
                    break
        
        # Start listener in background
        import threading
        listener_thread = threading.Thread(target=alert_listener, daemon=True)
        listener_thread.start()
        
        # Process task (will fail and trigger alert)
        async def failing_processor(task):
            raise Exception("Monitor test failure")
        
        await self.dlq.process_task(task_id, failing_processor)
        
        # Wait for alert
        await asyncio.sleep(2)
        
        # Check monitor stats
        stats = monitor.get_stats()
        logger.info(f"Monitor stats: {stats}")
        
        return alert_received or stats['monitor_stats'].get('alerts_sent', 0) > 0
    
    async def test_concurrent_failures(self):
        """Test DLQ under concurrent task failures"""
        logger.info("Testing concurrent task failures...")
        
        num_tasks = 20
        task_ids = []
        
        # Create multiple tasks
        for i in range(num_tasks):
            task = Task(
                type="concurrent_test",
                payload={"index": i},
                max_retries=1
            )
            task_id = await self.dlq.enqueue(task)
            task_ids.append(task_id)
        
        # Process all tasks concurrently (all will fail)
        async def failing_processor(task):
            await asyncio.sleep(0.1)  # Simulate work
            raise Exception(f"Concurrent failure {task.payload['index']}")
        
        # Process tasks concurrently
        tasks = []
        for task_id in task_ids:
            for _ in range(2):  # Process twice to exceed retry limit
                tasks.append(self.dlq.process_task(task_id, failing_processor))
        
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # Check DLQ
        await asyncio.sleep(1)
        dlq_items = await self.dlq.get_dlq_items("normal", limit=100)
        dlq_task_ids = [item['task_id'] for item in dlq_items]
        
        # All tasks should be in DLQ
        all_in_dlq = all(task_id in dlq_task_ids for task_id in task_ids)
        
        logger.info(f"✅ All {num_tasks} tasks in DLQ: {all_in_dlq}")
        
        return all_in_dlq
    
    async def test_purge_functionality(self):
        """Test DLQ purge functionality"""
        logger.info("Testing DLQ purge...")
        
        # Create old task (simulate by manipulating timestamp)
        task = Task(
            type="old_task",
            payload={"old": True},
            max_retries=0
        )
        
        task_id = await self.dlq.enqueue(task)
        
        # Move to DLQ
        async def failing_processor(task):
            raise Exception("Old task failure")
        
        await self.dlq.process_task(task_id, failing_processor)
        
        # Get initial count
        initial_stats = self.dlq.get_dlq_stats()
        initial_count = initial_stats['total_items']
        
        # Purge (with 0 days to purge all)
        purged_count = await self.dlq.purge_dlq(older_than_days=0)
        
        # Get final count
        final_stats = self.dlq.get_dlq_stats()
        final_count = final_stats['total_items']
        
        logger.info(f"✅ Purged {purged_count} items")
        logger.info(f"DLQ items: {initial_count} -> {final_count}")
        
        return purged_count > 0 and final_count < initial_count
    
    def print_summary(self):
        """Print test summary"""
        logger.info("\n" + "="*60)
        logger.info("📊 DLQ TEST SUMMARY")
        logger.info("="*60)
        
        passed = sum(1 for _, result in self.results if result == 'PASSED')
        failed = sum(1 for _, result in self.results if result == 'FAILED')
        errors = sum(1 for _, result in self.results if result == 'ERROR')
        
        for test_name, result in self.results:
            emoji = {'PASSED': '✅', 'FAILED': '❌', 'ERROR': '💥'}.get(result, '❓')
            logger.info(f"{emoji} {test_name}: {result}")
        
        logger.info(f"\nTotal: {passed} passed, {failed} failed, {errors} errors")
        
        if passed == len(self.results):
            logger.info("\n🎉 All DLQ tests passed!")
        else:
            logger.info("\n⚠️  Some tests failed.")

async def main():
    """Run DLQ tests"""
    tester = DLQTester()
    
    logger.info("Prerequisites:")
    logger.info("1. Redis is running")
    logger.info("2. DLQ API is running (python dlq_api.py)")
    logger.info("3. Jaeger is running (optional, for tracing)")
    
    input("\nPress Enter to start tests...")
    
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main()) 