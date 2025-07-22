#!/usr/bin/env python3
"""
Complete API Gateway with Circuit Breakers, Tracing, and Rate Limiting
The main entry point for all Pleasant Cove + Minerva services
"""

from flask import Flask, request, jsonify, make_response, g
from flask_cors import CORS
import os
import jwt
import logging
from functools import wraps
from datetime import datetime
import time

# Import our protection layers
from circuit_breakers import (
    breaker_service, 
    circuit_breaker_middleware,
    CircuitBreakerError
)
from distributed_tracing import APIGatewayTracing
from rate_limiter import RateLimiter, rate_limit_middleware, RateLimitConfig, RateLimitStrategy

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize protection layers
tracing = APIGatewayTracing()
tracing.initialize(
    jaeger_host=os.getenv("JAEGER_HOST", "localhost"),
    jaeger_port=int(os.getenv("JAEGER_PORT", 6831)),
    environment=os.getenv("ENVIRONMENT", "development")
)

# Initialize rate limiter
import redis
redis_client = redis.Redis(decode_responses=True)
rate_limiter = RateLimiter(redis_client, tracing)

# Custom rate limits for specific operations
rate_limiter.add_custom_limit('lead_generation', RateLimitConfig(
    name='lead_generation',
    max_requests=100,
    window_seconds=3600,
    strategy=RateLimitStrategy.TOKEN_BUCKET,
    burst_size=20
))

rate_limiter.add_custom_limit('proposal_send', RateLimitConfig(
    name='proposal_send',
    max_requests=50,
    window_seconds=3600,
    strategy=RateLimitStrategy.SLIDING_WINDOW
))

# Apply middleware in correct order
tracing.instrument_all(app=app)  # First: tracing
rate_limit_middleware(app, rate_limiter)  # Second: rate limiting
circuit_breaker_middleware(app)  # Third: circuit breakers

# JWT configuration
JWT_SECRET = os.getenv('JWT_SECRET_KEY', 'dev-secret-key')

class CompleteAPIGateway:
    """API Gateway with all protection layers"""
    
    def __init__(self):
        self.breaker_service = breaker_service
        self.rate_limiter = rate_limiter
        self.request_count = 0
        self.start_time = time.time()
    
    @tracing.trace_auth
    def authenticate(self, token):
        """Verify JWT token with tracing"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            return payload
        except jwt.InvalidTokenError:
            return None
    
    def get_auth_token(self, request):
        """Extract auth token from request"""
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            return auth_header.split(' ')[1]
        return None

gateway = CompleteAPIGateway()

# Enhanced authentication decorator
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        with tracing.trace_operation("auth.check_request"):
            token = gateway.get_auth_token(request)
            if not token:
                return jsonify({'error': 'No token provided'}), 401
            
            user = gateway.authenticate(token)
            if not user:
                return jsonify({'error': 'Invalid token'}), 401
            
            # Store user in g for rate limiting
            g.user = user
            request.user = user
            
            return f(*args, **kwargs)
    return decorated_function

# CORS proxy with all protections
@app.route('/cors-proxy/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
def cors_proxy(path):
    """Handle CORS for Squarespace widget with full protection"""
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    with tracing.trace_operation("cors_proxy", {"path": path}):
        try:
            # Rate limiting is already applied by middleware
            
            # Add trace context to outgoing request
            headers = dict(request.headers)
            tracing.inject_trace_context(headers)
            
            # Use circuit breaker protected call
            result = gateway.breaker_service.call_with_fallback(
                'control',
                gateway.breaker_service.call_control_api,
                path,
                request.method,
                json=request.get_json(silent=True),
                headers=headers
            )
            
            response = jsonify(result)
            response.headers['Access-Control-Allow-Origin'] = '*'
            
            # Add trace ID to response
            trace_id = tracing.get_current_trace_id()
            if trace_id:
                response.headers['X-Trace-ID'] = trace_id
            
            return response
            
        except CircuitBreakerError:
            logger.warning(f"Circuit breaker OPEN for path: {path}")
            return jsonify({
                'error': 'Service temporarily unavailable',
                'retry_after': 30,
                'trace_id': tracing.get_current_trace_id()
            }), 503
        except Exception as e:
            logger.error(f"Error in cors_proxy: {e}")
            return jsonify({
                'error': str(e),
                'trace_id': tracing.get_current_trace_id()
            }), 502

# Lead generation with custom rate limit
@app.route('/api/leads/generate', methods=['POST'])
@require_auth
def generate_leads():
    """Generate leads with custom rate limiting"""
    # Check custom rate limit
    identifier = f"user:{request.user['id']}"
    allowed, info = gateway.rate_limiter.check_rate_limit(identifier, 'lead_generation')
    
    if not allowed:
        return jsonify({
            'error': 'Lead generation rate limit exceeded',
            'retry_after': info.get('retry_after', 3600),
            'limit_info': info
        }), 429
    
    with tracing.trace_operation("leads.generate"):
        try:
            # Your lead generation logic here
            data = request.get_json()
            
            # Use circuit breaker for external API calls
            result = gateway.breaker_service.call_with_fallback(
                'lead_api',
                lambda: {"leads": [], "source": "fallback"},  # Fallback
                data
            )
            
            return jsonify({
                'status': 'success',
                'leads': result.get('leads', []),
                'remaining_quota': info.get('remaining', 0)
            })
            
        except Exception as e:
            logger.error(f"Lead generation error: {e}")
            return jsonify({'error': 'Internal server error'}), 500

# Proposal sending with rate limit
@app.route('/api/proposals/send', methods=['POST'])
@require_auth
def send_proposal():
    """Send proposal with rate limiting"""
    identifier = f"user:{request.user['id']}"
    allowed, info = gateway.rate_limiter.check_rate_limit(identifier, 'proposal_send')
    
    if not allowed:
        return jsonify({
            'error': 'Proposal sending rate limit exceeded',
            'retry_after': info.get('retry_after', 3600),
            'daily_limit': 50
        }), 429
    
    with tracing.trace_operation("proposals.send"):
        # Proposal sending logic
        return jsonify({
            'status': 'sent',
            'proposals_remaining_today': info.get('remaining', 0)
        })

# Minerva chat with burst protection
@app.route('/api/minerva/chat', methods=['POST'])
@require_auth
def minerva_chat():
    """Minerva chat with token bucket rate limiting"""
    # Rate limiting already applied by middleware
    data = request.get_json()
    
    with tracing.trace_operation("proxy.minerva_chat", {
        "session_id": data.get('session_id', 'unknown'),
        "message_length": len(data.get('message', ''))
    }):
        try:
            # Add baggage for conversation tracking
            tracing.add_baggage("user.id", str(request.user.get('id', 'anonymous')))
            tracing.add_baggage("session.id", data.get('session_id', 'default'))
            
            result = gateway.breaker_service.call_with_fallback(
                'minerva',
                gateway.breaker_service.call_minerva,
                data.get('message', ''),
                data.get('session_id', f"user_{request.user['id']}"),
                data.get('context', {})
            )
            
            # Add rate limit info to response
            result['rate_limit'] = g.get('rate_limit_info', {})
            result['trace_id'] = tracing.get_current_trace_id()
            
            return jsonify(result)
        except Exception as e:
            logger.error(f"Minerva error: {e}")
            return jsonify({
                'error': 'AI assistant temporarily unavailable',
                'trace_id': tracing.get_current_trace_id()
            }), 500

# Admin endpoints for rate limit management
@app.route('/api/admin/rate-limits/<identifier>', methods=['GET'])
@require_auth
def get_rate_limit_status(identifier):
    """Get rate limit status for an identifier"""
    if not request.user.get('is_admin'):
        return jsonify({'error': 'Admin access required'}), 403
    
    configs = request.args.getlist('configs') or ['api_default']
    
    status = {}
    for config_name in configs:
        info = gateway.rate_limiter.get_limit_info(identifier, config_name)
        status[config_name] = info
    
    return jsonify(status)

@app.route('/api/admin/rate-limits/<identifier>/reset', methods=['POST'])
@require_auth
def reset_rate_limit(identifier):
    """Reset rate limit for an identifier"""
    if not request.user.get('is_admin'):
        return jsonify({'error': 'Admin access required'}), 403
    
    config_name = request.json.get('config')
    gateway.rate_limiter.reset_limit(identifier, config_name)
    
    return jsonify({
        'status': 'reset',
        'identifier': identifier,
        'config': config_name or 'all'
    })

# Health check with all systems
@app.route('/health', methods=['GET'])
def health_check():
    """Comprehensive health check"""
    with tracing.trace_operation("health.check"):
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
        
        # Get rate limiter metrics
        rate_limit_metrics = gateway.rate_limiter.get_metrics()
        
        return jsonify({
            'status': 'healthy' if redis_healthy else 'degraded',
            'uptime_seconds': round(uptime, 2),
            'request_count': gateway.request_count,
            'systems': {
                'redis': 'healthy' if redis_healthy else 'unhealthy',
                'circuit_breakers': breaker_states,
                'rate_limiter': {
                    'total_checks': rate_limit_metrics['metrics']['total_checks'],
                    'limited_requests': rate_limit_metrics['metrics']['limited']
                }
            },
            'trace_id': tracing.get_current_trace_id()
        })

# Metrics endpoint
@app.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus-style metrics with all systems"""
    metrics_text = []
    
    # Request metrics
    metrics_text.append(f'# HELP api_gateway_requests_total Total requests')
    metrics_text.append(f'# TYPE api_gateway_requests_total counter')
    metrics_text.append(f'api_gateway_requests_total {gateway.request_count}')
    
    # Circuit breaker metrics
    for service_name, breaker in gateway.breaker_service.breakers.items():
        state_value = {'closed': 0, 'open': 1, 'half_open': 0.5}.get(breaker.state.name, -1)
        
        metrics_text.append(f'# HELP circuit_breaker_state State of circuit breaker')
        metrics_text.append(f'# TYPE circuit_breaker_state gauge')
        metrics_text.append(f'circuit_breaker_state{{service="{service_name}"}} {state_value}')
        
        metrics_text.append(f'# HELP circuit_breaker_failures_total Total failures')
        metrics_text.append(f'# TYPE circuit_breaker_failures_total counter')
        metrics_text.append(f'circuit_breaker_failures_total{{service="{service_name}"}} {breaker.fail_counter}')
    
    # Rate limiter metrics
    rl_metrics = gateway.rate_limiter.get_metrics()['metrics']
    
    metrics_text.append(f'# HELP rate_limit_checks_total Total rate limit checks')
    metrics_text.append(f'# TYPE rate_limit_checks_total counter')
    metrics_text.append(f'rate_limit_checks_total {rl_metrics["total_checks"]}')
    
    metrics_text.append(f'# HELP rate_limit_allowed_total Requests allowed')
    metrics_text.append(f'# TYPE rate_limit_allowed_total counter')
    metrics_text.append(f'rate_limit_allowed_total {rl_metrics["allowed"]}')
    
    metrics_text.append(f'# HELP rate_limit_denied_total Requests denied')
    metrics_text.append(f'# TYPE rate_limit_denied_total counter')
    metrics_text.append(f'rate_limit_denied_total {rl_metrics["limited"]}')
    
    return '\n'.join(metrics_text), 200, {'Content-Type': 'text/plain'}

# Request tracking
@app.before_request
def before_request():
    """Track request metrics and add trace context"""
    gateway.request_count += 1
    request.start_time = time.time()
    request.trace_id = tracing.get_current_trace_id()

@app.after_request
def after_request(response):
    """Log request duration and add headers"""
    if hasattr(request, 'start_time'):
        duration = time.time() - request.start_time
        trace_id = getattr(request, 'trace_id', 'no-trace')
        
        # Log with trace ID
        logger.info(
            f"{request.method} {request.path} - "
            f"{response.status_code} - {duration:.3f}s - "
            f"trace_id={trace_id}"
        )
    
    # Add trace ID to response
    if hasattr(request, 'trace_id') and request.trace_id:
        response.headers['X-Trace-ID'] = request.trace_id
    
    return response

# Error handlers
@app.errorhandler(429)
def rate_limit_handler(e):
    """Enhanced rate limit error response"""
    return jsonify({
        'error': 'Too many requests',
        'message': 'You have exceeded the rate limit. Please slow down.',
        'trace_id': tracing.get_current_trace_id()
    }), 429

@app.errorhandler(503)
def service_unavailable_handler(e):
    """Service unavailable error response"""
    return jsonify({
        'error': 'Service temporarily unavailable',
        'message': 'Please try again later.',
        'trace_id': tracing.get_current_trace_id()
    }), 503

if __name__ == '__main__':
    port = int(os.getenv('GATEWAY_PORT', 5000))
    
    logger.info("🚀 Starting Complete API Gateway")
    logger.info("✅ Circuit Breakers: Active")
    logger.info("✅ Distributed Tracing: Active")
    logger.info("✅ Rate Limiting: Active")
    logger.info(f"📊 Metrics: http://localhost:{port}/metrics")
    logger.info(f"🏥 Health: http://localhost:{port}/health")
    logger.info(f"🔍 Jaeger UI: http://localhost:16686")
    
    app.run(host='0.0.0.0', port=port, debug=True) 