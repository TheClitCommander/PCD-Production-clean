#!/usr/bin/env python3
"""
Dead Letter Queue API Endpoints
Provides HTTP interface for DLQ inspection and management
"""

from flask import Blueprint, request, jsonify
import redis
import logging
from datetime import datetime
from typing import Dict, List

from dead_letter_queue import DeadLetterQueue, Task
from distributed_tracing import DistributedTracing

logger = logging.getLogger(__name__)

# Create Blueprint
dlq_api = Blueprint('dlq_api', __name__)

# Initialize services
redis_client = redis.Redis(decode_responses=True)
tracing = DistributedTracing("dlq-api", "1.0.0")
dlq = DeadLetterQueue(redis_client, tracing)

@dlq_api.route('/dlq/<priority>', methods=['GET'])
def get_dlq_items(priority):
    """
    Get items from Dead Letter Queue
    
    Args:
        priority: Queue priority (high, normal, low)
        
    Query params:
        limit: Maximum items to return (default: 100)
        offset: Pagination offset (default: 0)
    """
    with tracing.trace_operation("api.get_dlq_items", {"priority": priority}):
        try:
            limit = int(request.args.get('limit', 100))
            offset = int(request.args.get('offset', 0))
            
            # Validate priority
            if priority not in ['high', 'normal', 'low']:
                return jsonify({'error': 'Invalid priority. Use: high, normal, low'}), 400
            
            # Get items
            items = dlq.get_dlq_items(priority, limit)
            
            # Apply offset
            if offset > 0:
                items = items[offset:]
            
            # Format response
            response = {
                'priority': priority,
                'items': items,
                'count': len(items),
                'total': dlq.redis.llen(f'dlq:{priority}'),
                'offset': offset,
                'limit': limit
            }
            
            return jsonify(response)
            
        except Exception as e:
            logger.error(f"Error getting DLQ items: {e}")
            return jsonify({'error': str(e)}), 500

@dlq_api.route('/dlq', methods=['GET'])
def get_all_dlq_items():
    """Get items from all DLQ priorities"""
    with tracing.trace_operation("api.get_all_dlq_items"):
        try:
            limit = int(request.args.get('limit', 50))
            
            all_items = []
            for priority in ['high', 'normal', 'low']:
                items = dlq.get_dlq_items(priority, limit)
                for item in items:
                    item['priority'] = priority
                all_items.extend(items)
            
            # Sort by failed_at timestamp
            all_items.sort(key=lambda x: x.get('failed_at', ''), reverse=True)
            
            # Get stats
            stats = dlq.get_dlq_stats()
            
            response = {
                'items': all_items[:limit],
                'stats': stats,
                'timestamp': datetime.now().isoformat()
            }
            
            return jsonify(response)
            
        except Exception as e:
            logger.error(f"Error getting all DLQ items: {e}")
            return jsonify({'error': str(e)}), 500

@dlq_api.route('/dlq/stats', methods=['GET'])
def get_dlq_stats():
    """Get DLQ statistics"""
    with tracing.trace_operation("api.get_dlq_stats"):
        try:
            stats = dlq.get_dlq_stats()
            
            # Add additional metrics
            stats['health'] = 'healthy' if stats['total_items'] < 100 else 'warning'
            stats['timestamp'] = datetime.now().isoformat()
            
            return jsonify(stats)
            
        except Exception as e:
            logger.error(f"Error getting DLQ stats: {e}")
            return jsonify({'error': str(e)}), 500

@dlq_api.route('/dlq/retry', methods=['POST'])
def retry_dlq_task():
    """
    Retry a task from DLQ
    
    Body:
        task_id: ID of task to retry
        reset_attempts: Whether to reset attempt counter (default: true)
    """
    with tracing.trace_operation("api.retry_dlq_task"):
        try:
            data = request.get_json()
            
            if not data or 'task_id' not in data:
                return jsonify({'error': 'task_id required'}), 400
            
            task_id = data['task_id']
            reset_attempts = data.get('reset_attempts', True)
            
            # Retry the task
            success = dlq.retry_dlq_task(task_id, reset_attempts)
            
            if success:
                return jsonify({
                    'status': 'success',
                    'message': f'Task {task_id} re-queued for processing',
                    'reset_attempts': reset_attempts
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': f'Task {task_id} not found in DLQ'
                }), 404
                
        except Exception as e:
            logger.error(f"Error retrying DLQ task: {e}")
            return jsonify({'error': str(e)}), 500

@dlq_api.route('/dlq/retry-all', methods=['POST'])
def retry_all_dlq_tasks():
    """
    Retry all tasks in a specific DLQ priority
    
    Body:
        priority: Queue priority (high, normal, low)
        limit: Maximum tasks to retry (default: 10)
        task_type: Optional filter by task type
    """
    with tracing.trace_operation("api.retry_all_dlq_tasks"):
        try:
            data = request.get_json()
            
            if not data or 'priority' not in data:
                return jsonify({'error': 'priority required'}), 400
            
            priority = data['priority']
            limit = data.get('limit', 10)
            task_type_filter = data.get('task_type')
            
            # Get DLQ items
            items = dlq.get_dlq_items(priority, limit)
            
            # Filter by task type if specified
            if task_type_filter:
                items = [item for item in items if item.get('task_type') == task_type_filter]
            
            # Retry each task
            retried = []
            failed = []
            
            for item in items[:limit]:
                task_id = item.get('task_id')
                if task_id:
                    try:
                        if dlq.retry_dlq_task(task_id, reset_attempts=True):
                            retried.append(task_id)
                        else:
                            failed.append(task_id)
                    except Exception as e:
                        logger.error(f"Failed to retry task {task_id}: {e}")
                        failed.append(task_id)
            
            return jsonify({
                'status': 'completed',
                'retried': retried,
                'failed': failed,
                'total_retried': len(retried),
                'total_failed': len(failed)
            })
            
        except Exception as e:
            logger.error(f"Error retrying all DLQ tasks: {e}")
            return jsonify({'error': str(e)}), 500

@dlq_api.route('/dlq/purge', methods=['DELETE'])
def purge_dlq():
    """
    Purge old items from DLQ
    
    Query params:
        priority: Specific priority to purge (optional)
        older_than_days: Items older than X days (default: 7)
    """
    with tracing.trace_operation("api.purge_dlq"):
        try:
            priority = request.args.get('priority')
            older_than_days = int(request.args.get('older_than_days', 7))
            
            # Validate priority if provided
            if priority and priority not in ['high', 'normal', 'low']:
                return jsonify({'error': 'Invalid priority'}), 400
            
            # Purge items
            count = dlq.purge_dlq(priority, older_than_days)
            
            return jsonify({
                'status': 'success',
                'purged_count': count,
                'priority': priority or 'all',
                'older_than_days': older_than_days
            })
            
        except Exception as e:
            logger.error(f"Error purging DLQ: {e}")
            return jsonify({'error': str(e)}), 500

@dlq_api.route('/dlq/task/<task_id>', methods=['GET'])
def get_dlq_task(task_id):
    """Get details of a specific DLQ task"""
    with tracing.trace_operation("api.get_dlq_task", {"task_id": task_id}):
        try:
            # Check each priority queue
            for priority in ['high', 'normal', 'low']:
                items = dlq.get_dlq_items(priority, 1000)  # Search through more items
                
                for item in items:
                    if item.get('task_id') == task_id:
                        # Get additional task metadata
                        task_key = f"task:{task_id}"
                        task_data = dlq.redis.hgetall(task_key)
                        
                        response = {
                            'dlq_entry': item,
                            'task_metadata': task_data,
                            'priority': priority,
                            'found': True
                        }
                        
                        return jsonify(response)
            
            return jsonify({
                'found': False,
                'message': f'Task {task_id} not found in DLQ'
            }), 404
            
        except Exception as e:
            logger.error(f"Error getting DLQ task: {e}")
            return jsonify({'error': str(e)}), 500

@dlq_api.route('/dlq/search', methods=['POST'])
def search_dlq():
    """
    Search DLQ with filters
    
    Body:
        task_type: Filter by task type
        error_contains: Filter by error message
        failed_after: ISO timestamp
        failed_before: ISO timestamp
        limit: Maximum results (default: 100)
    """
    with tracing.trace_operation("api.search_dlq"):
        try:
            filters = request.get_json() or {}
            limit = filters.get('limit', 100)
            
            results = []
            
            # Search all priorities
            for priority in ['high', 'normal', 'low']:
                items = dlq.get_dlq_items(priority, 1000)
                
                for item in items:
                    # Apply filters
                    if filters.get('task_type') and item.get('task_type') != filters['task_type']:
                        continue
                    
                    if filters.get('error_contains'):
                        error = item.get('last_error', '')
                        if filters['error_contains'].lower() not in error.lower():
                            continue
                    
                    if filters.get('failed_after'):
                        failed_at = datetime.fromisoformat(item.get('failed_at', ''))
                        if failed_at < datetime.fromisoformat(filters['failed_after']):
                            continue
                    
                    if filters.get('failed_before'):
                        failed_at = datetime.fromisoformat(item.get('failed_at', ''))
                        if failed_at > datetime.fromisoformat(filters['failed_before']):
                            continue
                    
                    item['priority'] = priority
                    results.append(item)
                    
                    if len(results) >= limit:
                        break
                
                if len(results) >= limit:
                    break
            
            # Sort by failed_at
            results.sort(key=lambda x: x.get('failed_at', ''), reverse=True)
            
            return jsonify({
                'results': results[:limit],
                'count': len(results),
                'filters': filters
            })
            
        except Exception as e:
            logger.error(f"Error searching DLQ: {e}")
            return jsonify({'error': str(e)}), 500

# Dashboard endpoint
@dlq_api.route('/dlq/dashboard', methods=['GET'])
def dlq_dashboard():
    """Get comprehensive DLQ dashboard data"""
    with tracing.trace_operation("api.dlq_dashboard"):
        try:
            # Get stats
            stats = dlq.get_dlq_stats()
            
            # Get recent items from each priority
            recent_items = {}
            for priority in ['high', 'normal', 'low']:
                items = dlq.get_dlq_items(priority, 5)
                recent_items[priority] = items
            
            # Get task type breakdown
            task_types = {}
            for priority in ['high', 'normal', 'low']:
                items = dlq.get_dlq_items(priority, 100)
                for item in items:
                    task_type = item.get('task_type', 'unknown')
                    task_types[task_type] = task_types.get(task_type, 0) + 1
            
            # Get monitor stats if available
            monitor_stats = dlq.redis.hgetall('metrics:dlq') or {}
            
            dashboard = {
                'stats': stats,
                'recent_items': recent_items,
                'task_type_breakdown': task_types,
                'monitor_stats': monitor_stats,
                'timestamp': datetime.now().isoformat()
            }
            
            return jsonify(dashboard)
            
        except Exception as e:
            logger.error(f"Error getting DLQ dashboard: {e}")
            return jsonify({'error': str(e)}), 500

# Health check
@dlq_api.route('/dlq/health', methods=['GET'])
def dlq_health():
    """DLQ health check endpoint"""
    try:
        # Check Redis connection
        dlq.redis.ping()
        
        # Get basic stats
        stats = dlq.get_dlq_stats()
        
        # Determine health status
        if stats['total_items'] > 100:
            status = 'unhealthy'
            message = 'Too many items in DLQ'
        elif stats['total_items'] > 50:
            status = 'warning'
            message = 'DLQ items accumulating'
        else:
            status = 'healthy'
            message = 'DLQ operating normally'
        
        return jsonify({
            'status': status,
            'message': message,
            'total_items': stats['total_items'],
            'timestamp': datetime.now().isoformat()
        }), 200 if status == 'healthy' else 503
        
    except Exception as e:
        logger.error(f"DLQ health check failed: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 503

if __name__ == "__main__":
    # For testing, create a simple Flask app
    from flask import Flask
    import os
    
    app = Flask(__name__)
    app.register_blueprint(dlq_api, url_prefix='/api')
    
    # Initialize tracing
    tracing.initialize()
    tracing.instrument_flask(app)
    
    port = int(os.getenv('DLQ_PORT', 5002))
    logger.info(f"Starting DLQ API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True) 