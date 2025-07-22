#!/usr/bin/env python3
"""
Minimal API Gateway with Circuit Breakers and Rate Limiting
Works without OpenTelemetry dependencies
"""

from flask import Flask, request, jsonify, make_response, g
from flask_cors import CORS
import os
import jwt
import logging
from functools import wraps
import time
import redis

# Import our protection layers
from circuit_breakers_minimal import breaker_service, circuit_breaker_middleware, CircuitBreakerError
from rate_limiter_minimal import RateLimiter, rate_limit_middleware

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize rate limiter
redis_client = redis.Redis(decode_responses=True)
rate_limiter = RateLimiter(redis_client)

# Apply middleware
rate_limit_middleware(app, rate_limiter)
circuit_breaker_middleware(app)

# JWT configuration
JWT_SECRET = os.getenv('JWT_SECRET_KEY', 'dev-secret-key')

class MinimalGateway:
    """Minimal API Gateway"""
    
    def __init__(self):
        self.breaker_service = breaker_service
        self.rate_limiter = rate_limiter
        self.request_count = 0
        self.start_time = time.time()
    
    def authenticate(self, token):
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            return payload
        except jwt.InvalidTokenError:
            return None

gateway = MinimalGateway()

# Basic endpoints
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    uptime = time.time() - gateway.start_time
    
    # Check Redis
    try:
        redis_client.ping()
        redis_healthy = True
    except:
        redis_healthy = False
    
    # Get circuit breaker states
    breaker_states = {}
    for name, breaker in gateway.breaker_service.breakers.items():
        breaker_states[name] = {
            'state': breaker.state.name,
            'fail_counter': breaker.fail_counter
        }
    
    return jsonify({
        'status': 'healthy' if redis_healthy else 'degraded',
        'uptime_seconds': round(uptime, 2),
        'request_count': gateway.request_count,
        'systems': {
            'redis': 'healthy' if redis_healthy else 'unhealthy',
            'circuit_breakers': breaker_states,
            'rate_limiter': {
                'total_checks': gateway.rate_limiter.metrics['total_checks'],
                'limited_requests': gateway.rate_limiter.metrics['limited']
            }
        }
    })

@app.route('/api/test', methods=['GET', 'POST'])
def test_endpoint():
    """Test endpoint for protection layers"""
    return jsonify({
        'message': 'Protection layers active',
        'timestamp': time.time(),
        'rate_limit_info': getattr(g, 'rate_limit_info', {})
    })

# CORS proxy for testing
@app.route('/cors-proxy/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
def cors_proxy(path):
    """Simple CORS proxy"""
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    try:
        # For testing, just echo back
        return jsonify({
            'path': path,
            'method': request.method,
            'data': request.get_json(silent=True),
            'protection': 'active'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Request tracking
@app.before_request
def before_request():
    gateway.request_count += 1

# Error handlers
@app.errorhandler(429)
def rate_limit_handler(e):
    return jsonify({
        'error': 'Too many requests',
        'message': 'Rate limit exceeded'
    }), 429

@app.errorhandler(503)
def service_unavailable_handler(e):
    return jsonify({
        'error': 'Service temporarily unavailable',
        'message': 'Circuit breaker open'
    }), 503

if __name__ == '__main__':
    port = int(os.getenv('GATEWAY_PORT', 8001))
    
    logger.info("🚀 Starting Minimal API Gateway")
    logger.info("✅ Circuit Breakers: Active")
    logger.info("✅ Rate Limiting: Active")
    logger.info("❌ Distributed Tracing: Disabled (no dependencies)")
    logger.info(f"📊 Health: http://localhost:{port}/health")
    
    app.run(host='0.0.0.0', port=port, debug=True) 