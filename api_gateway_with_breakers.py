#!/usr/bin/env python3
"""
API Gateway with Circuit Breaker Protection
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
    CircuitBreakerError
)

app = Flask(__name__)
CORS(app)

# Apply circuit breaker middleware
circuit_breaker_middleware(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# JWT configuration
JWT_SECRET = os.getenv('JWT_SECRET_KEY', 'dev-secret-key')

class APIGateway:
    """Main API Gateway with circuit breaker protection"""
    
    def __init__(self):
        self.breaker_service = breaker_service
        self.request_count = 0
        self.start_time = time.time()
    
    def authenticate(self, token):
        """Verify JWT token"""
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

gateway = APIGateway()

# Authentication decorator
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = gateway.get_auth_token(request)
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        user = gateway.authenticate(token)
        if not user:
            return jsonify({'error': 'Invalid token'}), 401
        
        request.user = user
        return f(*args, **kwargs)
    return decorated_function

# CORS proxy for Squarespace
@app.route('/cors-proxy/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
def cors_proxy(path):
    """Handle CORS for Squarespace widget with circuit breaker protection"""
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    try:
        # Use circuit breaker protected call
        result = gateway.breaker_service.call_with_fallback(
            'control',
            gateway.breaker_service.call_control_api,
            path,
            request.method,
            json=request.get_json(silent=True),
            headers=dict(request.headers)
        )
        
        response = jsonify(result)
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
        
    except CircuitBreakerError:
        # Circuit is open
        logger.warning(f"Circuit breaker OPEN for path: {path}")
        return jsonify({
            'error': 'Service temporarily unavailable',
            'retry_after': 30
        }), 503
    except Exception as e:
        logger.error(f"Error in cors_proxy: {e}")
        return jsonify({'error': str(e)}), 502

# Main API routes with circuit breaker protection
@app.route('/api/control/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
@require_auth
def control_api_proxy(path):
    """Proxy requests to Control API with circuit breaker"""
    try:
        result = gateway.breaker_service.call_with_fallback(
            'control',
            gateway.breaker_service.call_control_api,
            path,
            request.method,
            json=request.get_json(silent=True)
        )
        return jsonify(result)
    except Exception as e:
        logger.error(f"Control API error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/analytics/<path:path>', methods=['GET'])
@require_auth
def analytics_proxy(path):
    """Proxy requests to Analytics service with circuit breaker"""
    try:
        result = gateway.breaker_service.call_with_fallback(
            'analytics',
            gateway.breaker_service.call_analytics,
            path,
            params=request.args.to_dict()
        )
        return jsonify(result)
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/minerva/chat', methods=['POST'])
@require_auth
def minerva_chat():
    """Proxy chat requests to Minerva with circuit breaker"""
    try:
        data = request.get_json()
        result = gateway.breaker_service.call_with_fallback(
            'minerva',
            gateway.breaker_service.call_minerva,
            data.get('message', ''),
            data.get('session_id', f"user_{request.user['id']}"),
            data.get('context', {})
        )
        return jsonify(result)
    except Exception as e:
        logger.error(f"Minerva error: {e}")
        return jsonify({'error': 'AI assistant temporarily unavailable'}), 500

# Health check endpoints
@app.route('/health', methods=['GET'])
def health_check():
    """Basic health check"""
    uptime = time.time() - gateway.start_time
    return jsonify({
        'status': 'healthy',
        'uptime_seconds': round(uptime, 2),
        'request_count': gateway.request_count
    })

@app.route('/health/dependencies', methods=['GET'])
def dependency_health():
    """Check health of all dependencies with circuit breakers"""
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
        'dependencies': dependencies
    }), 200 if all_healthy else 503

# Metrics endpoint
@app.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus-style metrics including circuit breaker stats"""
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
    
    return '\n'.join(metrics_text), 200, {'Content-Type': 'text/plain'}

# Request tracking middleware
@app.before_request
def before_request():
    """Track request metrics"""
    gateway.request_count += 1
    request.start_time = time.time()

@app.after_request
def after_request(response):
    """Log request duration"""
    if hasattr(request, 'start_time'):
        duration = time.time() - request.start_time
        logger.info(f"{request.method} {request.path} - {response.status_code} - {duration:.3f}s")
    return response

# Error handlers
@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal error: {e}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.getenv('GATEWAY_PORT', 5000))
    
    logger.info("🚀 Starting API Gateway with Circuit Breaker Protection")
    logger.info(f"📊 Circuit breaker status endpoint: http://localhost:{port}/health/circuit-breakers")
    logger.info(f"💔 Circuit breakers configured for: {list(gateway.breaker_service.breakers.keys())}")
    
    app.run(host='0.0.0.0', port=port, debug=True) 