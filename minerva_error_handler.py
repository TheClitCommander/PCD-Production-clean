#!/usr/bin/env python3
"""
Minerva Error Handler - Comprehensive error handling and retry logic
For production-ready operation
"""

import os
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any
from functools import wraps
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import redis

logger = logging.getLogger(__name__)

class MinervaErrorHandler:
    """
    Comprehensive error handling and retry system
    """
    
    def __init__(self):
        self.redis_client = redis.Redis(decode_responses=True)
        self.error_log_file = "minerva_errors.log"
        self.retry_queue_key = "minerva:retry_queue"
        self.failed_queue_key = "minerva:failed_queue"
        
        # Email notification settings
        self.notification_email = os.getenv('NOTIFICATION_EMAIL')
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', 587))
        self.email_user = os.getenv('EMAIL_USER')
        self.email_password = os.getenv('EMAIL_PASSWORD')
        
        # Retry configuration
        self.max_retries = 3
        self.retry_delays = [1, 5, 15]  # seconds
        self.retry_multiplier = 2
        
        logger.info("🛡️ Minerva Error Handler initialized")
    
    def retry_with_backoff(self, max_retries: int = None, delays: List[int] = None):
        """Decorator for automatic retry with exponential backoff"""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs) -> Any:
                max_attempts = max_retries or self.max_retries
                retry_delays = delays or self.retry_delays
                
                last_exception = None
                
                for attempt in range(max_attempts + 1):
                    try:
                        result = func(*args, **kwargs)
                        
                        # If we succeeded after retries, log the recovery
                        if attempt > 0:
                            self.log_recovery(func.__name__, attempt)
                        
                        return result
                        
                    except Exception as e:
                        last_exception = e
                        
                        if attempt < max_attempts:
                            delay = retry_delays[min(attempt, len(retry_delays) - 1)]
                            
                            self.log_error(
                                error_type="retry_attempt",
                                function=func.__name__,
                                attempt=attempt + 1,
                                max_attempts=max_attempts,
                                error=str(e),
                                retry_delay=delay
                            )
                            
                            time.sleep(delay)
                        else:
                            # All retries exhausted
                            self.log_critical_failure(func.__name__, str(e), args, kwargs)
                
                # If we get here, all retries failed
                raise last_exception
            
            return wrapper
        return decorator
    
    def log_error(self, error_type: str, **details):
        """Log error with full context"""
        error_entry = {
            'timestamp': datetime.now().isoformat(),
            'error_type': error_type,
            'details': details
        }
        
        # Log to file
        with open(self.error_log_file, 'a') as f:
            f.write(json.dumps(error_entry) + '\n')
        
        # Log to console
        logger.error(f"❌ {error_type}: {details}")
        
        # Store in Redis for monitoring
        self.redis_client.lpush("minerva:errors", json.dumps(error_entry))
        self.redis_client.ltrim("minerva:errors", 0, 999)  # Keep last 1000 errors
    
    def log_critical_failure(self, function: str, error: str, args: tuple, kwargs: dict):
        """Log critical failure and queue for manual review"""
        failure_data = {
            'timestamp': datetime.now().isoformat(),
            'function': function,
            'error': error,
            'args': str(args),
            'kwargs': str(kwargs),
            'status': 'failed_all_retries'
        }
        
        # Add to failed queue
        self.redis_client.lpush(self.failed_queue_key, json.dumps(failure_data))
        
        # Send email notification
        self.send_error_notification(f"Critical Failure: {function}", error, failure_data)
        
        self.log_error("critical_failure", **failure_data)
    
    def log_recovery(self, function: str, attempt: int):
        """Log successful recovery after retries"""
        recovery_data = {
            'function': function,
            'attempt': attempt,
            'message': f"Successfully recovered after {attempt} retries"
        }
        
        self.log_error("recovery", **recovery_data)
        logger.info(f"✅ Recovery: {function} succeeded after {attempt} retries")
    
    def send_error_notification(self, subject: str, error: str, details: dict):
        """Send email notification for critical errors"""
        if not self.notification_email or not self.email_user:
            return
        
        try:
            msg = MimeMultipart()
            msg['From'] = self.email_user
            msg['To'] = self.notification_email
            msg['Subject'] = f"🚨 Minerva Alert: {subject}"
            
            body = f"""
Minerva Error Alert

Error: {error}
Timestamp: {details.get('timestamp')}
Function: {details.get('function')}

Full Details:
{json.dumps(details, indent=2)}

Please investigate and resolve.

---
Minerva Error Handler
"""
            
            msg.attach(MimeText(body, 'plain'))
            
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.email_user, self.email_password)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"📧 Error notification sent to {self.notification_email}")
            
        except Exception as e:
            logger.error(f"❌ Failed to send error notification: {e}")
    
    def queue_for_retry(self, task_data: dict, delay_seconds: int = 60):
        """Queue a failed task for retry later"""
        retry_data = {
            'task_data': task_data,
            'queued_at': datetime.now().isoformat(),
            'retry_at': (datetime.now() + timedelta(seconds=delay_seconds)).isoformat(),
            'retry_count': task_data.get('retry_count', 0) + 1
        }
        
        self.redis_client.zadd(
            self.retry_queue_key,
            {json.dumps(retry_data): time.time() + delay_seconds}
        )
        
        logger.info(f"📋 Queued task for retry in {delay_seconds}s")
    
    def process_retry_queue(self):
        """Process tasks that are ready for retry"""
        current_time = time.time()
        
        # Get tasks ready for retry
        ready_tasks = self.redis_client.zrangebyscore(
            self.retry_queue_key, 0, current_time, withscores=True
        )
        
        for task_json, score in ready_tasks:
            try:
                task_data = json.loads(task_json)
                
                # Remove from retry queue
                self.redis_client.zrem(self.retry_queue_key, task_json)
                
                # Process the retry
                self._process_retry_task(task_data)
                
            except Exception as e:
                logger.error(f"❌ Failed to process retry task: {e}")
    
    def _process_retry_task(self, task_data: dict):
        """Process a specific retry task"""
        task_type = task_data.get('task_data', {}).get('type')
        
        if task_type == 'demo_generation':
            self._retry_demo_generation(task_data)
        elif task_type == 'outreach_send':
            self._retry_outreach_send(task_data)
        else:
            logger.warning(f"⚠️ Unknown retry task type: {task_type}")
    
    def _retry_demo_generation(self, task_data: dict):
        """Retry demo generation"""
        try:
            from minerva_visual_generator import MinervaVisualGenerator
            
            generator = MinervaVisualGenerator()
            business_data = task_data['task_data']['business_data']
            
            result = generator.generate_demo_website(business_data)
            
            if result.get('error'):
                raise Exception(result['error'])
            
            logger.info(f"✅ Retry successful: demo generation for {business_data.get('name')}")
            
        except Exception as e:
            retry_count = task_data.get('retry_count', 0)
            
            if retry_count < self.max_retries:
                # Queue for another retry
                self.queue_for_retry(task_data, delay_seconds=60 * (retry_count + 1))
            else:
                # Give up and log critical failure
                self.log_critical_failure("demo_generation_retry", str(e), (), {})
    
    def _retry_outreach_send(self, task_data: dict):
        """Retry outreach send"""
        try:
            from minerva_smart_outreach import MinervaSmartOutreach
            
            outreach = MinervaSmartOutreach()
            outreach_data = task_data['task_data']['outreach_data']
            
            # Retry the specific outreach
            if outreach_data['method'] == 'sms':
                result = outreach._send_sms_with_demo(outreach_data['lead'], outreach_data['demo'])
            elif outreach_data['method'] == 'email':
                result = outreach._send_email_with_demo(outreach_data['lead'], outreach_data['demo'])
            
            if not result.get('sent'):
                raise Exception(result.get('error', 'Send failed'))
            
            logger.info(f"✅ Retry successful: outreach to {outreach_data['lead'].get('name')}")
            
        except Exception as e:
            retry_count = task_data.get('retry_count', 0)
            
            if retry_count < self.max_retries:
                # Queue for another retry
                self.queue_for_retry(task_data, delay_seconds=60 * (retry_count + 1))
            else:
                # Give up and log critical failure
                self.log_critical_failure("outreach_send_retry", str(e), (), {})
    
    def get_error_summary(self) -> dict:
        """Get summary of recent errors"""
        try:
            # Get recent errors from Redis
            error_entries = self.redis_client.lrange("minerva:errors", 0, 99)
            errors = [json.loads(entry) for entry in error_entries]
            
            # Count by error type
            error_counts = {}
            recent_errors = []
            
            for error in errors:
                error_type = error.get('error_type', 'unknown')
                error_counts[error_type] = error_counts.get(error_type, 0) + 1
                
                if len(recent_errors) < 10:
                    recent_errors.append(error)
            
            # Get retry queue status
            retry_queue_size = self.redis_client.zcard(self.retry_queue_key)
            failed_queue_size = self.redis_client.llen(self.failed_queue_key)
            
            return {
                'error_counts': error_counts,
                'recent_errors': recent_errors,
                'retry_queue_size': retry_queue_size,
                'failed_queue_size': failed_queue_size,
                'total_errors': len(errors)
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get error summary: {e}")
            return {'error': str(e)}

# Global error handler instance
error_handler = MinervaErrorHandler()

# Convenience decorators
def with_retry(max_retries: int = 3):
    """Simple retry decorator"""
    return error_handler.retry_with_backoff(max_retries=max_retries)

def safe_execute(func: Callable, *args, **kwargs) -> tuple:
    """Safely execute a function and return (success, result)"""
    try:
        result = func(*args, **kwargs)
        return True, result
    except Exception as e:
        error_handler.log_error("safe_execute_failure", function=func.__name__, error=str(e))
        return False, str(e)

# CLI for monitoring
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "process_retries":
            print("🔄 Processing retry queue...")
            error_handler.process_retry_queue()
            
        elif command == "summary":
            summary = error_handler.get_error_summary()
            print(json.dumps(summary, indent=2))
            
        elif command == "test_notification":
            error_handler.send_error_notification(
                "Test Alert", 
                "This is a test notification", 
                {'test': True, 'timestamp': datetime.now().isoformat()}
            )
            print("📧 Test notification sent")
            
        else:
            print(f"Unknown command: {command}")
    else:
        print("Minerva Error Handler")
        print("Commands:")
        print("  process_retries - Process retry queue")
        print("  summary - Show error summary")
        print("  test_notification - Send test notification") 