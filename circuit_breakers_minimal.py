#!/usr/bin/env python3
"""
Minimal Circuit Breaker Implementation
Works without distributed tracing dependencies
"""

import time
import logging
from functools import wraps
from enum import Enum
from typing import Callable, Dict, Any, Optional
import redis
from pybreaker import CircuitBreaker, CircuitBreakerError
import requests
from flask import jsonify

logger = logging.getLogger(__name__)

class ServiceName(Enum):
    """Service names for circuit breakers"""
    CONTROL_API = "ControlAPI"
    ANALYTICS = "Analytics"
    TASK_QUEUE = "TaskQueue"
    DECISION_ENGINE = "DecisionEngine"
    MINERVA = "Minerva"
    EMAIL_SERVICE = "EmailService"
    SMS_SERVICE = "SMSService"

class CircuitBreakerService:
    """Manages circuit breakers for all services"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client
        self.breakers: Dict[str, CircuitBreaker] = {}
        self._initialize_breakers()
    
    def _initialize_breakers(self):
        """Initialize circuit breakers for each service"""
        # Default configuration
        default_config = {
            'fail_max': 5,
            'reset_timeout': 30,
            'exclude': [requests.HTTPError]  # Don't trip on 4xx errors
        }
        
        # Service-specific configurations
        configs = {
            ServiceName.CONTROL_API.value: default_config,
            ServiceName.ANALYTICS.value: {**default_config, 'fail_max': 3},
            ServiceName.TASK_QUEUE.value: default_config,
            ServiceName.DECISION_ENGINE.value: {**default_config, 'reset_timeout': 60},
            ServiceName.MINERVA.value: {**default_config, 'fail_max': 10},
            ServiceName.EMAIL_SERVICE.value: {**default_config, 'fail_max': 3, 'reset_timeout': 120},
            ServiceName.SMS_SERVICE.value: {**default_config, 'fail_max': 3, 'reset_timeout': 120}
        }
        
        # Create breakers
        for service_name, config in configs.items():
            self.breakers[service_name] = CircuitBreaker(
                name=service_name,
                **config
            )
            logger.info(f"Initialized circuit breaker for {service_name}")
    
    def get_breaker(self, service_name: str) -> CircuitBreaker:
        """Get circuit breaker for a service"""
        return self.breakers.get(service_name)
    
    def call_with_breaker(self, service_name: str, func: Callable, *args, **kwargs) -> Any:
        """Call a function with circuit breaker protection"""
        breaker = self.get_breaker(service_name)
        if not breaker:
            logger.warning(f"No circuit breaker found for {service_name}")
            return func(*args, **kwargs)
        
        return breaker(func)(*args, **kwargs)
    
    def call_with_fallback(self, service_name: str, func: Callable, *args, fallback_result=None, **kwargs) -> Any:
        """Call with circuit breaker and fallback"""
        try:
            return self.call_with_breaker(service_name, func, *args, **kwargs)
        except CircuitBreakerError:
            logger.warning(f"Circuit breaker OPEN for {service_name}, using fallback")
            if callable(fallback_result):
                return fallback_result()
            return fallback_result or {"error": "Service unavailable", "fallback": True}
        except Exception as e:
            logger.error(f"Error calling {service_name}: {e}")
            if callable(fallback_result):
                return fallback_result()
            return fallback_result or {"error": str(e), "fallback": True}
    
    # Service-specific methods (simplified)
    
    def call_control_api(self, endpoint: str, method: str = 'GET', **kwargs) -> Dict:
        """Call Control API with circuit breaker"""
        url = f"http://localhost:5001/{endpoint}"
        response = requests.request(method, url, timeout=5, **kwargs)
        response.raise_for_status()
        return response.json()
    
    def call_analytics(self, query: str, **kwargs) -> Dict:
        """Call Analytics service with circuit breaker"""
        # Simulated analytics call
        return {"query": query, "results": [], "simulated": True}
    
    def call_minerva(self, message: str, session_id: str, context: Dict = None) -> Dict:
        """Call Minerva AI with circuit breaker"""
        # Simulated Minerva response
        return {
            "response": "I'm currently unavailable, but I received your message.",
            "session_id": session_id,
            "simulated": True
        }
    
    def get_all_states(self) -> Dict[str, str]:
        """Get current state of all circuit breakers"""
        return {name: breaker.state.name for name, breaker in self.breakers.items()}
    
    def reset_breaker(self, service_name: str):
        """Manually reset a circuit breaker"""
        breaker = self.get_breaker(service_name)
        if breaker:
            breaker.reset()
            logger.info(f"Reset circuit breaker for {service_name}")

# Global instance
try:
    redis_client = redis.Redis(decode_responses=True)
    redis_client.ping()
except:
    redis_client = None
    logger.warning("Redis not available, circuit breakers will use local state only")

breaker_service = CircuitBreakerService(redis_client)

# Flask middleware
def circuit_breaker_middleware(app):
    """Add circuit breaker protection to Flask app"""
    
    @app.errorhandler(CircuitBreakerError)
    def handle_circuit_breaker_error(e):
        return jsonify({
            'error': 'Service temporarily unavailable',
            'message': 'Circuit breaker is open',
            'retry_after': 30
        }), 503
    
    logger.info("Circuit breaker middleware enabled")

# Decorator for protecting functions
def circuit_breaker(service_name: str, fallback=None):
    """Decorator to add circuit breaker protection to a function"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            return breaker_service.call_with_fallback(
                service_name, 
                func, 
                *args, 
                fallback_result=fallback,
                **kwargs
            )
        return wrapper
    return decorator

if __name__ == "__main__":
    # Test circuit breakers
    print("Testing circuit breakers...")
    
    # Test successful call
    @circuit_breaker(ServiceName.ANALYTICS.value, fallback={"data": []})
    def test_analytics():
        return {"data": [1, 2, 3]}
    
    result = test_analytics()
    print(f"Analytics result: {result}")
    
    # Test circuit breaker states
    states = breaker_service.get_all_states()
    print(f"\nCircuit breaker states: {states}") 