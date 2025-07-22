#!/usr/bin/env python3
"""
DLQ Monitoring Service for Pleasant Cove + Minerva
Monitors Dead Letter Queue and sends alerts via multiple channels
"""

import redis
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
import os
from threading import Thread

from distributed_tracing import DistributedTracing

logger = logging.getLogger(__name__)

class DLQMonitor:
    """Monitors DLQ events and sends alerts"""
    
    def __init__(self, redis_client: redis.Redis, tracing: DistributedTracing = None):
        self.redis = redis_client
        self.tracing = tracing or DistributedTracing("dlq-monitor", "1.0.0")
        self.pubsub = self.redis.pubsub()
        
        # Alert configuration
        self.email_config = {
            'smtp_host': os.getenv('SMTP_HOST', 'smtp.gmail.com'),
            'smtp_port': int(os.getenv('SMTP_PORT', 587)),
            'smtp_user': os.getenv('SMTP_USER'),
            'smtp_password': os.getenv('SMTP_PASSWORD'),
            'alert_email': os.getenv('ALERT_EMAIL'),
            'from_email': os.getenv('FROM_EMAIL', 'alerts@pleasantcove.design')
        }
        
        self.slack_webhook = os.getenv('SLACK_WEBHOOK_URL')
        self.webhook_url = os.getenv('ALERT_WEBHOOK_URL')
        
        # Alert throttling
        self.alert_cache = {}  # task_type -> last_alert_time
        self.throttle_window = 300  # 5 minutes
        
        # Statistics
        self.stats = {
            'alerts_sent': 0,
            'alerts_throttled': 0,
            'email_sent': 0,
            'slack_sent': 0,
            'webhook_sent': 0
        }
    
    def start(self):
        """Start monitoring DLQ events"""
        logger.info("🚨 Starting DLQ Monitor")
        
        # Subscribe to DLQ events
        self.pubsub.subscribe('dlq_alerts', 'task_events')
        
        # Start monitoring thread
        monitor_thread = Thread(target=self._monitor_loop, daemon=True)
        monitor_thread.start()
        
        # Start periodic health check
        health_thread = Thread(target=self._health_check_loop, daemon=True)
        health_thread.start()
        
        logger.info("✅ DLQ Monitor started")
    
    def _monitor_loop(self):
        """Main monitoring loop"""
        for message in self.pubsub.listen():
            if message['type'] == 'message':
                try:
                    with self.tracing.trace_operation("dlq_monitor.process_event"):
                        self._process_event(message)
                except Exception as e:
                    logger.error(f"Error processing DLQ event: {e}")
    
    def _process_event(self, message):
        """Process a DLQ event"""
        channel = message['channel']
        data = json.loads(message['data'])
        
        if channel == 'dlq_alerts':
            self._handle_dlq_alert(data)
        elif channel == 'task_events' and data.get('type') == 'task_dead_lettered':
            self._handle_task_dead_lettered(data)
    
    def _handle_dlq_alert(self, alert: Dict):
        """Handle a DLQ alert"""
        with self.tracing.trace_operation("dlq_monitor.handle_alert", {
            "alert.type": alert.get('type'),
            "alert.severity": alert.get('severity')
        }) as span:
            alert_type = alert.get('type')
            
            if alert_type == 'task_dead_lettered':
                self._alert_task_failed(alert)
            elif alert_type == 'dlq_threshold_exceeded':
                self._alert_threshold_exceeded(alert)
            
            span.set_attribute("alert.handled", True)
    
    def _handle_task_dead_lettered(self, event: Dict):
        """Handle task entering DLQ"""
        task_id = event.get('task_id')
        task_type = event.get('task_type')
        
        # Check throttling
        if self._should_throttle(task_type):
            self.stats['alerts_throttled'] += 1
            logger.info(f"Throttled alert for task type: {task_type}")
            return
        
        # Create alert
        alert = {
            'title': f'Task Failed: {task_type}',
            'severity': 'high',
            'task_id': task_id,
            'task_type': task_type,
            'timestamp': event.get('timestamp'),
            'trace_id': event.get('trace_id')
        }
        
        # Send alerts
        self._send_alerts(alert)
    
    def _alert_task_failed(self, alert: Dict):
        """Send alert for failed task"""
        task_id = alert.get('task_id')
        task_type = alert.get('task_type')
        error = alert.get('error', 'Unknown error')
        attempts = alert.get('attempts', 0)
        
        message = f"""
🚨 Task Failed and Moved to DLQ

Task ID: {task_id}
Task Type: {task_type}
Attempts: {attempts}
Error: {error}
Time: {alert.get('timestamp')}

Action Required: Review and manually retry if needed.
View DLQ: http://localhost:5001/api/dlq/normal
"""
        
        alert_data = {
            'title': f'DLQ: {task_type} failed',
            'message': message,
            'severity': 'high',
            'task_id': task_id,
            'task_type': task_type,
            'error': error
        }
        
        self._send_alerts(alert_data)
    
    def _alert_threshold_exceeded(self, alert: Dict):
        """Send alert for DLQ threshold exceeded"""
        total_items = alert.get('total_items', 0)
        threshold = alert.get('threshold', 0)
        breakdown = alert.get('breakdown', {})
        
        message = f"""
⚠️ DLQ Threshold Exceeded

Total Items: {total_items} (threshold: {threshold})
Breakdown:
- High Priority: {breakdown.get('high', 0)}
- Normal Priority: {breakdown.get('normal', 0)}
- Low Priority: {breakdown.get('low', 0)}

Time: {alert.get('timestamp')}

Action Required: Review and process DLQ items.
"""
        
        alert_data = {
            'title': 'DLQ Threshold Exceeded',
            'message': message,
            'severity': 'medium',
            'total_items': total_items
        }
        
        self._send_alerts(alert_data)
    
    def _send_alerts(self, alert: Dict):
        """Send alerts through all configured channels"""
        with self.tracing.trace_operation("dlq_monitor.send_alerts", {
            "alert.title": alert.get('title'),
            "alert.severity": alert.get('severity')
        }) as span:
            channels_used = []
            
            # Email
            if self.email_config.get('smtp_user'):
                try:
                    self._send_email_alert(alert)
                    channels_used.append('email')
                    self.stats['email_sent'] += 1
                except Exception as e:
                    logger.error(f"Failed to send email alert: {e}")
            
            # Slack
            if self.slack_webhook:
                try:
                    self._send_slack_alert(alert)
                    channels_used.append('slack')
                    self.stats['slack_sent'] += 1
                except Exception as e:
                    logger.error(f"Failed to send Slack alert: {e}")
            
            # Webhook
            if self.webhook_url:
                try:
                    self._send_webhook_alert(alert)
                    channels_used.append('webhook')
                    self.stats['webhook_sent'] += 1
                except Exception as e:
                    logger.error(f"Failed to send webhook alert: {e}")
            
            self.stats['alerts_sent'] += 1
            span.set_attribute("channels_used", ','.join(channels_used))
            
            # Update throttle cache
            if alert.get('task_type'):
                self.alert_cache[alert['task_type']] = datetime.now()
            
            logger.info(f"Alert sent via: {channels_used}")
    
    def _send_email_alert(self, alert: Dict):
        """Send email alert"""
        if not self.email_config.get('alert_email'):
            return
        
        msg = MIMEMultipart()
        msg['From'] = self.email_config['from_email']
        msg['To'] = self.email_config['alert_email']
        msg['Subject'] = f"[DLQ Alert] {alert['title']}"
        
        # Create HTML body
        html_body = f"""
        <html>
            <body>
                <h2>{alert['title']}</h2>
                <p><strong>Severity:</strong> {alert.get('severity', 'unknown')}</p>
                <pre>{alert['message']}</pre>
                
                <hr>
                <p>
                    <a href="http://localhost:5001/api/dlq">View DLQ Dashboard</a> |
                    <a href="http://localhost:16686/trace/{alert.get('trace_id', '')}">View Trace</a>
                </p>
            </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, 'html'))
        
        # Send email
        with smtplib.SMTP(self.email_config['smtp_host'], self.email_config['smtp_port']) as server:
            server.starttls()
            server.login(self.email_config['smtp_user'], self.email_config['smtp_password'])
            server.send_message(msg)
    
    def _send_slack_alert(self, alert: Dict):
        """Send Slack alert"""
        severity_emoji = {
            'high': '🚨',
            'medium': '⚠️',
            'low': 'ℹ️'
        }.get(alert.get('severity', 'medium'), '📢')
        
        slack_message = {
            'text': f"{severity_emoji} {alert['title']}",
            'attachments': [{
                'color': {
                    'high': 'danger',
                    'medium': 'warning',
                    'low': 'good'
                }.get(alert.get('severity', 'medium'), 'warning'),
                'fields': [
                    {
                        'title': 'Details',
                        'value': alert['message'],
                        'short': False
                    }
                ],
                'footer': 'DLQ Monitor',
                'ts': int(time.time())
            }]
        }
        
        response = requests.post(self.slack_webhook, json=slack_message)
        response.raise_for_status()
    
    def _send_webhook_alert(self, alert: Dict):
        """Send generic webhook alert"""
        webhook_data = {
            'type': 'dlq_alert',
            'timestamp': datetime.now().isoformat(),
            'alert': alert
        }
        
        response = requests.post(
            self.webhook_url,
            json=webhook_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        response.raise_for_status()
    
    def _should_throttle(self, task_type: str) -> bool:
        """Check if alert should be throttled"""
        last_alert = self.alert_cache.get(task_type)
        if not last_alert:
            return False
        
        time_since_last = (datetime.now() - last_alert).total_seconds()
        return time_since_last < self.throttle_window
    
    def _health_check_loop(self):
        """Periodic health check of DLQ"""
        while True:
            try:
                time.sleep(300)  # Check every 5 minutes
                self._check_dlq_health()
            except Exception as e:
                logger.error(f"Health check error: {e}")
    
    def _check_dlq_health(self):
        """Check overall DLQ health"""
        with self.tracing.trace_operation("dlq_monitor.health_check"):
            # Get DLQ stats from Redis
            stats = {}
            for priority in ['high', 'normal', 'low']:
                queue_length = self.redis.llen(f'dlq:{priority}')
                stats[priority] = queue_length
            
            total_items = sum(stats.values())
            
            # Log stats
            logger.info(f"DLQ Health Check - Total: {total_items}, Breakdown: {stats}")
            
            # Check for concerning patterns
            if stats.get('high', 0) > 5:
                logger.warning(f"High priority DLQ has {stats['high']} items!")
            
            # Store metrics
            self.redis.hset('metrics:dlq', mapping={
                'total_items': total_items,
                'high_priority': stats.get('high', 0),
                'normal_priority': stats.get('normal', 0),
                'low_priority': stats.get('low', 0),
                'last_check': datetime.now().isoformat()
            })
    
    def get_stats(self) -> Dict:
        """Get monitor statistics"""
        return {
            'monitor_stats': self.stats,
            'dlq_metrics': self.redis.hgetall('metrics:dlq'),
            'alert_cache_size': len(self.alert_cache),
            'subscribed_channels': list(self.pubsub.channels.keys())
        }

# CLI for testing
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='DLQ Monitor')
    parser.add_argument('--test-alert', action='store_true', help='Send test alert')
    parser.add_argument('--stats', action='store_true', help='Show monitor stats')
    args = parser.parse_args()
    
    # Initialize
    redis_client = redis.Redis(decode_responses=True)
    tracing = DistributedTracing("dlq-monitor-cli", "1.0.0")
    tracing.initialize()
    
    monitor = DLQMonitor(redis_client, tracing)
    
    if args.test_alert:
        # Send test alert
        test_alert = {
            'title': 'Test DLQ Alert',
            'message': 'This is a test alert from DLQ Monitor',
            'severity': 'medium',
            'task_id': 'test-123',
            'task_type': 'test_task'
        }
        monitor._send_alerts(test_alert)
        print("Test alert sent!")
    
    elif args.stats:
        # Show stats
        stats = monitor.get_stats()
        print(json.dumps(stats, indent=2))
    
    else:
        # Start monitoring
        monitor.start()
        print("DLQ Monitor started. Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nStopping monitor...") 