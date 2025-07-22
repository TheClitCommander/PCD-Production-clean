#!/usr/bin/env python3
"""
API Gateway with Circuit Breaker Protection and Distributed Tracing
Main entry point for all Pleasant Cove + Minerva services
"""

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import os
import jwt
import logging
from functools import wraps
from datetime import datetime
import time

# Import our circuit breaker implementation
from circuit_breakers import (
    breaker_service, 
    circuit_breaker_middleware,
    CircuitBreakerError,
    TracedCircuitBreaker
)

# Import distributed tracing
from distributed_tracing import APIGatewayTracing

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize distributed tracing
tracing = APIGatewayTracing()
tracing.initialize(
    jaeger_host=os.getenv("JAEGER_HOST", "localhost"),
    jaeger_port=int(os.getenv("JAEGER_PORT", 6831)),
    environment=os.getenv("ENVIRONMENT", "development")
)

# Instrument the application
tracing.instrument_all(app=app)

# Apply circuit breaker middleware
circuit_breaker_middleware(app)

# JWT configuration
JWT_SECRET = os.getenv('JWT_SECRET_KEY', 'dev-secret-key')

class TracedAPIGateway:
    """Main API Gateway with circuit breaker and tracing"""
    
    def __init__(self):
        self.breaker_service = breaker_service
        self.request_count = 0
        self.start_time = time.time()
        
        # Wrap circuit breakers with tracing
        for name, breaker in self.breaker_service.breakers.items():
            self.breaker_service.breakers[name] = TracedCircuitBreaker(breaker, tracing)
    
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

gateway = TracedAPIGateway()

# Authentication decorator with tracing
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
            
            request.user = user
            return f(*args, **kwargs)
    return decorated_function

# CORS proxy for Squarespace with tracing
@app.route('/cors-proxy/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
def cors_proxy(path):
    """Handle CORS for Squarespace widget with circuit breaker and tracing"""
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    with tracing.trace_operation("cors_proxy", {"path": path}):
        try:
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
            # Circuit is open
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

# Main API routes with circuit breaker and tracing
@app.route('/api/control/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
@require_auth
def control_api_proxy(path):
    """Proxy requests to Control API with circuit breaker and tracing"""
    with tracing.trace_operation("proxy.control_api", {"path": path, "method": request.method}):
        try:
            # Propagate trace context
            headers = {}
            tracing.inject_trace_context(headers)
            
            result = gateway.breaker_service.call_with_fallback(
                'control',
                gateway.breaker_service.call_control_api,
                path,
                request.method,
                json=request.get_json(silent=True),
                headers=headers
            )
            return jsonify(result)
        except Exception as e:
            logger.error(f"Control API error: {e}")
            return jsonify({
                'error': 'Internal server error',
                'trace_id': tracing.get_current_trace_id()
            }), 500

@app.route('/api/analytics/<path:path>', methods=['GET'])
@require_auth
def analytics_proxy(path):
    """Proxy requests to Analytics service with circuit breaker and tracing"""
    with tracing.trace_operation("proxy.analytics", {"path": path}):
        try:
            # Propagate trace context
            headers = {}
            tracing.inject_trace_context(headers)
            
            result = gateway.breaker_service.call_with_fallback(
                'analytics',
                gateway.breaker_service.call_analytics,
                path,
                params=request.args.to_dict(),
                headers=headers
            )
            return jsonify(result)
        except Exception as e:
            logger.error(f"Analytics error: {e}")
            return jsonify({
                'error': 'Internal server error',
                'trace_id': tracing.get_current_trace_id()
            }), 500

@app.route('/api/minerva/chat', methods=['POST'])
@require_auth
def minerva_chat():
    """Proxy chat requests to Minerva with circuit breaker and tracing"""
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
            
            # Add trace ID to response for correlation
            result['trace_id'] = tracing.get_current_trace_id()
            
            return jsonify(result)
        except Exception as e:
            logger.error(f"Minerva error: {e}")
            return jsonify({
                'error': 'AI assistant temporarily unavailable',
                'trace_id': tracing.get_current_trace_id()
            }), 500

# Health check endpoints with tracing
@app.route('/health', methods=['GET'])
def health_check():
    """Basic health check"""
    with tracing.trace_operation("health.basic"):
        uptime = time.time() - gateway.start_time
        return jsonify({
            'status': 'healthy',
            'uptime_seconds': round(uptime, 2),
            'request_count': gateway.request_count,
            'trace_id': tracing.get_current_trace_id()
        })

@app.route('/health/dependencies', methods=['GET'])
def dependency_health():
    """Check health of all dependencies with circuit breakers"""
    with tracing.trace_operation("health.dependencies"):
        dependencies = {}
        
        # Check each service
        for service_name, breaker in gateway.breaker_service.breakers.items():
            dependencies[service_name] = {
                'circuit_state': breaker.state.name,
                'healthy': breaker.state.name != 'open'
            }
        
        # Overall health
        all_healthy = all(dep['healthy'] for dep in dependencies.values())
        
        return jsonify({
            'overall_health': 'healthy' if all_healthy else 'degraded',
            'dependencies': dependencies,
            'trace_id': tracing.get_current_trace_id()
        }), 200 if all_healthy else 503

# Metrics endpoint with trace information
@app.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus-style metrics including circuit breaker and trace stats"""
    metrics_text = []
    
    # Request metrics
    metrics_text.append(f'# HELP api_gateway_requests_total Total requests')
    metrics_text.append(f'# TYPE api_gateway_requests_total counter')
    metrics_text.append(f'api_gateway_requests_total {gateway.request_count}')
    
    # Circuit breaker metrics
    for service_name, breaker in gateway.breaker_service.breakers.items():
        state_value = {'closed': 0, 'open': 1, 'half_open': 0.5}.get(breaker.state.name, -1)
        
        metrics_text.append(f'# HELP circuit_breaker_state State of circuit breaker (0=closed, 1=open, 0.5=half_open)')
        metrics_text.append(f'# TYPE circuit_breaker_state gauge')
        metrics_text.append(f'circuit_breaker_state{{service="{service_name}"}} {state_value}')
        
        metrics_text.append(f'# HELP circuit_breaker_failures_total Total failures')
        metrics_text.append(f'# TYPE circuit_breaker_failures_total counter')
        metrics_text.append(f'circuit_breaker_failures_total{{service="{service_name}"}} {breaker.fail_counter}')
    
    # Add trace metrics if available
    current_trace_id = tracing.get_current_trace_id()
    if current_trace_id:
        metrics_text.append(f'# HELP current_trace_id Current trace ID')
        metrics_text.append(f'# TYPE current_trace_id info')
        metrics_text.append(f'current_trace_id{{trace_id="{current_trace_id}"}} 1')
    
    return '\n'.join(metrics_text), 200, {'Content-Type': 'text/plain'}

# Request tracking middleware with tracing
@app.before_request
def before_request():
    """Track request metrics and add trace context"""
    gateway.request_count += 1
    request.start_time = time.time()
    
    # Add trace ID to request context
    request.trace_id = tracing.get_current_trace_id()

@app.after_request
def after_request(response):
    """Log request duration with trace ID"""
    if hasattr(request, 'start_time'):
        duration = time.time() - request.start_time
        trace_id = getattr(request, 'trace_id', 'no-trace')
        logger.info(f"{request.method} {request.path} - {response.status_code} - {duration:.3f}s - trace_id={trace_id}")
    
    # Add trace ID to response headers
    if hasattr(request, 'trace_id') and request.trace_id:
        response.headers['X-Trace-ID'] = request.trace_id
    
    return response

# Error handlers with tracing
@app.errorhandler(404)
def not_found(e):
    with tracing.trace_operation("error.404", {"path": request.path}):
        return jsonify({
            'error': 'Endpoint not found',
            'trace_id': tracing.get_current_trace_id()
        }), 404

@app.errorhandler(500)
def internal_error(e):
    with tracing.trace_operation("error.500", {"error": str(e)}):
        logger.error(f"Internal error: {e}")
        return jsonify({
            'error': 'Internal server error',
            'trace_id': tracing.get_current_trace_id()
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('GATEWAY_PORT', 5000))
    
    logger.info("🚀 Starting API Gateway with Circuit Breaker Protection and Distributed Tracing")
    logger.info(f"📊 Circuit breaker status: http://localhost:{port}/health/circuit-breakers")
    logger.info(f"🔍 Tracing enabled for service: api-gateway")
    logger.info(f"📈 Jaeger UI: http://localhost:16686")
    logger.info(f"💔 Circuit breakers: {list(gateway.breaker_service.breakers.keys())}")
    
    app.run(host='0.0.0.0', port=port, debug=True) 