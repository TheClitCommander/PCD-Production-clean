#!/usr/bin/env python3
"""
Dead Letter Queue Implementation for Pleasant Cove + Minerva
Ensures no failed task is lost and provides visibility into failures
"""

import json
import time
import uuid
import redis
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio
from functools import wraps

from distributed_tracing import DistributedTracing

logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    """Task execution status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    DEAD_LETTERED = "dead_lettered"
    RETRYING = "retrying"

@dataclass
class Task:
    """Task data structure"""
    id: str
    type: str
    payload: Dict[str, Any]
    priority: str = "normal"
    status: TaskStatus = TaskStatus.PENDING
    created_at: str = None
    attempts: int = 0
    max_retries: int = 3
    last_error: Optional[str] = None
    idempotency_key: Optional[str] = None
    trace_id: Optional[str] = None
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = datetime.now().isoformat()
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Redis storage"""
        data = asdict(self)
        data['status'] = self.status.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Task':
        """Create from dictionary"""
        data['status'] = TaskStatus(data.get('status', 'pending'))
        return cls(**data)

class DeadLetterQueue:
    """Dead Letter Queue manager with retry logic and monitoring"""
    
    def __init__(self, redis_client: redis.Redis, tracing: DistributedTracing = None):
        self.redis = redis_client
        self.tracing = tracing or DistributedTracing("task-queue", "1.0.0")
        
        # Configuration
        self.retry_delays = [5, 30, 120, 300]  # Exponential backoff: 5s, 30s, 2m, 5m
        self.dlq_ttl = 7 * 24 * 3600  # Keep DLQ items for 7 days
        self.alert_threshold = 10  # Alert if more than 10 items in DLQ
        
        # Queue names
        self.queues = {
            'high': 'tasks:high',
            'normal': 'tasks:normal',
            'low': 'tasks:low'
        }
        
        self.dlq_queues = {
            'high': 'dlq:high',
            'normal': 'dlq:normal',
            'low': 'dlq:low'
        }
        
        # Start monitoring
        self._start_monitoring()
    
    def _start_monitoring(self):
        """Start background monitoring of DLQ"""
        def monitor():
            while True:
                try:
                    self._check_dlq_health()
                    time.sleep(60)  # Check every minute
                except Exception as e:
                    logger.error(f"DLQ monitoring error: {e}")
        
        import threading
        monitor_thread = threading.Thread(target=monitor, daemon=True)
        monitor_thread.start()
    
    async def enqueue(self, task: Task) -> str:
        """Enqueue task with idempotency and tracing"""
        with self.tracing.trace_operation("dlq.enqueue", {
            "task.id": task.id,
            "task.type": task.type,
            "task.priority": task.priority
        }) as span:
            # Check idempotency
            if task.idempotency_key:
                existing_id = await self._check_idempotency(task.idempotency_key)
                if existing_id:
                    span.set_attribute("idempotent.duplicate", True)
                    return existing_id
            
            # Store task metadata
            task_key = f"task:{task.id}"
            await self.redis.hset(task_key, mapping=task.to_dict())
            await self.redis.expire(task_key, 86400)  # 24 hour TTL
            
            # Store idempotency key
            if task.idempotency_key:
                await self.redis.setex(
                    f"idempotent:{task.idempotency_key}",
                    3600,  # 1 hour TTL
                    task.id
                )
            
            # Add to queue
            queue_name = self.queues[task.priority]
            await self.redis.lpush(queue_name, task.id)
            
            # Publish event
            await self._publish_event("task_enqueued", task)
            
            span.set_attribute("task.enqueued", True)
            return task.id
    
    async def process_task(self, task_id: str, processor_func) -> bool:
        """Process a task with retry logic and DLQ handling"""
        with self.tracing.trace_operation("dlq.process_task", {
            "task.id": task_id
        }) as span:
            # Get task
            task_data = await self.redis.hgetall(f"task:{task_id}")
            if not task_data:
                span.set_attribute("task.not_found", True)
                return False
            
            task = Task.from_dict(task_data)
            span.set_attribute("task.type", task.type)
            span.set_attribute("task.attempts", task.attempts)
            
            # Update status
            task.status = TaskStatus.PROCESSING
            task.attempts += 1
            await self._update_task(task)
            
            try:
                # Process the task
                with self.tracing.trace_operation(f"task.execute.{task.type}"):
                    result = await processor_func(task)
                
                # Success
                task.status = TaskStatus.COMPLETED
                await self._update_task(task)
                await self._cleanup_task(task)
                
                span.set_attribute("task.success", True)
                return True
                
            except Exception as e:
                # Failure
                task.last_error = str(e)
                span.record_exception(e)
                span.set_attribute("task.failed", True)
                
                # Check if we should retry
                if task.attempts < task.max_retries:
                    await self._retry_task(task)
                    span.set_attribute("task.retried", True)
                else:
                    await self._move_to_dlq(task)
                    span.set_attribute("task.dead_lettered", True)
                
                return False
    
    async def _retry_task(self, task: Task):
        """Retry a failed task with exponential backoff"""
        with self.tracing.trace_operation("dlq.retry_task", {
            "task.id": task.id,
            "task.attempts": task.attempts
        }):
            # Calculate backoff delay
            delay_index = min(task.attempts - 1, len(self.retry_delays) - 1)
            delay = self.retry_delays[delay_index]
            
            # Update task status
            task.status = TaskStatus.RETRYING
            await self._update_task(task)
            
            # Schedule retry
            retry_time = datetime.now() + timedelta(seconds=delay)
            await self.redis.zadd(
                "tasks:retry",
                {task.id: retry_time.timestamp()}
            )
            
            # Log retry
            logger.info(f"Task {task.id} scheduled for retry in {delay}s (attempt {task.attempts}/{task.max_retries})")
            
            # Publish event
            await self._publish_event("task_retry_scheduled", task, {
                "delay": delay,
                "retry_at": retry_time.isoformat()
            })
    
    async def _move_to_dlq(self, task: Task):
        """Move failed task to Dead Letter Queue"""
        with self.tracing.trace_operation("dlq.move_to_dlq", {
            "task.id": task.id,
            "task.type": task.type,
            "task.error": task.last_error
        }) as span:
            # Update status
            task.status = TaskStatus.DEAD_LETTERED
            await self._update_task(task)
            
            # Create DLQ entry
            dlq_entry = {
                "task_id": task.id,
                "task_type": task.type,
                "payload": task.payload,
                "failed_at": datetime.now().isoformat(),
                "attempts": task.attempts,
                "last_error": task.last_error,
                "trace_id": task.trace_id,
                "original_created_at": task.created_at
            }
            
            # Add to DLQ
            dlq_queue = self.dlq_queues[task.priority]
            await self.redis.lpush(dlq_queue, json.dumps(dlq_entry))
            
            # Set TTL on DLQ entry
            dlq_key = f"dlq:task:{task.id}"
            await self.redis.setex(dlq_key, self.dlq_ttl, json.dumps(dlq_entry))
            
            # Alert
            await self._send_dlq_alert(task)
            
            # Publish event
            await self._publish_event("task_dead_lettered", task, dlq_entry)
            
            span.set_attribute("dlq.added", True)
            logger.error(f"Task {task.id} moved to DLQ after {task.attempts} attempts: {task.last_error}")
    
    async def get_dlq_items(self, priority: str = "normal", limit: int = 100) -> List[Dict[str, Any]]:
        """Get items from Dead Letter Queue"""
        with self.tracing.trace_operation("dlq.get_items", {
            "priority": priority,
            "limit": limit
        }):
            dlq_queue = self.dlq_queues.get(priority)
            if not dlq_queue:
                return []
            
            # Get items from DLQ
            items = await self.redis.lrange(dlq_queue, 0, limit - 1)
            
            # Parse and enrich
            dlq_items = []
            for item in items:
                try:
                    dlq_entry = json.loads(item)
                    
                    # Get current task status
                    task_data = await self.redis.hgetall(f"task:{dlq_entry['task_id']}")
                    if task_data:
                        dlq_entry['current_status'] = task_data.get('status', 'unknown')
                    
                    dlq_items.append(dlq_entry)
                except Exception as e:
                    logger.error(f"Error parsing DLQ item: {e}")
            
            return dlq_items
    
    async def retry_dlq_task(self, task_id: str, reset_attempts: bool = True) -> bool:
        """Manually retry a task from DLQ"""
        with self.tracing.trace_operation("dlq.manual_retry", {
            "task.id": task_id,
            "reset_attempts": reset_attempts
        }) as span:
            # Get DLQ entry
            dlq_key = f"dlq:task:{task_id}"
            dlq_data = await self.redis.get(dlq_key)
            
            if not dlq_data:
                span.set_attribute("task.not_found", True)
                return False
            
            dlq_entry = json.loads(dlq_data)
            
            # Recreate task
            task = Task(
                id=task_id,
                type=dlq_entry['task_type'],
                payload=dlq_entry['payload'],
                attempts=0 if reset_attempts else dlq_entry['attempts'],
                trace_id=self.tracing.get_current_trace_id()
            )
            
            # Remove from DLQ
            for priority, dlq_queue in self.dlq_queues.items():
                await self.redis.lrem(dlq_queue, 0, dlq_data)
            
            await self.redis.delete(dlq_key)
            
            # Re-enqueue
            await self.enqueue(task)
            
            # Publish event
            await self._publish_event("dlq_task_retried", task)
            
            span.set_attribute("task.retried", True)
            logger.info(f"Task {task_id} manually retried from DLQ")
            
            return True
    
    async def purge_dlq(self, priority: str = None, older_than_days: int = 7) -> int:
        """Purge old items from DLQ"""
        with self.tracing.trace_operation("dlq.purge", {
            "priority": priority,
            "older_than_days": older_than_days
        }) as span:
            count = 0
            cutoff_date = datetime.now() - timedelta(days=older_than_days)
            
            queues = [self.dlq_queues[priority]] if priority else self.dlq_queues.values()
            
            for dlq_queue in queues:
                items = await self.redis.lrange(dlq_queue, 0, -1)
                
                for item in items:
                    try:
                        dlq_entry = json.loads(item)
                        failed_at = datetime.fromisoformat(dlq_entry['failed_at'])
                        
                        if failed_at < cutoff_date:
                            await self.redis.lrem(dlq_queue, 0, item)
                            await self.redis.delete(f"dlq:task:{dlq_entry['task_id']}")
                            count += 1
                    except Exception as e:
                        logger.error(f"Error purging DLQ item: {e}")
            
            span.set_attribute("purged_count", count)
            logger.info(f"Purged {count} old items from DLQ")
            
            return count
    
    def get_dlq_stats(self) -> Dict[str, Any]:
        """Get DLQ statistics"""
        with self.tracing.trace_operation("dlq.get_stats"):
            stats = {
                "queues": {},
                "total_items": 0,
                "oldest_item": None,
                "newest_item": None
            }
            
            for priority, dlq_queue in self.dlq_queues.items():
                queue_length = self.redis.llen(dlq_queue)
                stats["queues"][priority] = queue_length
                stats["total_items"] += queue_length
                
                # Get oldest and newest
                if queue_length > 0:
                    oldest = self.redis.lindex(dlq_queue, -1)
                    newest = self.redis.lindex(dlq_queue, 0)
                    
                    try:
                        oldest_data = json.loads(oldest)
                        newest_data = json.loads(newest)
                        
                        oldest_time = datetime.fromisoformat(oldest_data['failed_at'])
                        newest_time = datetime.fromisoformat(newest_data['failed_at'])
                        
                        if not stats["oldest_item"] or oldest_time < datetime.fromisoformat(stats["oldest_item"]):
                            stats["oldest_item"] = oldest_data['failed_at']
                        
                        if not stats["newest_item"] or newest_time > datetime.fromisoformat(stats["newest_item"]):
                            stats["newest_item"] = newest_data['failed_at']
                    except:
                        pass
            
            return stats
    
    # Helper methods
    
    async def _check_idempotency(self, idempotency_key: str) -> Optional[str]:
        """Check if task with idempotency key exists"""
        return await self.redis.get(f"idempotent:{idempotency_key}")
    
    async def _update_task(self, task: Task):
        """Update task in Redis"""
        task_key = f"task:{task.id}"
        await self.redis.hset(task_key, mapping=task.to_dict())
    
    async def _cleanup_task(self, task: Task):
        """Clean up completed task"""
        # Keep completed task data for 1 hour for debugging
        await self.redis.expire(f"task:{task.id}", 3600)
        
        # Remove idempotency key
        if task.idempotency_key:
            await self.redis.delete(f"idempotent:{task.idempotency_key}")
    
    async def _publish_event(self, event_type: str, task: Task, extra_data: Dict[str, Any] = None):
        """Publish task event"""
        event = {
            "type": event_type,
            "task_id": task.id,
            "task_type": task.type,
            "timestamp": datetime.now().isoformat(),
            "trace_id": self.tracing.get_current_trace_id()
        }
        
        if extra_data:
            event.update(extra_data)
        
        await self.redis.publish("task_events", json.dumps(event))
    
    async def _send_dlq_alert(self, task: Task):
        """Send alert when task enters DLQ"""
        alert = {
            "type": "task_dead_lettered",
            "severity": "high",
            "task_id": task.id,
            "task_type": task.type,
            "error": task.last_error,
            "attempts": task.attempts,
            "timestamp": datetime.now().isoformat()
        }
        
        await self.redis.lpush("alerts:dlq", json.dumps(alert))
        await self.redis.publish("dlq_alerts", json.dumps(alert))
        
        logger.error(f"DLQ ALERT: Task {task.id} ({task.type}) failed after {task.attempts} attempts")
    
    def _check_dlq_health(self):
        """Check DLQ health and alert if needed"""
        stats = self.get_dlq_stats()
        
        if stats["total_items"] > self.alert_threshold:
            alert = {
                "type": "dlq_threshold_exceeded",
                "severity": "medium",
                "total_items": stats["total_items"],
                "threshold": self.alert_threshold,
                "breakdown": stats["queues"],
                "timestamp": datetime.now().isoformat()
            }
            
            self.redis.lpush("alerts:dlq", json.dumps(alert))
            logger.warning(f"DLQ threshold exceeded: {stats['total_items']} items (threshold: {self.alert_threshold})")

# Async to sync wrapper for Redis operations
class SyncDeadLetterQueue(DeadLetterQueue):
    """Synchronous wrapper for DeadLetterQueue"""
    
    def __init__(self, redis_client: redis.Redis, tracing: DistributedTracing = None):
        super().__init__(redis_client, tracing)
        self.loop = asyncio.new_event_loop()
    
    def _run_async(self, coro):
        """Run async method synchronously"""
        return self.loop.run_until_complete(coro)
    
    def enqueue(self, task: Task) -> str:
        return self._run_async(super().enqueue(task))
    
    def process_task(self, task_id: str, processor_func) -> bool:
        return self._run_async(super().process_task(task_id, processor_func))
    
    def get_dlq_items(self, priority: str = "normal", limit: int = 100) -> List[Dict[str, Any]]:
        return self._run_async(super().get_dlq_items(priority, limit))
    
    def retry_dlq_task(self, task_id: str, reset_attempts: bool = True) -> bool:
        return self._run_async(super().retry_dlq_task(task_id, reset_attempts))
    
    def purge_dlq(self, priority: str = None, older_than_days: int = 7) -> int:
        return self._run_async(super().purge_dlq(priority, older_than_days))

if __name__ == "__main__":
    # Quick test
    import asyncio
    
    async def test_dlq():
        redis_client = redis.Redis(decode_responses=True)
        tracing = DistributedTracing("dlq-test", "1.0.0")
        tracing.initialize()
        
        dlq = DeadLetterQueue(redis_client, tracing)
        
        # Create a test task
        task = Task(
            type="test_task",
            payload={"message": "Hello DLQ"},
            max_retries=2
        )
        
        # Enqueue
        task_id = await dlq.enqueue(task)
        print(f"Enqueued task: {task_id}")
        
        # Simulate failures
        async def failing_processor(task):
            raise Exception("Simulated failure")
        
        # Process (will fail and retry)
        for _ in range(3):
            success = await dlq.process_task(task_id, failing_processor)
            print(f"Process attempt: {'Success' if success else 'Failed'}")
            await asyncio.sleep(1)
        
        # Check DLQ
        dlq_items = await dlq.get_dlq_items()
        print(f"DLQ items: {len(dlq_items)}")
        
        # Get stats
        stats = dlq.get_dlq_stats()
        print(f"DLQ stats: {stats}")
    
    asyncio.run(test_dlq()) 