# Distributed Tracing Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# In your virtual environment
source venv/bin/activate
python3 -m pip install -r requirements-tracing.txt
```

### 2. Start Infrastructure (Jaeger + Redis)

```bash
# Start Jaeger, Redis, and optional monitoring stack
docker-compose -f docker-compose.jaeger.yml up -d

# Verify services are running
docker ps
```

### 3. Start the Traced API Gateway

```bash
# Uses both circuit breakers and tracing
python api_gateway_with_tracing.py
```

### 4. Test Distributed Tracing

```bash
# Run the test suite
python test_distributed_tracing.py
```

### 5. View Traces in Jaeger

Open http://localhost:16686 in your browser:
1. Select "api-gateway" from the Service dropdown
2. Click "Find Traces"
3. Click on any trace to see the detailed timeline

## 📊 What You Can See in Traces

### Request Flow Visualization
- See the complete request path through your system
- Identify which service is slow or failing
- View parallel vs sequential operations

### Circuit Breaker Behavior
- When circuits open/close
- Fallback responses
- Failed request patterns

### Performance Metrics
- Request duration breakdowns
- Database query times
- External API call latencies

## 🔍 Useful Jaeger Queries

### Find Slow Requests
```
Service: api-gateway
Min Duration: 1s
```

### Find Failed Requests
```
Service: api-gateway
Tags: error=true
```

### Find Circuit Breaker Opens
```
Service: api-gateway
Operation: circuit_breaker.ControlAPI
Tags: circuit_breaker.opened=true
```

### Find Specific User's Requests
```
Service: api-gateway
Tags: user.id=123
```

## 🏗️ Adding Tracing to Other Services

### Control API Service
```python
from distributed_tracing import DistributedTracing

# Initialize tracing
tracing = DistributedTracing("control-api", "1.0.0")
tracing.initialize()
tracing.instrument_all(app=app, db_engine=engine)

# Trace custom operations
with tracing.trace_operation("lead.validation", {"lead_id": lead_id}):
    validate_lead(lead_id)
```

### Task Queue Service
```python
from distributed_tracing import DistributedTracing

tracing = DistributedTracing("task-queue", "1.0.0")
tracing.initialize()

# Extract trace context from message
@tracing.trace_function
def process_task(task):
    # Trace context automatically propagated
    return execute_task(task)
```

### Minerva AI Service
```python
from distributed_tracing import MinervaTracing

tracing = MinervaTracing()
tracing.initialize()

@tracing.trace_ai_operation("chat")
def process_chat_message(message, context):
    # AI operations traced with token usage
    return generate_response(message, context)
```

## 📈 Monitoring & Alerting

### Grafana Dashboard (Optional)
Access at http://localhost:3000 (admin/admin)

Create panels for:
- Request rate by service
- Error rate by endpoint
- P95 latency trends
- Circuit breaker state changes

### Prometheus Queries
```promql
# Request rate
rate(http_server_duration_count[5m])

# Error rate
rate(http_server_duration_count{http_status_code=~"5.."}[5m])

# Circuit breaker opens
increase(circuit_breaker_state{state="open"}[1h])
```

## 🎯 Best Practices

### 1. Meaningful Span Names
```python
# Good
with tracing.trace_operation("database.query.get_lead_by_id"):
    
# Bad
with tracing.trace_operation("query"):
```

### 2. Add Context with Attributes
```python
span.set_attribute("lead.id", lead_id)
span.set_attribute("lead.status", status)
span.set_attribute("validation.result", "valid")
```

### 3. Trace Business Operations
```python
with tracing.trace_operation("business.send_proposal", {
    "lead_id": lead_id,
    "template": template_name,
    "value": proposal_value
}):
    send_proposal()
```

### 4. Use Baggage for Cross-Service Context
```python
# Set in gateway
tracing.add_baggage("request.type", "lead_generation")
tracing.add_baggage("user.tier", "premium")

# Automatically available in all downstream services
```

## 🚨 Troubleshooting

### No Traces Appearing
1. Check Jaeger is running: `docker ps`
2. Verify agent port 6831 is accessible
3. Check logs for export errors
4. Ensure service name is set correctly

### Missing Spans
1. Verify instrumentation is applied
2. Check excluded URLs configuration
3. Ensure trace context propagation headers

### Performance Impact
- Batch span export reduces overhead
- Sample traces in production (e.g., 10%)
- Use head-based sampling for consistency

## 🔗 Integration with Circuit Breakers

The `TracedCircuitBreaker` class automatically adds circuit breaker state to traces:

```python
# In your traces, you'll see:
- circuit_breaker.name: "ControlAPI"
- circuit_breaker.state: "open"
- circuit_breaker.fail_counter: 5
- circuit_breaker.opened: true
```

This helps correlate failures with circuit breaker behavior!

## 📚 Next Steps

1. **Add Custom Spans**: Trace your business logic
2. **Set Up Sampling**: Configure trace sampling for production
3. **Create Alerts**: Alert on high error rates or latencies
4. **Add More Services**: Instrument all your microservices
5. **Correlate Logs**: Add trace IDs to all log messages

With distributed tracing, you now have complete visibility into every request flowing through your system! 🔍 