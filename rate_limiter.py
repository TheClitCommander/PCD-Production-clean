#!/usr/bin/env python3
"""
Rate Limiter Implementation for Pleasant Cove + Minerva
Protects APIs from abuse and ensures fair resource usage
"""

import time
import redis
import hashlib
import logging
from typing import Dict, Optional, Tuple, List
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta
import json

from distributed_tracing import DistributedTracing

logger = logging.getLogger(__name__)

class RateLimitStrategy(Enum):
    """Rate limiting strategies"""
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"
    LEAKY_BUCKET = "leaky_bucket"
    ADAPTIVE = "adaptive"

@dataclass
class RateLimitConfig:
    """Rate limit configuration"""
    name: str
    max_requests: int
    window_seconds: int
    strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW
    burst_size: Optional[int] = None
    
    # Advanced options
    cost_per_request: int = 1  # For weighted rate limiting
    penalty_duration: int = 0   # Ban duration after limit exceeded
    whitelist: List[str] = None
    blacklist: List[str] = None
    
    def __post_init__(self):
        if self.burst_size is None:
            self.burst_size = self.max_requests * 2

class RateLimiter:
    """Advanced rate limiter with multiple strategies"""
    
    def __init__(self, redis_client: redis.Redis, tracing: DistributedTracing = None):
        self.redis = redis_client
        self.tracing = tracing or DistributedTracing("rate-limiter", "1.0.0")
        
        # Default configurations
        self.configs = {
            # API endpoints
            'api_default': RateLimitConfig('api_default', 100, 60),
            'api_auth': RateLimitConfig('api_auth', 10, 60),
            'api_heavy': RateLimitConfig('api_heavy', 10, 300),
            
            # Minerva AI
            'minerva_chat': RateLimitConfig('minerva_chat', 20, 60, burst_size=5),
            'minerva_analysis': RateLimitConfig('minerva_analysis', 5, 300),
            
            # Outreach
            'sms_send': RateLimitConfig('sms_send', 50, 3600),
            'email_send': RateLimitConfig('email_send', 100, 3600),
            
            # User-based
            'user_default': RateLimitConfig('user_default', 1000, 3600),
            'user_premium': RateLimitConfig('user_premium', 5000, 3600),
        }
        
        # Metrics
        self.metrics = {
            'allowed': 0,
            'limited': 0,
            'total_checks': 0
        }
    
    def check_rate_limit(self, 
                        identifier: str, 
                        config_name: str = 'api_default',
                        cost: int = 1) -> Tuple[bool, Dict[str, any]]:
        """
        Check if request is within rate limit
        
        Returns:
            (allowed, info) - allowed is True if request can proceed
        """
        with self.tracing.trace_operation("rate_limit.check", {
            "identifier": self._hash_identifier(identifier),
            "config": config_name,
            "cost": cost
        }) as span:
            self.metrics['total_checks'] += 1
            
            config = self.configs.get(config_name)
            if not config:
                logger.warning(f"Unknown rate limit config: {config_name}")
                config = self.configs['api_default']
            
            # Check whitelist/blacklist
            if self._is_whitelisted(identifier, config):
                span.set_attribute("whitelisted", True)
                self.metrics['allowed'] += 1
                return True, {'whitelisted': True}
            
            if self._is_blacklisted(identifier, config):
                span.set_attribute("blacklisted", True)
                self.metrics['limited'] += 1
                return False, {'blacklisted': True, 'retry_after': 3600}
            
            # Check penalty
            penalty_key = f"penalty:{config.name}:{identifier}"
            if self.redis.exists(penalty_key):
                ttl = self.redis.ttl(penalty_key)
                span.set_attribute("penalized", True)
                self.metrics['limited'] += 1
                return False, {'penalized': True, 'retry_after': ttl}
            
            # Apply rate limiting strategy
            if config.strategy == RateLimitStrategy.FIXED_WINDOW:
                allowed, info = self._check_fixed_window(identifier, config, cost)
            elif config.strategy == RateLimitStrategy.SLIDING_WINDOW:
                allowed, info = self._check_sliding_window(identifier, config, cost)
            elif config.strategy == RateLimitStrategy.TOKEN_BUCKET:
                allowed, info = self._check_token_bucket(identifier, config, cost)
            elif config.strategy == RateLimitStrategy.LEAKY_BUCKET:
                allowed, info = self._check_leaky_bucket(identifier, config, cost)
            elif config.strategy == RateLimitStrategy.ADAPTIVE:
                allowed, info = self._check_adaptive(identifier, config, cost)
            else:
                allowed, info = self._check_sliding_window(identifier, config, cost)
            
            # Update metrics
            if allowed:
                self.metrics['allowed'] += 1
            else:
                self.metrics['limited'] += 1
                
                # Apply penalty if configured
                if config.penalty_duration > 0:
                    self.redis.setex(penalty_key, config.penalty_duration, "1")
                    info['penalty_applied'] = True
            
            span.set_attribute("allowed", allowed)
            span.set_attribute("remaining", info.get('remaining', 0))
            
            return allowed, info
    
    def _check_fixed_window(self, identifier: str, config: RateLimitConfig, cost: int) -> Tuple[bool, Dict]:
        """Fixed window rate limiting"""
        window_start = int(time.time() / config.window_seconds) * config.window_seconds
        key = f"rl:fixed:{config.name}:{identifier}:{window_start}"
        
        # Increment counter
        current = self.redis.incrby(key, cost)
        
        # Set expiry on first request
        if current == cost:
            self.redis.expire(key, config.window_seconds)
        
        allowed = current <= config.max_requests
        
        return allowed, {
            'limit': config.max_requests,
            'remaining': max(0, config.max_requests - current),
            'reset': window_start + config.window_seconds,
            'retry_after': config.window_seconds if not allowed else None
        }
    
    def _check_sliding_window(self, identifier: str, config: RateLimitConfig, cost: int) -> Tuple[bool, Dict]:
        """Sliding window rate limiting using sorted sets"""
        key = f"rl:sliding:{config.name}:{identifier}"
        now = time.time()
        window_start = now - config.window_seconds
        
        # Remove old entries
        self.redis.zremrangebyscore(key, 0, window_start)
        
        # Count requests in window
        current_count = self.redis.zcard(key)
        
        if current_count + cost <= config.max_requests:
            # Add new request(s)
            for i in range(cost):
                self.redis.zadd(key, {f"{now}:{i}": now})
            self.redis.expire(key, config.window_seconds)
            allowed = True
        else:
            allowed = False
        
        # Get oldest request time for retry calculation
        oldest = self.redis.zrange(key, 0, 0, withscores=True)
        if oldest and not allowed:
            oldest_time = oldest[0][1]
            retry_after = int(oldest_time + config.window_seconds - now) + 1
        else:
            retry_after = None
        
        return allowed, {
            'limit': config.max_requests,
            'remaining': max(0, config.max_requests - current_count - (cost if allowed else 0)),
            'reset': int(now + config.window_seconds),
            'retry_after': retry_after
        }
    
    def _check_token_bucket(self, identifier: str, config: RateLimitConfig, cost: int) -> Tuple[bool, Dict]:
        """Token bucket rate limiting"""
        key = f"rl:token:{config.name}:{identifier}"
        now = time.time()
        
        # Get current bucket state
        bucket_data = self.redis.hgetall(key)
        
        if not bucket_data:
            # Initialize bucket
            tokens = config.burst_size
            last_refill = now
        else:
            tokens = float(bucket_data.get('tokens', config.burst_size))
            last_refill = float(bucket_data.get('last_refill', now))
        
        # Refill tokens
        time_passed = now - last_refill
        refill_rate = config.max_requests / config.window_seconds
        tokens = min(config.burst_size, tokens + time_passed * refill_rate)
        
        if tokens >= cost:
            # Consume tokens
            tokens -= cost
            allowed = True
        else:
            allowed = False
        
        # Update bucket
        self.redis.hset(key, mapping={
            'tokens': tokens,
            'last_refill': now
        })
        self.redis.expire(key, config.window_seconds * 2)
        
        # Calculate retry after
        if not allowed:
            tokens_needed = cost - tokens
            retry_after = int(tokens_needed / refill_rate) + 1
        else:
            retry_after = None
        
        return allowed, {
            'limit': config.max_requests,
            'burst': config.burst_size,
            'tokens': int(tokens),
            'retry_after': retry_after
        }
    
    def _check_leaky_bucket(self, identifier: str, config: RateLimitConfig, cost: int) -> Tuple[bool, Dict]:
        """Leaky bucket rate limiting"""
        key = f"rl:leaky:{config.name}:{identifier}"
        now = time.time()
        
        # Get current bucket state
        bucket_data = self.redis.hgetall(key)
        
        if not bucket_data:
            level = 0
            last_leak = now
        else:
            level = float(bucket_data.get('level', 0))
            last_leak = float(bucket_data.get('last_leak', now))
        
        # Leak water
        time_passed = now - last_leak
        leak_rate = config.max_requests / config.window_seconds
        level = max(0, level - time_passed * leak_rate)
        
        # Check if we can add more
        if level + cost <= config.burst_size:
            level += cost
            allowed = True
        else:
            allowed = False
        
        # Update bucket
        self.redis.hset(key, mapping={
            'level': level,
            'last_leak': now
        })
        self.redis.expire(key, config.window_seconds * 2)
        
        # Calculate retry after
        if not allowed:
            overflow = (level + cost) - config.burst_size
            retry_after = int(overflow / leak_rate) + 1
        else:
            retry_after = None
        
        return allowed, {
            'limit': config.max_requests,
            'burst': config.burst_size,
            'level': int(level),
            'retry_after': retry_after
        }
    
    def _check_adaptive(self, identifier: str, config: RateLimitConfig, cost: int) -> Tuple[bool, Dict]:
        """Adaptive rate limiting based on system load"""
        # Get current system metrics
        cpu_load = self._get_system_load()
        error_rate = self._get_error_rate()
        
        # Adjust limits based on load
        if cpu_load > 0.8 or error_rate > 0.1:
            # Reduce limits under high load
            adjusted_limit = int(config.max_requests * 0.5)
        elif cpu_load < 0.3 and error_rate < 0.01:
            # Increase limits under low load
            adjusted_limit = int(config.max_requests * 1.5)
        else:
            adjusted_limit = config.max_requests
        
        # Use sliding window with adjusted limit
        temp_config = RateLimitConfig(
            config.name,
            adjusted_limit,
            config.window_seconds,
            RateLimitStrategy.SLIDING_WINDOW
        )
        
        allowed, info = self._check_sliding_window(identifier, temp_config, cost)
        info['adaptive_limit'] = adjusted_limit
        info['cpu_load'] = cpu_load
        info['error_rate'] = error_rate
        
        return allowed, info
    
    def reset_limit(self, identifier: str, config_name: str = None):
        """Reset rate limit for identifier"""
        with self.tracing.trace_operation("rate_limit.reset", {
            "identifier": self._hash_identifier(identifier),
            "config": config_name
        }):
            if config_name:
                configs = [self.configs.get(config_name)]
            else:
                configs = self.configs.values()
            
            for config in configs:
                if not config:
                    continue
                
                # Delete all possible keys
                patterns = [
                    f"rl:fixed:{config.name}:{identifier}:*",
                    f"rl:sliding:{config.name}:{identifier}",
                    f"rl:token:{config.name}:{identifier}",
                    f"rl:leaky:{config.name}:{identifier}",
                    f"penalty:{config.name}:{identifier}"
                ]
                
                for pattern in patterns:
                    for key in self.redis.scan_iter(match=pattern):
                        self.redis.delete(key)
    
    def get_limit_info(self, identifier: str, config_name: str = 'api_default') -> Dict[str, any]:
        """Get current rate limit information without consuming"""
        config = self.configs.get(config_name, self.configs['api_default'])
        
        # Check without incrementing
        if config.strategy == RateLimitStrategy.SLIDING_WINDOW:
            key = f"rl:sliding:{config.name}:{identifier}"
            now = time.time()
            window_start = now - config.window_seconds
            
            self.redis.zremrangebyscore(key, 0, window_start)
            current_count = self.redis.zcard(key)
            
            return {
                'limit': config.max_requests,
                'used': current_count,
                'remaining': max(0, config.max_requests - current_count),
                'reset': int(now + config.window_seconds)
            }
        
        # For other strategies, do a non-consuming check
        _, info = self.check_rate_limit(identifier, config_name, cost=0)
        return info
    
    def add_custom_limit(self, name: str, config: RateLimitConfig):
        """Add custom rate limit configuration"""
        self.configs[name] = config
        logger.info(f"Added custom rate limit: {name}")
    
    def update_limit(self, name: str, **kwargs):
        """Update existing rate limit configuration"""
        if name in self.configs:
            config = self.configs[name]
            for key, value in kwargs.items():
                if hasattr(config, key):
                    setattr(config, key, value)
            logger.info(f"Updated rate limit: {name}")
    
    def get_metrics(self) -> Dict[str, any]:
        """Get rate limiter metrics"""
        return {
            'metrics': self.metrics,
            'configs': {name: {
                'max_requests': cfg.max_requests,
                'window_seconds': cfg.window_seconds,
                'strategy': cfg.strategy.value
            } for name, cfg in self.configs.items()},
            'timestamp': datetime.now().isoformat()
        }
    
    # Helper methods
    
    def _hash_identifier(self, identifier: str) -> str:
        """Hash identifier for privacy in logs"""
        return hashlib.sha256(identifier.encode()).hexdigest()[:16]
    
    def _is_whitelisted(self, identifier: str, config: RateLimitConfig) -> bool:
        """Check if identifier is whitelisted"""
        if not config.whitelist:
            return False
        return identifier in config.whitelist or self.redis.sismember('whitelist:global', identifier)
    
    def _is_blacklisted(self, identifier: str, config: RateLimitConfig) -> bool:
        """Check if identifier is blacklisted"""
        if config.blacklist and identifier in config.blacklist:
            return True
        return self.redis.sismember('blacklist:global', identifier)
    
    def _get_system_load(self) -> float:
        """Get current system load (mock for now)"""
        # In production, read from monitoring system
        return float(self.redis.get('metrics:cpu_load') or 0.5)
    
    def _get_error_rate(self) -> float:
        """Get current error rate (mock for now)"""
        # In production, calculate from metrics
        return float(self.redis.get('metrics:error_rate') or 0.01)

# Middleware for Flask
def rate_limit_middleware(app, rate_limiter: RateLimiter):
    """Add rate limiting to Flask app"""
    from flask import request, jsonify, g
    
    @app.before_request
    def check_rate_limit():
        # Skip rate limiting for health checks
        if request.path in ['/health', '/metrics']:
            return
        
        # Determine identifier (IP, user ID, API key, etc.)
        identifier = None
        
        # 1. Check API key
        api_key = request.headers.get('X-API-Key')
        if api_key:
            identifier = f"api_key:{api_key}"
            config_name = 'api_default'
        
        # 2. Check authenticated user
        elif hasattr(g, 'user') and g.user:
            identifier = f"user:{g.user['id']}"
            config_name = 'user_premium' if g.user.get('premium') else 'user_default'
        
        # 3. Fall back to IP
        else:
            identifier = f"ip:{request.remote_addr}"
            config_name = 'api_default'
        
        # Special configs for specific endpoints
        if request.path.startswith('/api/minerva/chat'):
            config_name = 'minerva_chat'
        elif request.path.startswith('/api/analytics'):
            config_name = 'api_heavy'
        elif request.path.startswith('/auth'):
            config_name = 'api_auth'
        
        # Check rate limit
        allowed, info = rate_limiter.check_rate_limit(identifier, config_name)
        
        # Add headers
        g.rate_limit_info = info
        
        if not allowed:
            response = jsonify({
                'error': 'Rate limit exceeded',
                'retry_after': info.get('retry_after', 60)
            })
            response.status_code = 429
            
            # Add rate limit headers
            response.headers['X-RateLimit-Limit'] = str(info.get('limit', 0))
            response.headers['X-RateLimit-Remaining'] = '0'
            response.headers['X-RateLimit-Reset'] = str(info.get('reset', 0))
            response.headers['Retry-After'] = str(info.get('retry_after', 60))
            
            return response
    
    @app.after_request
    def add_rate_limit_headers(response):
        if hasattr(g, 'rate_limit_info'):
            info = g.rate_limit_info
            response.headers['X-RateLimit-Limit'] = str(info.get('limit', 0))
            response.headers['X-RateLimit-Remaining'] = str(info.get('remaining', 0))
            response.headers['X-RateLimit-Reset'] = str(info.get('reset', 0))
        
        return response

if __name__ == "__main__":
    # Test rate limiter
    redis_client = redis.Redis(decode_responses=True)
    tracing = DistributedTracing("rate-limiter-test", "1.0.0")
    tracing.initialize()
    
    rate_limiter = RateLimiter(redis_client, tracing)
    
    # Test different strategies
    test_id = "test_user_123"
    
    print("Testing rate limiter...")
    for i in range(15):
        allowed, info = rate_limiter.check_rate_limit(test_id, 'api_default')
        print(f"Request {i+1}: {'✅ Allowed' if allowed else '❌ Blocked'} - Remaining: {info.get('remaining', 0)}")
        
        if not allowed:
            print(f"  Retry after: {info.get('retry_after', 0)} seconds")
            break
        
        time.sleep(0.1)
    
    # Show metrics
    print("\nMetrics:", json.dumps(rate_limiter.get_metrics(), indent=2)) 