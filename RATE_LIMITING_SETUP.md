# Rate Limiting Setup Guide

## 🚀 Quick Start

### 1. Prerequisites

Ensure you have the complete stack running:
```bash
# Redis (required)
docker-compose -f docker-compose.jaeger.yml up -d

# Check Redis is running
redis-cli ping
```

### 2. Start the Complete API Gateway

```bash
# Run the gateway with all protection layers
python api_gateway_complete.py
```

### 3. Test Rate Limiting

```bash
# Run the test suite
python test_rate_limiting.py
```

## 🛡️ Rate Limiting Strategies

### 1. **Sliding Window** (Default)
- Most accurate rate limiting
- Counts requests in a rolling time window
- Good for general API protection

```python
RateLimitConfig('api_default', max_requests=100, window_seconds=60)
```

### 2. **Token Bucket**
- Allows burst traffic
- Tokens refill at steady rate
- Perfect for chat/AI endpoints

```python
RateLimitConfig('minerva_chat', max_requests=20, window_seconds=60, 
                strategy=RateLimitStrategy.TOKEN_BUCKET, burst_size=5)
```

### 3. **Fixed Window**
- Simple counter reset at intervals
- Less accurate but very fast
- Good for high-volume endpoints

### 4. **Leaky Bucket**
- Smooths out traffic spikes
- Processes at constant rate
- Good for backend protection

### 5. **Adaptive**
- Adjusts limits based on system load
- Reduces limits under stress
- Increases limits when idle

## 📊 Default Rate Limits

| Endpoint | Strategy | Limit | Window | Burst |
|----------|----------|-------|--------|-------|
| API Default | Sliding Window | 100 req | 60s | - |
| Authentication | Sliding Window | 10 req | 60s | - |
| Heavy Operations | Sliding Window | 10 req | 300s | - |
| Minerva Chat | Token Bucket | 20 req | 60s | 5 |
| Minerva Analysis | Token Bucket | 5 req | 300s | 2 |
| SMS Sending | Sliding Window | 50 req | 3600s | - |
| Email Sending | Sliding Window | 100 req | 3600s | - |
| Lead Generation | Token Bucket | 100 req | 3600s | 20 |
| Proposal Sending | Sliding Window | 50 req | 3600s | - |

## 🔧 Configuration

### Custom Rate Limits

```python
# Add custom limit for specific operation
rate_limiter.add_custom_limit('api_heavy_compute', RateLimitConfig(
    name='api_heavy_compute',
    max_requests=5,
    window_seconds=300,
    strategy=RateLimitStrategy.TOKEN_BUCKET,
    burst_size=2,
    cost_per_request=5  # Each request costs 5 tokens
))
```

### Per-User Limits

```python
# Premium users get higher limits
rate_limiter.add_custom_limit('user_premium', RateLimitConfig(
    name='user_premium',
    max_requests=5000,
    window_seconds=3600
))

# Free users get standard limits
rate_limiter.add_custom_limit('user_free', RateLimitConfig(
    name='user_free',
    max_requests=1000,
    window_seconds=3600
))
```

### Whitelist/Blacklist

```python
# Whitelist trusted IPs (no rate limit)
redis_client.sadd('whitelist:global', '192.168.1.100')

# Blacklist abusive IPs
redis_client.sadd('blacklist:global', '10.0.0.50')

# Or configure per limit
config = RateLimitConfig(
    name='special',
    max_requests=100,
    window_seconds=60,
    whitelist=['trusted-api-key-1', 'trusted-api-key-2'],
    blacklist=['banned-user-1']
)
```

## 📡 Client Integration

### Response Headers

All responses include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1648394400
```

When rate limited:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 58
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1648394400

{
    "error": "Rate limit exceeded",
    "retry_after": 58
}
```

### Client Best Practices

```javascript
// JavaScript client example
async function apiCall(endpoint, data) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    
    // Check rate limit headers
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    
    if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        console.log(`Rate limited. Retry after ${retryAfter} seconds`);
        
        // Implement exponential backoff
        await sleep(retryAfter * 1000);
        return apiCall(endpoint, data); // Retry
    }
    
    // Warn if approaching limit
    if (remaining < 10) {
        console.warn(`Only ${remaining} requests remaining until ${new Date(reset * 1000)}`);
    }
    
    return response.json();
}
```

## 🔍 Monitoring Rate Limits

### Prometheus Metrics

```promql
# Request rate by result
rate(rate_limit_checks_total[5m])

# Percentage of requests rate limited
rate(rate_limit_denied_total[5m]) / rate(rate_limit_checks_total[5m])

# Requests remaining for specific config
rate_limit_remaining{config="api_default"}
```

### Admin Endpoints

```bash
# Check rate limit status for user
curl http://localhost:5000/api/admin/rate-limits/user:123 \
  -H "Authorization: Bearer admin-token"

# Reset rate limit
curl -X POST http://localhost:5000/api/admin/rate-limits/user:123/reset \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{"config": "api_default"}'
```

### Redis Commands

```bash
# View all rate limit keys
redis-cli --scan --pattern "rl:*"

# Check specific user's limit
redis-cli ZCARD "rl:sliding:api_default:user:123"

# Manual reset
redis-cli DEL "rl:sliding:api_default:user:123"
```

## 🎯 Use Cases

### 1. **Protect Against Abuse**
```python
# Strict limits for authentication
RateLimitConfig('auth_login', max_requests=5, window_seconds=300)
```

### 2. **Fair Resource Usage**
```python
# Token bucket for AI operations
RateLimitConfig('ai_operations', max_requests=100, window_seconds=3600,
                strategy=RateLimitStrategy.TOKEN_BUCKET, burst_size=10)
```

### 3. **Cost Control**
```python
# Limit expensive operations
RateLimitConfig('expensive_api', max_requests=10, window_seconds=3600,
                cost_per_request=10)  # Each request costs 10 tokens
```

### 4. **Tiered Service Levels**
```python
# Different limits by subscription
configs = {
    'tier_free': RateLimitConfig('tier_free', 100, 3600),
    'tier_pro': RateLimitConfig('tier_pro', 1000, 3600),
    'tier_enterprise': RateLimitConfig('tier_enterprise', 10000, 3600)
}
```

## 🚨 Troubleshooting

### Common Issues

1. **"Too Many Requests" errors**
   - Check current limits: `curl /api/admin/rate-limits/[identifier]`
   - Verify correct identifier is being used
   - Consider increasing limits or using token bucket

2. **Limits not resetting**
   - Check Redis connectivity
   - Verify TTL on keys: `redis-cli TTL "rl:sliding:..."`
   - Ensure system time is synchronized

3. **Performance degradation**
   - Use fixed window for high-volume endpoints
   - Consider Redis cluster for scale
   - Enable Redis persistence

### Debug Mode

```python
# Enable debug logging
import logging
logging.getLogger('rate_limiter').setLevel(logging.DEBUG)

# Test specific identifier
allowed, info = rate_limiter.check_rate_limit('test-user', 'api_default')
print(f"Allowed: {allowed}, Info: {info}")
```

## 📚 Advanced Features

### Distributed Rate Limiting

For multi-instance deployments:
```python
# Use Redis with Lua scripts for atomic operations
# All instances share the same Redis = consistent limits
```

### Cost-Based Limiting

```python
# Different operations cost different amounts
rate_limiter.check_rate_limit(user_id, 'api_default', cost=5)  # Expensive operation
rate_limiter.check_rate_limit(user_id, 'api_default', cost=1)  # Cheap operation
```

### Dynamic Limits

```python
# Adjust limits based on time of day
if datetime.now().hour < 9 or datetime.now().hour > 17:
    # Increase limits during off-peak
    rate_limiter.update_limit('api_default', max_requests=200)
```

## 🎉 Complete Protection Stack

With Rate Limiting added to Circuit Breakers + Tracing + DLQ, you now have:

1. **Circuit Breakers** - Protect against cascading failures
2. **Distributed Tracing** - See everything happening
3. **Dead Letter Queue** - Never lose a task
4. **Rate Limiting** - Prevent abuse and ensure fairness

Your API is now production-ready with enterprise-grade protection! 🚀 