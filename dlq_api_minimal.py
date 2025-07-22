#!/usr/bin/env python3
"""
Minimal Dead Letter Queue API
Works without distributed tracing dependencies
"""

from flask import Flask, Blueprint, request, jsonify
import redis
import logging
import os
import json
from datetime import datetime

logger = logging.getLogger(__name__)

# Create Blueprint
dlq_api = Blueprint('dlq_api', __name__)

# Initialize Redis
redis_client = redis.Redis(decode_responses=True)

@dlq_api.route('/dlq/<priority>', methods=['GET'])
def get_dlq_items(priority):
    """Get items from Dead Letter Queue"""
    try:
        if priority not in ['high', 'normal', 'low']:
            return jsonify({'error': 'Invalid priority'}), 400
        
        # For minimal version, just return empty or simulated data
        return jsonify({
            'priority': priority,
            'items': [],
            'count': 0,
            'total': 0
        })
    except Exception as e:
        logger.error(f"Error getting DLQ items: {e}")
        return jsonify({'error': str(e)}), 500

@dlq_api.route('/dlq/stats', methods=['GET'])
def get_dlq_stats():
    """Get DLQ statistics"""
    try:
        return jsonify({
            'total_items': 0,
            'queues': {
                'high': 0,
                'normal': 0,
                'low': 0
            },
            'health': 'healthy',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting DLQ stats: {e}")
        return jsonify({'error': str(e)}), 500

@dlq_api.route('/dlq/health', methods=['GET'])
def dlq_health():
    """DLQ health check"""
    try:
        # Check Redis
        redis_client.ping()
        
        return jsonify({
            'status': 'healthy',
            'message': 'DLQ API operational (minimal mode)',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 503

if __name__ == "__main__":
    app = Flask(__name__)
    app.register_blueprint(dlq_api, url_prefix='/api')
    
    port = int(os.getenv('DLQ_PORT', 8002))
    logger.info(f"Starting Minimal DLQ API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True) 