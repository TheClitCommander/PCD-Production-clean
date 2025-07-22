# Circuit Breaker Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# In your virtual environment
source venv/bin/activate
python3 -m pip install -r requirements-circuit-breaker.txt
```

### 2. Start Redis (Required for Circuit Breaker Events)

```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or using Homebrew
brew install redis
brew services start redis
```

### 3. Start the API Gateway

```bash
python api_gateway_with_breakers.py
```

### 4. Test Circuit Breakers

```bash
# In another terminal
python test_circuit_breakers.py
```

## 📊 Monitoring Endpoints

Once running, you can monitor your circuit breakers:

- **Circuit Breaker Status**: http://localhost:5000/health/circuit-breakers
- **Dependency Health**: http://localhost:5000/health/dependencies
- **Prometheus Metrics**: http://localhost:5000/metrics

## 🧪 Testing Circuit Breakers

### Manual Testing

1. **Force a Circuit to Open**:
```bash
# Stop your Control API service, then make requests
curl http://localhost:5000/api/control/analytics

# After 5 failures, you'll get:
# {"error": "Service temporarily unavailable", "retry_after": 30}
```

2. **Check Circuit Status**:
```bash
curl http://localhost:5000/health/circuit-breakers | jq
```

3. **Watch Circuit Recovery**:
```bash
# Circuit will enter half-open state after 30 seconds
# Next successful request will close the circuit
```

## 🔧 Configuration

Edit `circuit_breakers.py` to adjust:

```python
control_api_breaker = CircuitBreaker(
    fail_max=5,        # Failures before opening
    reset_timeout=30,  # Seconds before trying half-open
    name='ControlAPI'
)
```

## 📈 Grafana Dashboard

Create alerts for circuit breaker states:

```promql
# Alert when circuit opens
circuit_breaker_state{service="ControlAPI"} == 1

# High failure rate
rate(circuit_breaker_failures_total[5m]) > 0.1
```

## 🎯 Benefits

1. **Prevents Cascade Failures**: Stops hammering failing services
2. **Graceful Degradation**: Returns cached/fallback responses
3. **Automatic Recovery**: Self-heals when service recovers
4. **Observable**: Full metrics and monitoring

## 🚨 Troubleshooting

### Circuit Won't Open
- Check Redis is running: `redis-cli ping`
- Verify fail_max threshold
- Check timeout settings

### Circuit Won't Close
- Ensure downstream service is actually healthy
- Check reset_timeout isn't too short
- Verify half-open test succeeds

### No Metrics
- Ensure Redis connection works
- Check Flask app is using circuit_breaker_middleware
- Verify /metrics endpoint is accessible 