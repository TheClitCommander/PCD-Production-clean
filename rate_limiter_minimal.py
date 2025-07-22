#!/usr/bin/env python3
"""
Minimal Rate Limiter Implementation
Works without distributed tracing dependencies
"""

import time
import redis
import hashlib
import logging
from typing import Dict, Optional, Tuple, List
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class RateLimitStrategy(Enum):
    """Rate limiting strategies"""
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"

@dataclass
class RateLimitConfig:
    """Rate limit configuration"""
    name: str
    max_requests: int
    window_seconds: int
    strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW

class RateLimiter:
    """Minimal rate limiter"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        
        # Default configurations
        self.configs = {
            'api_default': RateLimitConfig('api_default', 100, 60),
            'api_auth': RateLimitConfig('api_auth', 10, 60),
            'api_heavy': RateLimitConfig('api_heavy', 10, 300),
        }
        
        # Metrics
        self.metrics = {
            'allowed': 0,
            'limited': 0,
            'total_checks': 0
        }
    
    def check_rate_limit(self, identifier: str, config_name: str = 'api_default', cost: int = 1) -> Tuple[bool, Dict]:
        """Check if request is within rate limit"""
        self.metrics['total_checks'] += 1
        
        config = self.configs.get(config_name, self.configs['api_default'])
        
        if config.strategy == RateLimitStrategy.SLIDING_WINDOW:
            allowed, info = self._check_sliding_window(identifier, config, cost)
        else:
            allowed, info = self._check_fixed_window(identifier, config, cost)
        
        if allowed:
            self.metrics['allowed'] += 1
        else:
            self.metrics['limited'] += 1
        
        return allowed, info
    
    def _check_sliding_window(self, identifier: str, config: RateLimitConfig, cost: int) -> Tuple[bool, Dict]:
        """Sliding window rate limiting"""
        key = f"rl:sliding:{config.name}:{identifier}"
        now = time.time()
        window_start = now - config.window_seconds
        
        # Remove old entries
        self.redis.zremrangebyscore(key, 0, window_start)
        
        # Count requests in window
        current_count = self.redis.zcard(key)
        
        if current_count + cost <= config.max_requests:
            # Add new request
            for i in range(cost):
                self.redis.zadd(key, {f"{now}:{i}": now})
            self.redis.expire(key, config.window_seconds)
            allowed = True
        else:
            allowed = False
        
        # Calculate retry after
        if not allowed:
            oldest = self.redis.zrange(key, 0, 0, withscores=True)
            if oldest:
                oldest_time = oldest[0][1]
                retry_after = int(oldest_time + config.window_seconds - now) + 1
            else:
                retry_after = config.window_seconds
        else:
            retry_after = None
        
        return allowed, {
            'limit': config.max_requests,
            'remaining': max(0, config.max_requests - current_count - (cost if allowed else 0)),
            'reset': int(now + config.window_seconds),
            'retry_after': retry_after
        }
    
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
    
    def get_metrics(self) -> Dict:
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

# Middleware for Flask
def rate_limit_middleware(app, rate_limiter: RateLimiter):
    """Add rate limiting to Flask app"""
    from flask import request, jsonify, g
    
    @app.before_request
    def check_rate_limit():
        # Skip rate limiting for health checks
        if request.path in ['/health', '/metrics']:
            return
        
        # Determine identifier
        identifier = f"ip:{request.remote_addr}"
        config_name = 'api_default'
        
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
    rate_limiter = RateLimiter(redis_client)
    
    print("Testing rate limiter...")
    test_id = "test_user_123"
    
    for i in range(15):
        allowed, info = rate_limiter.check_rate_limit(test_id, 'api_default')
        print(f"Request {i+1}: {'✅ Allowed' if allowed else '❌ Blocked'} - Remaining: {info.get('remaining', 0)}")
        
        if not allowed:
            print(f"  Retry after: {info.get('retry_after', 0)} seconds")
            break
        
        time.sleep(0.1) 