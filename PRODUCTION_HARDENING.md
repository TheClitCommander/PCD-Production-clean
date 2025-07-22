# Production Hardening Guide for Pleasant Cove + Minerva

## 🔐 1. Service-to-Service Authentication with mTLS

### Istio Service Mesh Configuration

```yaml
# istio-mesh-config.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: pleasant-cove
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: control-api-policy
  namespace: pleasant-cove
spec:
  selector:
    matchLabels:
      app: control-api
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/pleasant-cove/sa/api-gateway"]
    - source:
        principals: ["cluster.local/ns/pleasant-cove/sa/minerva"]
  - to:
    - operation:
        methods: ["GET", "POST"]
```

### Circuit Breaker Implementation

```python
# circuit_breaker.py
from pybreaker import CircuitBreaker
import requests
from functools import wraps
import logging

logger = logging.getLogger(__name__)

# Configure circuit breakers for each service
db_breaker = CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    exclude=[requests.HTTPError]  # Don't trip on 4xx errors
)

control_api_breaker = CircuitBreaker(
    fail_max=3,
    reset_timeout=30
)

analytics_breaker = CircuitBreaker(
    fail_max=10,
    reset_timeout=120
)

class ResilientAPIGateway:
    def __init__(self):
        self.breakers = {
            'control': control_api_breaker,
            'analytics': analytics_breaker,
            'database': db_breaker
        }
    
    @control_api_breaker
    def call_control_api(self, endpoint, method='GET', **kwargs):
        """Call Control API with circuit breaker"""
        url = f"http://control-api:5001{endpoint}"
        response = requests.request(method, url, timeout=5, **kwargs)
        response.raise_for_status()
        return response.json()
    
    def handle_breaker_open(self, service_name):
        """Graceful degradation when circuit is open"""
        logger.warning(f"Circuit breaker OPEN for {service_name}")
        
        # Return cached data or degraded response
        if service_name == 'analytics':
            return {
                'status': 'degraded',
                'message': 'Analytics temporarily unavailable',
                'cached_data': self.get_cached_analytics()
            }
        elif service_name == 'control':
            return {
                'status': 'queued',
                'message': 'Request queued for processing',
                'retry_after': 30
            }

# Decorator for automatic circuit breaking
def with_circuit_breaker(breaker_name):
    def decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            breaker = self.breakers.get(breaker_name)
            if breaker and breaker.current_state == 'open':
                return self.handle_breaker_open(breaker_name)
            try:
                return func(self, *args, **kwargs)
            except Exception as e:
                logger.error(f"Error in {func.__name__}: {e}")
                raise
        return wrapper
    return decorator
```

## 📬 2. Task Queue Enhancements

### Dead Letter Queue Implementation

```python
# enhanced_task_queue.py
import asyncio
import json
from datetime import datetime, timedelta
import hashlib

class EnhancedTaskQueue:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.max_retries = 3
        self.dlq_ttl = 86400 * 7  # 7 days
        
    async def enqueue(self, task_type, payload, priority='normal', idempotency_key=None):
        """Enqueue with idempotency support"""
        # Generate idempotency key if not provided
        if not idempotency_key:
            # Create key from task type and payload
            payload_str = json.dumps(payload, sort_keys=True)
            idempotency_key = hashlib.sha256(
                f"{task_type}:{payload_str}".encode()
            ).hexdigest()[:16]
        
        # Check if task already exists
        existing = await self.redis.get(f"task:idempotent:{idempotency_key}")
        if existing:
            return json.loads(existing)['id']
        
        task = {
            'id': str(uuid.uuid4()),
            'type': task_type,
            'payload': payload,
            'created_at': datetime.now().isoformat(),
            'status': 'pending',
            'attempts': 0,
            'idempotency_key': idempotency_key
        }
        
        # Store idempotency record
        await self.redis.setex(
            f"task:idempotent:{idempotency_key}",
            3600,  # 1 hour TTL
            json.dumps(task)
        )
        
        # Enqueue task
        queue_name = f"tasks:{priority}"
        await self.redis.lpush(queue_name, json.dumps(task))
        
        return task['id']
    
    async def process_with_retry(self, task):
        """Process task with retry logic"""
        task['attempts'] += 1
        
        try:
            result = await self.execute_task(task)
            await self.mark_complete(task, result)
            return result
            
        except Exception as e:
            logger.error(f"Task {task['id']} failed: {e}")
            
            if task['attempts'] >= self.max_retries:
                # Move to dead letter queue
                await self.move_to_dlq(task, str(e))
            else:
                # Exponential backoff
                delay = 2 ** task['attempts']
                await self.retry_task(task, delay)
    
    async def move_to_dlq(self, task, error_message):
        """Move failed task to dead letter queue"""
        dlq_entry = {
            **task,
            'failed_at': datetime.now().isoformat(),
            'error': error_message,
            'dlq_reason': f"Max retries ({self.max_retries}) exceeded"
        }
        
        # Store in DLQ with TTL
        await self.redis.setex(
            f"dlq:{task['type']}:{task['id']}",
            self.dlq_ttl,
            json.dumps(dlq_entry)
        )
        
        # Alert on DLQ entry
        await self.send_dlq_alert(dlq_entry)
    
    async def retry_task(self, task, delay_seconds):
        """Schedule task retry with exponential backoff"""
        retry_time = datetime.now() + timedelta(seconds=delay_seconds)
        task['retry_at'] = retry_time.isoformat()
        
        # Use sorted set for delayed execution
        score = retry_time.timestamp()
        await self.redis.zadd('tasks:delayed', {json.dumps(task): score})
    
    async def process_delayed_tasks(self):
        """Process tasks that are ready after delay"""
        while True:
            now = datetime.now().timestamp()
            
            # Get tasks ready for retry
            ready_tasks = await self.redis.zrangebyscore(
                'tasks:delayed', 0, now, start=0, num=10
            )
            
            for task_data in ready_tasks:
                task = json.loads(task_data)
                # Re-enqueue for processing
                await self.redis.lpush('tasks:normal', task_data)
                await self.redis.zrem('tasks:delayed', task_data)
            
            await asyncio.sleep(1)

# Idempotent task executor
class IdempotentExecutor:
    def __init__(self):
        self.executors = {
            'send_email': self.send_email_idempotent,
            'book_appointment': self.book_appointment_idempotent,
            'scrape_leads': self.scrape_leads_idempotent
        }
    
    async def send_email_idempotent(self, payload):
        """Send email only if not already sent"""
        email_key = f"email_sent:{payload['to']}:{payload['template']}:{payload.get('business_id')}"
        
        # Check if already sent today
        if await self.redis.exists(email_key):
            return {'status': 'already_sent', 'skipped': True}
        
        # Send email
        result = await self.outreach_manager.send_email(**payload)
        
        # Mark as sent (24 hour TTL)
        await self.redis.setex(email_key, 86400, '1')
        
        return result
    
    async def book_appointment_idempotent(self, payload):
        """Book appointment with duplicate check"""
        lead_id = payload['lead_id']
        date = payload['datetime'][:10]  # Extract date
        
        # Check for existing appointment
        existing = await self.check_existing_appointment(lead_id, date)
        if existing:
            return {
                'status': 'duplicate_prevented',
                'existing_appointment': existing
            }
        
        # Book appointment
        return await self.book_appointment(**payload)
```

## 📊 3. Analytics Data Architecture

### TimescaleDB for Time-Series Analytics

```sql
-- timescale_schema.sql
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Lead events table
CREATE TABLE lead_events (
    time TIMESTAMPTZ NOT NULL,
    lead_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB,
    source TEXT
);

-- Convert to hypertable
SELECT create_hypertable('lead_events', 'time');

-- Create indexes
CREATE INDEX idx_lead_events_lead_id ON lead_events (lead_id, time DESC);
CREATE INDEX idx_lead_events_type ON lead_events (event_type, time DESC);

-- Continuous aggregates for real-time analytics
CREATE MATERIALIZED VIEW lead_metrics_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', time) AS hour,
    event_type,
    COUNT(*) as event_count,
    COUNT(DISTINCT lead_id) as unique_leads
FROM lead_events
GROUP BY hour, event_type
WITH NO DATA;

-- Refresh policy
SELECT add_continuous_aggregate_policy('lead_metrics_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- Retention policy (keep raw data for 90 days)
SELECT add_retention_policy('lead_events', INTERVAL '90 days');
```

### Model Retraining Pipeline

```python
# ml_pipeline.py
import mlflow
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import joblib
from datetime import datetime

class ModelRetrainingPipeline:
    def __init__(self, db_config):
        self.db_config = db_config
        mlflow.set_tracking_uri("http://mlflow:5000")
        
    def collect_training_data(self, days_back=30):
        """Collect recent lead outcomes for training"""
        query = """
        SELECT 
            b.*,
            CASE 
                WHEN outreach_status = 'client' THEN 1 
                ELSE 0 
            END as converted
        FROM businesses b
        WHERE last_contacted >= NOW() - INTERVAL '{} days'
        AND outreach_status IN ('responded', 'meeting_scheduled', 'client', 'not_interested')
        """.format(days_back)
        
        df = pd.read_sql(query, self.db_config)
        return df
    
    def prepare_features(self, df):
        """Feature engineering for lead scoring"""
        features = pd.DataFrame({
            'rating': df['rating'].fillna(0),
            'reviews': df['reviews'].fillna(0),
            'no_website': (~df['has_website']).astype(int),
            'phone_valid': df['phone_valid'].fillna(0),
            'email_confidence': df['email_confidence_score'].fillna(0),
            'days_since_created': (datetime.now() - pd.to_datetime(df['created_at'])).dt.days,
            'response_time_hours': df['response_time_hours'].fillna(-1)
        })
        
        return features, df['converted']
    
    def train_model(self, X, y):
        """Train new model with MLflow tracking"""
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        with mlflow.start_run():
            # Train model
            model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42
            )
            model.fit(X_train, y_train)
            
            # Evaluate
            train_score = model.score(X_train, y_train)
            test_score = model.score(X_test, y_test)
            
            # Log metrics
            mlflow.log_metric("train_accuracy", train_score)
            mlflow.log_metric("test_accuracy", test_score)
            mlflow.log_param("n_estimators", 100)
            mlflow.log_param("max_depth", 10)
            
            # Log model
            mlflow.sklearn.log_model(model, "lead_scorer")
            
            return model, test_score
    
    def deploy_model(self, model, min_score=0.75):
        """Deploy model if performance threshold met"""
        if model[1] >= min_score:
            # Save to production
            joblib.dump(model[0], 'models/lead_scorer_new.pkl')
            
            # Atomic swap
            os.rename('models/lead_scorer.pkl', 'models/lead_scorer_old.pkl')
            os.rename('models/lead_scorer_new.pkl', 'models/lead_scorer.pkl')
            
            logger.info(f"Deployed new model with score: {model[1]}")
            return True
        else:
            logger.warning(f"Model score {model[1]} below threshold {min_score}")
            return False
    
    def run_pipeline(self):
        """Execute full retraining pipeline"""
        logger.info("Starting model retraining pipeline")
        
        # Collect data
        df = self.collect_training_data()
        if len(df) < 100:
            logger.warning("Insufficient training data")
            return
        
        # Prepare features
        X, y = self.prepare_features(df)
        
        # Train model
        model, score = self.train_model(X, y)
        
        # Deploy if good
        deployed = self.deploy_model((model, score))
        
        # Alert on deployment
        if deployed:
            self.send_deployment_notification(score)
```

## 🔍 4. Distributed Tracing with OpenTelemetry

```python
# tracing.py
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# Configure tracing
def setup_tracing(service_name):
    # Set up the tracer provider
    trace.set_tracer_provider(TracerProvider())
    tracer = trace.get_tracer(service_name)
    
    # Configure OTLP exporter (Jaeger/Tempo)
    otlp_exporter = OTLPSpanExporter(
        endpoint="http://tempo:4317",
        insecure=True
    )
    
    # Add span processor
    span_processor = BatchSpanProcessor(otlp_exporter)
    trace.get_tracer_provider().add_span_processor(span_processor)
    
    # Auto-instrument libraries
    FlaskInstrumentor().instrument()
    RequestsInstrumentor().instrument()
    SQLAlchemyInstrumentor().instrument()
    
    return tracer

# Traced API Gateway
class TracedAPIGateway:
    def __init__(self):
        self.tracer = setup_tracing('api-gateway')
    
    def handle_request(self, request):
        with self.tracer.start_as_current_span("handle_api_request") as span:
            # Add request attributes
            span.set_attribute("http.method", request.method)
            span.set_attribute("http.url", request.url)
            span.set_attribute("user.id", request.user_id)
            
            # Process request
            try:
                # Check auth
                with self.tracer.start_as_current_span("authenticate"):
                    auth_result = self.authenticate(request)
                
                # Rate limit check
                with self.tracer.start_as_current_span("rate_limit_check"):
                    self.check_rate_limit(request.user_id)
                
                # Forward to service
                with self.tracer.start_as_current_span("forward_to_service"):
                    response = self.forward_request(request)
                
                span.set_attribute("http.status_code", response.status_code)
                return response
                
            except Exception as e:
                span.record_exception(e)
                span.set_status(trace.Status(trace.StatusCode.ERROR))
                raise

# Trace async operations
async def trace_async_operation(tracer, operation_name, func, *args, **kwargs):
    with tracer.start_as_current_span(operation_name) as span:
        try:
            result = await func(*args, **kwargs)
            span.set_status(trace.Status(trace.StatusCode.OK))
            return result
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR))
            raise
```

## 📈 5. SLI/SLO Configuration

```yaml
# prometheus-rules.yaml
groups:
  - name: pleasant_cove_slos
    interval: 30s
    rules:
      # API Latency SLO
      - record: api_request_duration_seconds_slo
        expr: histogram_quantile(0.95, api_request_duration_seconds_bucket) < 0.2
      
      # Error Rate SLO
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(api_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(api_requests_total[5m]))
          ) > 0.01
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (SLO: <1%)"
      
      # Appointment Booking Success Rate
      - record: appointment_booking_success_rate
        expr: |
          sum(rate(appointment_bookings_total{status="success"}[5m]))
          /
          sum(rate(appointment_bookings_total[5m]))
      
      - alert: LowBookingSuccessRate
        expr: appointment_booking_success_rate < 0.99
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Appointment booking success rate below SLO"
          description: "Success rate: {{ $value | humanizePercentage }} (SLO: >99%)"
      
      # Task Queue Depth
      - alert: TaskQueueBacklog
        expr: task_queue_size{priority="high"} > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High priority task queue backlog"
          description: "{{ $value }} tasks in high priority queue"
```

## 🔌 6. WebSocket Horizontal Scaling

```python
# scalable_websocket.py
import aioredis
import asyncio
from typing import Dict, Set

class ScalableWebSocketServer:
    def __init__(self, server_id: str):
        self.server_id = server_id
        self.local_clients: Dict[str, WebSocket] = {}
        self.redis_pub = None
        self.redis_sub = None
        
    async def start(self):
        # Create Redis connections
        self.redis_pub = await aioredis.create_redis_pool('redis://redis:6379')
        self.redis_sub = await aioredis.create_redis_pool('redis://redis:6379')
        
        # Subscribe to broadcast channel
        channel = (await self.redis_sub.subscribe('ws:broadcast'))[0]
        
        # Start message processor
        asyncio.create_task(self.process_broadcasts(channel))
    
    async def handle_client(self, websocket, path):
        """Handle client with sticky session support"""
        # Extract session token
        token = await self.authenticate_websocket(websocket)
        client_id = f"{self.server_id}:{token}"
        
        # Register client locally
        self.local_clients[client_id] = websocket
        
        # Announce client connection
        await self.redis_pub.setex(
            f"ws:client:{token}",
            300,  # 5 minute TTL
            self.server_id
        )
        
        try:
            async for message in websocket:
                await self.handle_client_message(client_id, message)
        finally:
            # Clean up
            del self.local_clients[client_id]
            await self.redis_pub.delete(f"ws:client:{token}")
    
    async def broadcast_message(self, message_type: str, data: dict, target_clients: Set[str] = None):
        """Broadcast to all clients across all servers"""
        message = {
            'type': message_type,
            'data': data,
            'from_server': self.server_id,
            'target_clients': list(target_clients) if target_clients else None
        }
        
        # Publish to Redis for other servers
        await self.redis_pub.publish('ws:broadcast', json.dumps(message))
        
        # Send to local clients
        await self.send_to_local_clients(message, target_clients)
    
    async def process_broadcasts(self, channel):
        """Process broadcasts from other servers"""
        async for message in channel.iter():
            try:
                data = json.loads(message.decode())
                
                # Skip if from self
                if data['from_server'] == self.server_id:
                    continue
                
                # Send to relevant local clients
                await self.send_to_local_clients(data, data.get('target_clients'))
                
            except Exception as e:
                logger.error(f"Broadcast processing error: {e}")
    
    async def send_to_local_clients(self, message: dict, target_clients: Set[str] = None):
        """Send message to local clients"""
        message_str = json.dumps(message)
        
        # Determine recipients
        if target_clients:
            recipients = {
                cid: ws for cid, ws in self.local_clients.items()
                if any(cid.endswith(target) for target in target_clients)
            }
        else:
            recipients = self.local_clients
        
        # Send to all recipients
        disconnected = []
        for client_id, websocket in recipients.items():
            try:
                await websocket.send(message_str)
            except:
                disconnected.append(client_id)
        
        # Clean up disconnected
        for client_id in disconnected:
            del self.local_clients[client_id]
```

## 🔐 7. Secrets Management

```python
# secrets_manager.py
import boto3
from functools import lru_cache
import json

class SecretsManager:
    def __init__(self, region='us-east-1'):
        self.client = boto3.client('secretsmanager', region_name=region)
        self._cache = {}
        
    @lru_cache(maxsize=128)
    def get_secret(self, secret_name: str) -> dict:
        """Get secret from AWS Secrets Manager with caching"""
        try:
            response = self.client.get_secret_value(SecretId=secret_name)
            return json.loads(response['SecretString'])
        except Exception as e:
            logger.error(f"Failed to retrieve secret {secret_name}: {e}")
            raise
    
    def get_database_credentials(self) -> dict:
        """Get database credentials"""
        return self.get_secret('pleasant-cove/database')
    
    def get_api_keys(self) -> dict:
        """Get external API keys"""
        return self.get_secret('pleasant-cove/api-keys')
    
    def get_jwt_secret(self) -> str:
        """Get JWT signing secret"""
        return self.get_secret('pleasant-cove/jwt')['secret_key']

# Environment configuration
class Config:
    def __init__(self):
        self.secrets = SecretsManager()
        
    @property
    def database_url(self):
        creds = self.secrets.get_database_credentials()
        return f"postgresql://{creds['username']}:{creds['password']}@{creds['host']}/{creds['database']}"
    
    @property
    def openai_api_key(self):
        return self.secrets.get_api_keys()['openai']
    
    @property
    def twilio_credentials(self):
        keys = self.secrets.get_api_keys()
        return {
            'account_sid': keys['twilio_account_sid'],
            'auth_token': keys['twilio_auth_token']
        }
```

## 🚀 Next Priority: Implementation Order

Based on your current architecture, I recommend this implementation sequence:

1. **Circuit Breakers & Idempotency** (1 week)
   - Immediate reliability improvement
   - Prevents cascading failures and duplicate operations

2. **Dead Letter Queue** (3 days)
   - Critical for production operations
   - Prevents lost tasks

3. **Distributed Tracing** (1 week)
   - Essential for debugging distributed system
   - Helps identify bottlenecks

4. **TimescaleDB Migration** (2 weeks)
   - Better analytics performance
   - Enables real-time dashboards

5. **Service Mesh** (2 weeks)
   - Zero-trust security
   - Advanced traffic management

Would you like me to create a detailed implementation plan for any of these components? I can also set up a basic chaos testing script to validate your resilience patterns! 🎯 