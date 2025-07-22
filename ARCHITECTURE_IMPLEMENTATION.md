# Enhanced Architecture Implementation Guide

## 🏗️ Microservices Architecture for Pleasant Cove Design + Minerva

### 1. API Gateway & Security Layer

```python
# auth_service.py
from flask import Flask, request, jsonify
from functools import wraps
import jwt
import redis
import time

app = Flask(__name__)
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

class AuthService:
    def __init__(self):
        self.secret_key = os.getenv('JWT_SECRET_KEY')
        self.rate_limits = {
            'default': 100,  # requests per minute
            'ai': 500,       # Minerva gets higher limit
            'widget': 50,    # Public widget lower limit
        }
    
    def authenticate(self, token):
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=['HS256'])
            return payload
        except jwt.InvalidTokenError:
            return None
    
    def rate_limit(self, client_id, client_type='default'):
        """Check rate limits using Redis"""
        key = f"rate_limit:{client_id}"
        current = redis_client.incr(key)
        
        if current == 1:
            redis_client.expire(key, 60)  # Reset every minute
        
        limit = self.rate_limits.get(client_type, 100)
        return current <= limit

# CORS Proxy for Squarespace
@app.route('/cors-proxy/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
def cors_proxy(path):
    """Handle CORS for Squarespace widget"""
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    # Forward request to internal service
    internal_url = f"http://control-api:5001/{path}"
    # ... forward request logic
```

### 2. Microservices Breakdown

#### Task Queue Service
```python
# task_queue_service.py
import asyncio
from aioredis import create_redis_pool
import json

class TaskQueueService:
    def __init__(self):
        self.redis = None
        self.workers = {}
        
    async def connect(self):
        self.redis = await create_redis_pool('redis://localhost')
    
    async def enqueue(self, task_type, payload, priority='normal'):
        """Add task to queue with priority"""
        queue_name = f"tasks:{priority}"
        task = {
            'id': str(uuid.uuid4()),
            'type': task_type,
            'payload': payload,
            'created_at': datetime.now().isoformat(),
            'status': 'pending'
        }
        
        await self.redis.lpush(queue_name, json.dumps(task))
        await self.redis.publish('task_events', json.dumps({
            'event': 'task_created',
            'task_id': task['id']
        }))
        
        return task['id']
    
    async def process_tasks(self):
        """Main task processing loop"""
        while True:
            # Process high priority first
            for priority in ['high', 'normal', 'low']:
                task_data = await self.redis.rpop(f"tasks:{priority}")
                if task_data:
                    task = json.loads(task_data)
                    await self.execute_task(task)
                    break
            else:
                await asyncio.sleep(0.1)
```

#### Analytics Service
```python
# analytics_service.py
from flask import Flask, jsonify
import pandas as pd
from sqlalchemy import create_engine

app = Flask(__name__)

class AnalyticsService:
    def __init__(self):
        self.db_engine = create_engine('sqlite:///scrapers/scraper_results.db')
        self.cache = redis.Redis(host='localhost', port=6379)
        
    def get_lead_metrics(self, timeframe='7d'):
        """Calculate lead generation metrics"""
        query = """
        SELECT 
            DATE(created_at) as date,
            COUNT(*) as leads_added,
            SUM(CASE WHEN has_website = 0 THEN 1 ELSE 0 END) as no_website,
            AVG(rating) as avg_rating
        FROM businesses
        WHERE created_at >= datetime('now', '-{} days')
        GROUP BY DATE(created_at)
        """.format(timeframe.rstrip('d'))
        
        df = pd.read_sql(query, self.db_engine)
        return df.to_dict('records')
    
    def get_conversion_funnel(self):
        """Real-time conversion funnel"""
        cache_key = 'conversion_funnel'
        cached = self.cache.get(cache_key)
        
        if cached:
            return json.loads(cached)
        
        query = """
        SELECT 
            COUNT(*) as total_leads,
            SUM(CASE WHEN outreach_status = 'contacted' THEN 1 ELSE 0 END) as contacted,
            SUM(CASE WHEN outreach_status = 'responded' THEN 1 ELSE 0 END) as responded,
            SUM(CASE WHEN outreach_status = 'meeting_scheduled' THEN 1 ELSE 0 END) as meetings,
            SUM(CASE WHEN outreach_status = 'client' THEN 1 ELSE 0 END) as clients
        FROM businesses
        """
        
        result = pd.read_sql(query, self.db_engine).iloc[0].to_dict()
        
        # Cache for 5 minutes
        self.cache.setex(cache_key, 300, json.dumps(result))
        return result

@app.route('/api/analytics/metrics/<timeframe>')
def get_metrics(timeframe):
    """Get metrics for specified timeframe"""
    analytics = AnalyticsService()
    return jsonify(analytics.get_lead_metrics(timeframe))
```

#### Decision Service
```python
# decision_service.py
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib

class DecisionService:
    def __init__(self):
        self.models = {}
        self.load_models()
        
    def load_models(self):
        """Load ML models for decision making"""
        try:
            self.models['lead_scorer'] = joblib.load('models/lead_scorer.pkl')
            self.models['response_predictor'] = joblib.load('models/response_predictor.pkl')
        except:
            # Initialize with basic rules if no models
            pass
    
    def score_lead(self, lead_data):
        """Score a lead's potential value"""
        features = [
            lead_data.get('rating', 0),
            lead_data.get('reviews', 0),
            1 if not lead_data.get('has_website') else 0,
            1 if lead_data.get('phone_valid') else 0,
            lead_data.get('email_confidence_score', 0)
        ]
        
        if 'lead_scorer' in self.models:
            score = self.models['lead_scorer'].predict_proba([features])[0][1]
        else:
            # Rule-based scoring
            score = 0.0
            if lead_data.get('rating', 0) >= 4.5:
                score += 0.3
            if not lead_data.get('has_website'):
                score += 0.4
            if lead_data.get('phone_valid'):
                score += 0.2
            if lead_data.get('email_confidence_score', 0) > 0.8:
                score += 0.1
        
        return score
    
    def recommend_action(self, analytics_data):
        """AI-powered action recommendations"""
        recommendations = []
        
        # Pipeline health check
        total_leads = analytics_data['total_leads']
        not_contacted = analytics_data['by_status'].get('not_contacted', 0)
        pipeline_ratio = not_contacted / total_leads if total_leads > 0 else 0
        
        if pipeline_ratio < 0.2:
            recommendations.append({
                'action': 'generate_leads',
                'priority': 'high',
                'reason': f'Pipeline running low ({not_contacted} uncontacted)',
                'suggested_params': {
                    'locations': self.suggest_locations(),
                    'business_types': self.suggest_business_types()
                }
            })
        
        # Response rate optimization
        response_rate = analytics_data['conversion']['response_rate']
        if response_rate < 10:
            recommendations.append({
                'action': 'optimize_templates',
                'priority': 'medium',
                'reason': f'Low response rate ({response_rate:.1f}%)',
                'suggested_params': {
                    'test_templates': ['cold_email_v2', 'warm_email_v1'],
                    'segment': 'prime_prospects'
                }
            })
        
        return recommendations
```

### 3. Cron Scheduler Implementation

```python
# cron_scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio

class CronScheduler:
    def __init__(self, task_queue):
        self.scheduler = AsyncIOScheduler()
        self.task_queue = task_queue
        
    def setup_jobs(self):
        """Configure scheduled jobs"""
        
        # Daily lead validation
        self.scheduler.add_job(
            self.validate_new_leads,
            'cron',
            hour=9,
            minute=0,
            id='daily_validation'
        )
        
        # Weekly report generation
        self.scheduler.add_job(
            self.generate_weekly_report,
            'cron',
            day_of_week='mon',
            hour=8,
            minute=0,
            id='weekly_report'
        )
        
        # Hourly pipeline check
        self.scheduler.add_job(
            self.check_pipeline_health,
            'cron',
            minute=0,
            id='hourly_pipeline_check'
        )
        
        # Follow-up reminders
        self.scheduler.add_job(
            self.send_followup_reminders,
            'cron',
            hour='9,14',  # 9am and 2pm
            minute=0,
            id='followup_reminders'
        )
    
    async def validate_new_leads(self):
        """Validate leads added in last 24 hours"""
        await self.task_queue.enqueue('validate_batch', {
            'segment': 'recent',
            'hours': 24
        }, priority='normal')
    
    async def check_pipeline_health(self):
        """Monitor pipeline and alert if low"""
        await self.task_queue.enqueue('pipeline_check', {
            'alert_threshold': 10,
            'auto_generate': True
        }, priority='high')
```

### 4. Monitoring & Logging Service

```python
# monitoring_service.py
from prometheus_client import Counter, Histogram, Gauge
import logging
from elasticsearch import Elasticsearch

class MonitoringService:
    def __init__(self):
        # Prometheus metrics
        self.api_requests = Counter('api_requests_total', 'Total API requests', ['endpoint', 'method'])
        self.api_latency = Histogram('api_latency_seconds', 'API latency', ['endpoint'])
        self.active_leads = Gauge('active_leads_total', 'Total active leads')
        self.task_queue_size = Gauge('task_queue_size', 'Tasks in queue', ['priority'])
        
        # Elasticsearch for logs
        self.es = Elasticsearch(['localhost:9200'])
        
        # Structured logging
        self.logger = self.setup_logger()
    
    def setup_logger(self):
        """Configure structured logging"""
        logger = logging.getLogger('pleasant_cove')
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        return logger
    
    def log_api_call(self, endpoint, method, duration, status_code):
        """Log API call metrics"""
        self.api_requests.labels(endpoint=endpoint, method=method).inc()
        self.api_latency.labels(endpoint=endpoint).observe(duration)
        
        # Send to Elasticsearch
        doc = {
            'timestamp': datetime.now(),
            'endpoint': endpoint,
            'method': method,
            'duration': duration,
            'status_code': status_code,
            'service': 'api_gateway'
        }
        self.es.index(index='api-logs', body=doc)
    
    def alert_on_error(self, error_type, message, context):
        """Send alerts for critical errors"""
        if error_type in ['task_failure', 'api_error', 'db_connection']:
            # Send to alerting system (PagerDuty, Slack, etc.)
            alert = {
                'severity': 'high',
                'type': error_type,
                'message': message,
                'context': context,
                'timestamp': datetime.now()
            }
            # ... send alert
```

### 5. WebSocket Server for Real-time Updates

```python
# websocket_server.py
import asyncio
import websockets
import json
from aioredis import create_redis_pool

class WebSocketServer:
    def __init__(self):
        self.clients = {}
        self.redis = None
        
    async def start(self):
        self.redis = await create_redis_pool('redis://localhost')
        
        # Subscribe to events
        channel = (await self.redis.subscribe('lead_updates', 'task_events'))[0]
        
        # Start WebSocket server
        await websockets.serve(self.handle_client, 'localhost', 8765)
        
        # Process Redis events
        await self.process_events(channel)
    
    async def handle_client(self, websocket, path):
        """Handle WebSocket connections"""
        client_id = str(uuid.uuid4())
        self.clients[client_id] = websocket
        
        try:
            async for message in websocket:
                data = json.loads(message)
                await self.handle_message(client_id, data)
        finally:
            del self.clients[client_id]
    
    async def broadcast_update(self, update_type, data):
        """Send updates to all connected clients"""
        message = json.dumps({
            'type': update_type,
            'data': data,
            'timestamp': datetime.now().isoformat()
        })
        
        # Send to all connected clients
        disconnected = []
        for client_id, ws in self.clients.items():
            try:
                await ws.send(message)
            except:
                disconnected.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected:
            del self.clients[client_id]
```

### 6. Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # API Gateway
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "5000:5000"
    environment:
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - auth-service
  
  # Auth Service
  auth-service:
    build: ./services/auth
    environment:
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
    depends_on:
      - redis
  
  # Control API
  control-api:
    build: ./services/control
    environment:
      - DATABASE_URL=/data/scraper_results.db
    volumes:
      - ./data:/data
    depends_on:
      - task-queue
      - analytics
      - decision
  
  # Task Queue Service
  task-queue:
    build: ./services/task-queue
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
  
  # Analytics Service
  analytics:
    build: ./services/analytics
    environment:
      - DATABASE_URL=/data/scraper_results.db
    volumes:
      - ./data:/data
  
  # Decision Service
  decision:
    build: ./services/decision
    volumes:
      - ./models:/models
  
  # Cron Scheduler
  scheduler:
    build: ./services/scheduler
    depends_on:
      - task-queue
  
  # WebSocket Server
  websocket:
    build: ./services/websocket
    ports:
      - "8765:8765"
    depends_on:
      - redis
  
  # Monitoring
  monitoring:
    build: ./services/monitoring
    ports:
      - "9090:9090"  # Prometheus
    depends_on:
      - elasticsearch
  
  # Redis
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
  
  # Elasticsearch
  elasticsearch:
    image: elasticsearch:7.17.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"
  
  # Minerva AI (external)
  minerva:
    image: minerva:latest
    ports:
      - "8000:8000"
    environment:
      - CONTROL_API_URL=http://api-gateway:5000
      - OPENAI_API_KEY=${OPENAI_API_KEY}
```

### 7. Database Read/Write Separation

```python
# db_manager.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

class DatabaseManager:
    def __init__(self):
        # Read replica for analytics
        self.read_engine = create_engine(
            'sqlite:///scrapers/scraper_results.db',
            connect_args={'check_same_thread': False}
        )
        
        # Write master
        self.write_engine = create_engine(
            'sqlite:///scrapers/scraper_results.db',
            connect_args={'check_same_thread': False}
        )
        
        self.ReadSession = sessionmaker(bind=self.read_engine)
        self.WriteSession = sessionmaker(bind=self.write_engine)
    
    def read_query(self, query):
        """Execute read-only queries"""
        with self.ReadSession() as session:
            return session.execute(query).fetchall()
    
    def write_operation(self, operation):
        """Execute write operations with transaction"""
        with self.WriteSession() as session:
            try:
                result = operation(session)
                session.commit()
                return result
            except Exception as e:
                session.rollback()
                raise e
```

## 🚀 Deployment Strategy

1. **Development**: Docker Compose for local testing
2. **Staging**: Kubernetes with Helm charts
3. **Production**: 
   - AWS ECS for services
   - RDS for PostgreSQL (replace SQLite)
   - ElastiCache for Redis
   - CloudWatch for monitoring

## 📊 Monitoring Dashboard

Create a Grafana dashboard showing:
- API request rates and latencies
- Task queue depths
- Lead conversion funnel
- Error rates by service
- Minerva AI decision metrics

This architecture provides:
- ✅ Scalability through microservices
- ✅ Security with auth gateway
- ✅ Real-time updates via WebSocket
- ✅ Comprehensive monitoring
- ✅ Clear separation of concerns
- ✅ Easy to extend and maintain 