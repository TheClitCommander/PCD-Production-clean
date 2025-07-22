# Dead Letter Queue Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Ensure you have the tracing requirements installed
source venv/bin/activate
python3 -m pip install -r requirements-tracing.txt

# Additional DLQ dependencies
python3 -m pip install aioredis
```

### 2. Start Infrastructure

```bash
# Ensure Redis is running (required)
docker-compose -f docker-compose.jaeger.yml up -d
```

### 3. Start DLQ API Service

```bash
# In one terminal
python dlq_api.py
```

### 4. Start DLQ Monitor (Optional)

```bash
# In another terminal
python dlq_monitoring.py
```

### 5. Test the DLQ System

```bash
# Run comprehensive tests
python test_dead_letter_queue.py
```

## 📊 What the DLQ Provides

### Reliability Features
- **No Lost Tasks**: Failed tasks are captured in DLQ
- **Retry Logic**: Exponential backoff with configurable limits
- **Idempotency**: Prevents duplicate task processing
- **Monitoring**: Real-time alerts for failures

### Visibility Features
- **API Dashboard**: View all failed tasks
- **Search & Filter**: Find specific failures
- **Retry Management**: Manually retry tasks
- **Statistics**: Track failure patterns

## 🔧 Configuration

### Environment Variables

```bash
# Email Alerts
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your-email@gmail.com
export SMTP_PASSWORD=your-app-password
export ALERT_EMAIL=alerts@yourdomain.com

# Slack Alerts
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Generic Webhook
export ALERT_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
```

### DLQ Configuration

Edit `dead_letter_queue.py` to adjust:

```python
self.retry_delays = [5, 30, 120, 300]  # Retry delays in seconds
self.dlq_ttl = 7 * 24 * 3600          # Keep DLQ items for 7 days
self.alert_threshold = 10              # Alert if >10 items in DLQ
```

## 📡 API Endpoints

### View DLQ Items
```bash
# Get all DLQ items
curl http://localhost:5002/api/dlq

# Get items by priority
curl http://localhost:5002/api/dlq/high
curl http://localhost:5002/api/dlq/normal
curl http://localhost:5002/api/dlq/low

# Get DLQ statistics
curl http://localhost:5002/api/dlq/stats
```

### Retry Failed Tasks
```bash
# Retry single task
curl -X POST http://localhost:5002/api/dlq/retry \
  -H "Content-Type: application/json" \
  -d '{"task_id": "task-123", "reset_attempts": true}'

# Retry all tasks in a priority
curl -X POST http://localhost:5002/api/dlq/retry-all \
  -H "Content-Type: application/json" \
  -d '{"priority": "normal", "limit": 10}'
```

### Search DLQ
```bash
# Search by task type
curl -X POST http://localhost:5002/api/dlq/search \
  -H "Content-Type: application/json" \
  -d '{"task_type": "send_email", "limit": 50}'

# Search by error
curl -X POST http://localhost:5002/api/dlq/search \
  -H "Content-Type: application/json" \
  -d '{"error_contains": "timeout", "limit": 20}'
```

### Purge Old Items
```bash
# Purge items older than 7 days
curl -X DELETE "http://localhost:5002/api/dlq/purge?older_than_days=7"

# Purge specific priority
curl -X DELETE "http://localhost:5002/api/dlq/purge?priority=low&older_than_days=3"
```

## 🏗️ Integration with Your Task Queue

### Basic Usage

```python
from dead_letter_queue import DeadLetterQueue, Task
import redis

# Initialize
redis_client = redis.Redis(decode_responses=True)
dlq = DeadLetterQueue(redis_client)

# Create and enqueue task
task = Task(
    type="send_welcome_email",
    payload={"user_id": 123, "email": "user@example.com"},
    max_retries=3,
    idempotency_key="welcome_email_123"
)

task_id = await dlq.enqueue(task)

# Process task
async def send_email_processor(task):
    # Your task logic here
    send_email(task.payload['email'])
    
success = await dlq.process_task(task_id, send_email_processor)
```

### With Circuit Breakers

```python
from circuit_breakers import breaker_service

@breaker_service.breakers['email_service']
async def process_with_circuit_breaker(task):
    # Circuit breaker protects against cascading failures
    return await send_email(task.payload)

# DLQ handles individual task failures
# Circuit breaker handles service-level failures
```

### With Tracing

```python
from distributed_tracing import DistributedTracing

tracing = DistributedTracing("task-processor", "1.0.0")
dlq = DeadLetterQueue(redis_client, tracing)

# All DLQ operations are automatically traced
# View in Jaeger to see retry patterns, failure reasons, etc.
```

## 📈 Monitoring & Alerts

### Alert Channels

1. **Email Alerts**
   - Task failures
   - DLQ threshold exceeded
   - Purge summaries

2. **Slack Notifications**
   - Real-time failure alerts
   - Daily DLQ summaries
   - Critical threshold warnings

3. **Webhook Integration**
   - Custom alert handling
   - Integration with PagerDuty, etc.

### Metrics to Monitor

```promql
# DLQ size by priority
dlq_items_total{priority="high"}
dlq_items_total{priority="normal"}
dlq_items_total{priority="low"}

# Task failure rate
rate(task_failures_total[5m])

# Retry success rate
task_retry_success_total / task_retry_attempts_total

# Alert frequency
rate(dlq_alerts_sent_total[1h])
```

## 🎯 Best Practices

### 1. Set Appropriate Retry Limits
```python
# Quick operations: fewer retries
Task(type="cache_update", max_retries=2)

# External API calls: more retries
Task(type="api_call", max_retries=5)

# Critical operations: maximum retries
Task(type="payment_process", max_retries=10)
```

### 2. Use Idempotency Keys
```python
# Prevent duplicate processing
task = Task(
    type="charge_customer",
    payload={"customer_id": 123, "amount": 99.99},
    idempotency_key=f"charge_{customer_id}_{invoice_id}"
)
```

### 3. Handle Different Failure Types
```python
async def smart_processor(task):
    try:
        return await process_task(task)
    except TemporaryError:
        # Let DLQ retry
        raise
    except PermanentError as e:
        # Don't retry, log and return
        logger.error(f"Permanent failure: {e}")
        return False
```

### 4. Regular DLQ Review
- Set up daily reports of DLQ contents
- Investigate patterns in failures
- Adjust retry strategies based on data
- Purge truly unrecoverable tasks

## 🚨 Troubleshooting

### High DLQ Volume
1. Check for systemic issues (API down, DB problems)
2. Review recent code changes
3. Analyze failure patterns by task type
4. Consider increasing retry delays

### Tasks Not Entering DLQ
1. Verify max_retries is set correctly
2. Check Redis connectivity
3. Ensure process_task is being called
4. Review error handling logic

### Alerts Not Working
1. Test with manual alert: `python dlq_monitoring.py --test-alert`
2. Verify environment variables are set
3. Check Redis pub/sub connection
4. Review monitor logs

## 📚 Next Steps

1. **Set Up Dashboards**: Create Grafana dashboards for DLQ metrics
2. **Automate Recovery**: Build scripts for common failure patterns
3. **Integrate with CI/CD**: Add DLQ health checks to deployment
4. **Train Team**: Ensure everyone knows how to investigate DLQ items

With the Dead Letter Queue in place, you now have:
- ✅ Zero task loss guarantee
- ✅ Automatic retry with backoff
- ✅ Full visibility into failures
- ✅ Easy manual intervention
- ✅ Proactive alerting

Your task processing is now production-ready! 🎉 