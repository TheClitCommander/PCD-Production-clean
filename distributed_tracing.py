#!/usr/bin/env python3
"""
Distributed Tracing Configuration for Pleasant Cove + Minerva
Provides end-to-end request tracing across all services
"""

import os
import logging
from typing import Optional, Dict, Any
from contextlib import contextmanager

from opentelemetry import trace, baggage, context
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.trace import Status, StatusCode
from opentelemetry.propagate import inject, extract

logger = logging.getLogger(__name__)

class DistributedTracing:
    """Centralized tracing configuration for all services"""
    
    def __init__(self, service_name: str, service_version: str = "1.0.0"):
        self.service_name = service_name
        self.service_version = service_version
        self.tracer = None
        
    def initialize(self, 
                   jaeger_host: str = "localhost",
                   jaeger_port: int = 6831,
                   environment: str = "development"):
        """Initialize OpenTelemetry with Jaeger exporter"""
        
        # Create resource with service information
        resource = Resource.create({
            SERVICE_NAME: self.service_name,
            SERVICE_VERSION: self.service_version,
            "environment": environment,
            "deployment.environment": environment,
        })
        
        # Set up the tracer provider
        provider = TracerProvider(resource=resource)
        trace.set_tracer_provider(provider)
        
        # Configure Jaeger exporter
        jaeger_exporter = JaegerExporter(
            agent_host_name=jaeger_host,
            agent_port=jaeger_port,
            max_tag_value_length=2048  # Allow longer tag values
        )
        
        # Add the span processor
        span_processor = BatchSpanProcessor(jaeger_exporter)
        provider.add_span_processor(span_processor)
        
        # Get tracer
        self.tracer = trace.get_tracer(
            instrumenting_module_name=__name__,
            instrumenting_library_version="1.0.0"
        )
        
        logger.info(f"🔍 Initialized tracing for service: {self.service_name}")
        
        return self
    
    def instrument_flask(self, app):
        """Instrument Flask application"""
        FlaskInstrumentor().instrument_app(
            app,
            excluded_urls="health,metrics"  # Don't trace health checks
        )
        
        # Add custom request attributes
        @app.before_request
        def add_trace_attributes():
            span = trace.get_current_span()
            if span and span.is_recording():
                # Add custom attributes
                span.set_attribute("http.user_agent", request.headers.get("User-Agent", ""))
                span.set_attribute("http.real_ip", request.headers.get("X-Real-IP", request.remote_addr))
                
                # Add user context if available
                if hasattr(request, 'user'):
                    span.set_attribute("user.id", request.user.get('id', 'anonymous'))
                    span.set_attribute("user.type", request.user.get('type', 'unknown'))
        
        logger.info("✅ Flask instrumentation enabled")
    
    def instrument_requests(self):
        """Instrument outgoing HTTP requests"""
        RequestsInstrumentor().instrument(
            tracer_provider=trace.get_tracer_provider(),
            span_callback=self._enrich_request_span
        )
        logger.info("✅ Requests instrumentation enabled")
    
    def instrument_redis(self, redis_client=None):
        """Instrument Redis operations"""
        RedisInstrumentor().instrument(
            tracer_provider=trace.get_tracer_provider()
        )
        logger.info("✅ Redis instrumentation enabled")
    
    def instrument_sqlalchemy(self, engine=None):
        """Instrument SQLAlchemy database operations"""
        SQLAlchemyInstrumentor().instrument(
            engine=engine,
            tracer_provider=trace.get_tracer_provider()
        )
        logger.info("✅ SQLAlchemy instrumentation enabled")
    
    def instrument_logging(self):
        """Add trace context to logs"""
        LoggingInstrumentor().instrument(
            set_logging_format=True,
            log_level=logging.INFO
        )
        logger.info("✅ Logging instrumentation enabled")
    
    def instrument_all(self, app=None, redis_client=None, db_engine=None):
        """Instrument all available libraries"""
        if app:
            self.instrument_flask(app)
        self.instrument_requests()
        if redis_client:
            self.instrument_redis(redis_client)
        if db_engine:
            self.instrument_sqlalchemy(db_engine)
        self.instrument_logging()
    
    @staticmethod
    def _enrich_request_span(span, request):
        """Add custom attributes to outgoing request spans"""
        # Add circuit breaker state if available
        if hasattr(request, 'circuit_breaker_state'):
            span.set_attribute("circuit_breaker.state", request.circuit_breaker_state)
        
        # Add retry information
        if hasattr(request, 'retry_count'):
            span.set_attribute("http.retry_count", request.retry_count)
    
    @contextmanager
    def trace_operation(self, operation_name: str, attributes: Dict[str, Any] = None):
        """Context manager for tracing custom operations"""
        with self.tracer.start_as_current_span(operation_name) as span:
            if attributes:
                for key, value in attributes.items():
                    span.set_attribute(key, str(value))
            
            try:
                yield span
            except Exception as e:
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
                raise
    
    def trace_function(self, func):
        """Decorator to trace function execution"""
        def wrapper(*args, **kwargs):
            operation_name = f"{func.__module__}.{func.__name__}"
            
            with self.trace_operation(operation_name) as span:
                # Add function arguments as attributes
                span.set_attribute("function.args_count", len(args))
                span.set_attribute("function.kwargs_count", len(kwargs))
                
                result = func(*args, **kwargs)
                
                # Add result info
                if result:
                    span.set_attribute("function.has_result", True)
                    if isinstance(result, dict) and 'status' in result:
                        span.set_attribute("function.result_status", result['status'])
                
                return result
        
        return wrapper
    
    def add_baggage(self, key: str, value: str):
        """Add baggage that propagates across service boundaries"""
        ctx = baggage.set_baggage(key, value)
        context.attach(ctx)
    
    def get_current_trace_id(self) -> Optional[str]:
        """Get the current trace ID"""
        span = trace.get_current_span()
        if span:
            span_context = span.get_span_context()
            if span_context.is_valid:
                return format(span_context.trace_id, '032x')
        return None
    
    def inject_trace_context(self, carrier: dict):
        """Inject trace context into carrier (e.g., message headers)"""
        inject(carrier)
    
    def extract_trace_context(self, carrier: dict):
        """Extract trace context from carrier"""
        return extract(carrier)

# Enhanced circuit breaker integration
class TracedCircuitBreaker:
    """Circuit breaker with integrated tracing"""
    
    def __init__(self, breaker, tracing: DistributedTracing):
        self.breaker = breaker
        self.tracing = tracing
    
    def __call__(self, func):
        def wrapper(*args, **kwargs):
            operation_name = f"circuit_breaker.{self.breaker.name}"
            
            with self.tracing.trace_operation(operation_name) as span:
                # Add circuit breaker state
                span.set_attribute("circuit_breaker.name", self.breaker.name)
                span.set_attribute("circuit_breaker.state", self.breaker.state.name)
                span.set_attribute("circuit_breaker.fail_counter", self.breaker.fail_counter)
                
                try:
                    # Call the wrapped function
                    result = self.breaker(func)(*args, **kwargs)
                    span.set_attribute("circuit_breaker.call_succeeded", True)
                    return result
                    
                except Exception as e:
                    span.set_attribute("circuit_breaker.call_failed", True)
                    span.record_exception(e)
                    
                    # Check if circuit opened
                    if self.breaker.state.name == 'open':
                        span.set_attribute("circuit_breaker.opened", True)
                    
                    raise
        
        return wrapper

# Service-specific tracing configurations
class APIGatewayTracing(DistributedTracing):
    """Specialized tracing for API Gateway"""
    
    def __init__(self):
        super().__init__("api-gateway", "1.0.0")
    
    def trace_auth(self, func):
        """Trace authentication operations"""
        def wrapper(*args, **kwargs):
            with self.trace_operation("auth.verify_token") as span:
                token = kwargs.get('token', args[0] if args else None)
                if token:
                    span.set_attribute("auth.token_length", len(token))
                
                try:
                    result = func(*args, **kwargs)
                    span.set_attribute("auth.success", result is not None)
                    return result
                except Exception as e:
                    span.set_attribute("auth.success", False)
                    raise
        
        return wrapper

class MinervaTracing(DistributedTracing):
    """Specialized tracing for Minerva AI"""
    
    def __init__(self):
        super().__init__("minerva-ai", "1.0.0")
    
    def trace_ai_operation(self, operation_type: str):
        """Trace AI operations with token usage"""
        def decorator(func):
            def wrapper(*args, **kwargs):
                with self.trace_operation(f"ai.{operation_type}") as span:
                    # Add message info
                    message = kwargs.get('message', args[0] if args else None)
                    if message:
                        span.set_attribute("ai.message_length", len(message))
                    
                    result = func(*args, **kwargs)
                    
                    # Add token usage if available
                    if isinstance(result, dict):
                        if 'tokens_used' in result:
                            span.set_attribute("ai.tokens_used", result['tokens_used'])
                        if 'model' in result:
                            span.set_attribute("ai.model", result['model'])
                    
                    return result
            
            return wrapper
        return decorator

# Example usage in your services
if __name__ == "__main__":
    # Initialize tracing for API Gateway
    tracing = APIGatewayTracing()
    tracing.initialize(
        jaeger_host=os.getenv("JAEGER_HOST", "localhost"),
        jaeger_port=int(os.getenv("JAEGER_PORT", 6831)),
        environment=os.getenv("ENVIRONMENT", "development")
    )
    
    # Example traced operation
    with tracing.trace_operation("example.operation", {"key": "value"}):
        print("Doing some work...")
        
    print(f"Current trace ID: {tracing.get_current_trace_id()}") 