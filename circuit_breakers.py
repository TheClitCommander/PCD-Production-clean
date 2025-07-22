#!/usr/bin/env python3
"""
Circuit Breaker Implementation for Pleasant Cove + Minerva
Provides fault tolerance for all downstream service calls
"""

from pybreaker import CircuitBreaker, CircuitBreakerListener, CircuitBreakerError
import redis
import logging
import json
from datetime import datetime
from functools import wraps
import requests
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Redis client for event publishing
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

class RedisCircuitBreakerListener(CircuitBreakerListener):
    """Publishes circuit breaker state changes to Redis for monitoring"""
    
    def state_change(self, cb, old_state, new_state):
        """Called when circuit breaker changes state"""
        event = {
            'breaker_name': cb.name,
            'old_state': old_state.name,
            'new_state': new_state.name,
            'timestamp': datetime.now().isoformat(),
            'failure_count': cb.fail_counter,
            'success_count': cb.success_counter
        }
        
        # Publish to Redis for monitoring
        redis_client.publish('circuit_breaker_events', json.dumps(event))
        
        # Log state change
        logger.warning(f"Circuit breaker '{cb.name}' changed state: {old_state.name} -> {new_state.name}")
        
        # Send alert if circuit opens
        if new_state.name == 'open':
            self.send_alert(cb.name, f"Circuit breaker OPEN after {cb.fail_counter} failures")
    
    def failure(self, cb, exc):
        """Called when a call fails"""
        logger.error(f"Circuit breaker '{cb.name}' recorded failure: {exc}")
        
        # Track failure metrics
        redis_client.hincrby(f'breaker_metrics:{cb.name}', 'failures', 1)
    
    def success(self, cb):
        """Called when a call succeeds"""
        # Track success metrics
        redis_client.hincrby(f'breaker_metrics:{cb.name}', 'successes', 1)
    
    def send_alert(self, breaker_name: str, message: str):
        """Send alert when circuit opens"""
        alert = {
            'type': 'circuit_breaker_open',
            'breaker': breaker_name,
            'message': message,
            'timestamp': datetime.now().isoformat()
        }
        redis_client.lpush('alerts:critical', json.dumps(alert))

# Create listener instance
redis_listener = RedisCircuitBreakerListener()

# Define circuit breakers for each service
control_api_breaker = CircuitBreaker(
    fail_max=5,
    reset_timeout=30,
    name='ControlAPI',
    listeners=[redis_listener]
)

analytics_breaker = CircuitBreaker(
    fail_max=10,  # More tolerant for analytics
    reset_timeout=60,
    name='Analytics',
    listeners=[redis_listener]
)

minerva_breaker = CircuitBreaker(
    fail_max=3,  # Strict for AI service
    reset_timeout=45,
    name='Minerva',
    listeners=[redis_listener]
)

database_breaker = CircuitBreaker(
    fail_max=5,
    reset_timeout=20,
    name='Database',
    listeners=[redis_listener]
)

task_queue_breaker = CircuitBreaker(
    fail_max=8,
    reset_timeout=30,
    name='TaskQueue',
    listeners=[redis_listener]
)

# Service-specific circuit breaker decorators
class CircuitBreakerService:
    """Wraps service calls with appropriate circuit breakers"""
    
    def __init__(self):
        self.breakers = {
            'control': control_api_breaker,
            'analytics': analytics_breaker,
            'minerva': minerva_breaker,
            'database': database_breaker,
            'task_queue': task_queue_breaker
        }
        
        # Fallback responses for when circuit is open
        self.fallbacks = {
            'analytics': self._analytics_fallback,
            'control': self._control_fallback,
            'minerva': self._minerva_fallback
        }
    
    @control_api_breaker
    def call_control_api(self, path: str, method: str = 'GET', **kwargs) -> Dict[str, Any]:
        """Call Control API with circuit breaker protection"""
        url = f"http://control-api:5001/{path}"
        response = requests.request(method, url, timeout=5, **kwargs)
        response.raise_for_status()
        return response.json()
    
    @analytics_breaker
    def call_analytics(self, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Call Analytics service with circuit breaker protection"""
        url = f"http://analytics:5002/api/analytics/{endpoint}"
        response = requests.get(url, timeout=10, **kwargs)
        response.raise_for_status()
        return response.json()
    
    @minerva_breaker
    def call_minerva(self, message: str, session_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Call Minerva AI with circuit breaker protection"""
        url = "http://minerva:8000/chat"
        response = requests.post(url, json={
            'message': message,
            'session_id': session_id,
            'context': context
        }, timeout=30)
        response.raise_for_status()
        return response.json()
    
    @database_breaker
    def query_database(self, query_func, *args, **kwargs):
        """Execute database query with circuit breaker protection"""
        return query_func(*args, **kwargs)
    
    @task_queue_breaker
    def enqueue_task(self, task_type: str, payload: Dict[str, Any], priority: str = 'normal'):
        """Enqueue task with circuit breaker protection"""
        url = "http://task-queue:5003/enqueue"
        response = requests.post(url, json={
            'type': task_type,
            'payload': payload,
            'priority': priority
        }, timeout=5)
        response.raise_for_status()
        return response.json()
    
    def call_with_fallback(self, service: str, func, *args, **kwargs):
        """Call service with automatic fallback on circuit open"""
        try:
            return func(*args, **kwargs)
        except CircuitBreakerError:
            logger.warning(f"Circuit breaker OPEN for {service}, using fallback")
            
            # Use fallback if available
            if service in self.fallbacks:
                return self.fallbacks[service](*args, **kwargs)
            
            # Generic fallback response
            return {
                'status': 'degraded',
                'service': service,
                'message': f'{service} temporarily unavailable',
                'cached': True
            }
    
    # Fallback methods
    def _analytics_fallback(self, *args, **kwargs) -> Dict[str, Any]:
        """Fallback for analytics service"""
        # Try to get cached data from Redis
        cached_key = 'analytics:last_known_good'
        cached_data = redis_client.get(cached_key)
        
        if cached_data:
            data = json.loads(cached_data)
            data['cached'] = True
            data['cached_at'] = redis_client.get(f'{cached_key}:timestamp')
            return data
        
        # Return degraded response
        return {
            'status': 'degraded',
            'total_leads': 'unknown',
            'conversion_rate': 'unknown',
            'message': 'Analytics temporarily unavailable'
        }
    
    def _control_fallback(self, path: str, *args, **kwargs) -> Dict[str, Any]:
        """Fallback for control API"""
        # Queue the request for later processing
        redis_client.lpush('control_api:retry_queue', json.dumps({
            'path': path,
            'method': kwargs.get('method', 'GET'),
            'data': kwargs.get('json', {}),
            'timestamp': datetime.now().isoformat()
        }))
        
        return {
            'status': 'queued',
            'message': 'Request queued for processing',
            'retry_after': 30
        }
    
    def _minerva_fallback(self, message: str, *args, **kwargs) -> Dict[str, Any]:
        """Fallback for Minerva AI"""
        return {
            'response': "I'm temporarily unable to process your request. Please try again in a moment.",
            'status': 'degraded',
            'fallback': True
        }

# Create service instance
breaker_service = CircuitBreakerService()

# Middleware for Flask apps
def circuit_breaker_middleware(app):
    """Add circuit breaker status endpoint and monitoring"""
    
    @app.route('/health/circuit-breakers')
    def circuit_breaker_status():
        """Get status of all circuit breakers"""
        status = {}
        
        for name, breaker in breaker_service.breakers.items():
            metrics = redis_client.hgetall(f'breaker_metrics:{breaker.name}')
            
            status[name] = {
                'state': breaker.state.name,
                'failures': int(metrics.get('failures', 0)),
                'successes': int(metrics.get('successes', 0)),
                'fail_max': breaker.fail_max,
                'reset_timeout': breaker.reset_timeout,
                'last_failure': breaker.last_failure.isoformat() if breaker.last_failure else None
            }
        
        return jsonify(status)
    
    @app.errorhandler(CircuitBreakerError)
    def handle_circuit_breaker_error(e):
        """Handle circuit breaker errors globally"""
        return jsonify({
            'error': 'Service temporarily unavailable',
            'retry_after': 30
        }), 503

# Utility function for testing
def force_circuit_open(breaker_name: str):
    """Force a circuit breaker to open state (for testing)"""
    breaker = breaker_service.breakers.get(breaker_name)
    if breaker:
        # Simulate failures to open the circuit
        for _ in range(breaker.fail_max + 1):
            try:
                breaker(lambda: 1/0)()  # Force an exception
            except:
                pass
        logger.info(f"Forced circuit breaker '{breaker_name}' to OPEN state")

# Example usage in API Gateway
class ResilientAPIGateway:
    """API Gateway with circuit breaker protection"""
    
    def __init__(self):
        self.breaker_service = breaker_service
    
    def handle_request(self, path: str, method: str = 'GET', **kwargs):
        """Handle incoming request with circuit breaker protection"""
        
        # Determine which service to call based on path
        if path.startswith('/api/control/'):
            return self.breaker_service.call_with_fallback(
                'control',
                self.breaker_service.call_control_api,
                path.replace('/api/control/', ''),
                method,
                **kwargs
            )
        
        elif path.startswith('/api/analytics/'):
            return self.breaker_service.call_with_fallback(
                'analytics',
                self.breaker_service.call_analytics,
                path.replace('/api/analytics/', ''),
                **kwargs
            )
        
        elif path.startswith('/api/minerva/'):
            data = kwargs.get('json', {})
            return self.breaker_service.call_with_fallback(
                'minerva',
                self.breaker_service.call_minerva,
                data.get('message', ''),
                data.get('session_id', 'default'),
                data.get('context', {})
            )
        
        else:
            return {'error': 'Unknown service path'}, 404

if __name__ == '__main__':
    # Quick test
    print("Circuit Breakers initialized:")
    for name, breaker in breaker_service.breakers.items():
        print(f"  - {name}: {breaker.state.name}")
    
    # Test forcing a circuit open
    force_circuit_open('control')
    print(f"\nControl API breaker state: {control_api_breaker.state.name}") 