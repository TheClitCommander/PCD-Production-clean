#!/usr/bin/env python3
"""
Health Dashboard for Pleasant Cove + Minerva
Real-time status of all protection systems
"""

from flask import Flask, render_template_string, jsonify
import requests
import redis
import json
from datetime import datetime
import threading
import time

app = Flask(__name__)
redis_client = redis.Redis(decode_responses=True)

# Dashboard HTML template
DASHBOARD_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Pleasant Cove System Health</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: #333;
            margin-bottom: 30px;
        }
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .status-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .status-card h3 {
            margin: 0 0 15px 0;
            color: #555;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-healthy { background: #4CAF50; }
        .status-warning { background: #FF9800; }
        .status-error { background: #F44336; }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .metric-label {
            color: #666;
        }
        .metric-value {
            font-weight: 600;
            color: #333;
        }
        .refresh-info {
            text-align: center;
            color: #999;
            margin-top: 20px;
        }
        .protection-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
        }
        @media (max-width: 768px) {
            .protection-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏥 Pleasant Cove + Minerva System Health</h1>
        
        <div class="status-grid">
            <!-- Core Services -->
            <div class="status-card">
                <h3>Core Services</h3>
                <div id="core-services"></div>
            </div>
            
            <!-- Protection Systems -->
            <div class="status-card">
                <h3>Protection Systems</h3>
                <div id="protection-systems"></div>
            </div>
            
            <!-- System Metrics -->
            <div class="status-card">
                <h3>System Metrics</h3>
                <div id="system-metrics"></div>
            </div>
        </div>
        
        <div class="protection-grid">
            <!-- Circuit Breakers -->
            <div class="status-card">
                <h3>🔌 Circuit Breakers</h3>
                <div id="circuit-breakers"></div>
            </div>
            
            <!-- Rate Limits -->
            <div class="status-card">
                <h3>🚦 Rate Limits</h3>
                <div id="rate-limits"></div>
            </div>
            
            <!-- Dead Letter Queue -->
            <div class="status-card">
                <h3>📮 Dead Letter Queue</h3>
                <div id="dlq-status"></div>
            </div>
            
            <!-- Tracing -->
            <div class="status-card">
                <h3>🔍 Distributed Tracing</h3>
                <div id="tracing-status"></div>
            </div>
        </div>
        
        <div class="refresh-info">
            Last updated: <span id="last-update">-</span> | Auto-refreshes every 5 seconds
        </div>
    </div>
    
    <script>
        function updateDashboard() {
            fetch('/api/health-status')
                .then(response => response.json())
                .then(data => {
                    updateCoreServices(data.services);
                    updateProtectionSystems(data.protection);
                    updateSystemMetrics(data.metrics);
                    updateCircuitBreakers(data.circuit_breakers);
                    updateRateLimits(data.rate_limits);
                    updateDLQ(data.dlq);
                    updateTracing(data.tracing);
                    
                    document.getElementById('last-update').textContent = 
                        new Date().toLocaleTimeString();
                })
                .catch(error => console.error('Error updating dashboard:', error));
        }
        
        function getStatusIndicator(status) {
            const statusClass = status === 'healthy' ? 'status-healthy' : 
                               status === 'warning' ? 'status-warning' : 'status-error';
            return `<span class="status-indicator ${statusClass}"></span>`;
        }
        
        function updateCoreServices(services) {
            const html = Object.entries(services).map(([name, status]) => 
                `<div class="metric">
                    <span class="metric-label">${getStatusIndicator(status)}${name}</span>
                    <span class="metric-value">${status}</span>
                </div>`
            ).join('');
            document.getElementById('core-services').innerHTML = html;
        }
        
        function updateProtectionSystems(protection) {
            const html = Object.entries(protection).map(([name, info]) => 
                `<div class="metric">
                    <span class="metric-label">${getStatusIndicator(info.status)}${name}</span>
                    <span class="metric-value">${info.message}</span>
                </div>`
            ).join('');
            document.getElementById('protection-systems').innerHTML = html;
        }
        
        function updateSystemMetrics(metrics) {
            const html = Object.entries(metrics).map(([name, value]) => 
                `<div class="metric">
                    <span class="metric-label">${name}</span>
                    <span class="metric-value">${value}</span>
                </div>`
            ).join('');
            document.getElementById('system-metrics').innerHTML = html;
        }
        
        function updateCircuitBreakers(breakers) {
            const html = Object.entries(breakers).map(([name, info]) => 
                `<div class="metric">
                    <span class="metric-label">${getStatusIndicator(info.healthy ? 'healthy' : 'error')}${name}</span>
                    <span class="metric-value">${info.state} (${info.failures} failures)</span>
                </div>`
            ).join('');
            document.getElementById('circuit-breakers').innerHTML = html || '<p>No circuit breakers active</p>';
        }
        
        function updateRateLimits(limits) {
            const html = `
                <div class="metric">
                    <span class="metric-label">Total Checks</span>
                    <span class="metric-value">${limits.total_checks}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Allowed</span>
                    <span class="metric-value">${limits.allowed}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Rate Limited</span>
                    <span class="metric-value">${limits.limited}</span>
                </div>
            `;
            document.getElementById('rate-limits').innerHTML = html;
        }
        
        function updateDLQ(dlq) {
            const html = `
                <div class="metric">
                    <span class="metric-label">${getStatusIndicator(dlq.health)}Total Items</span>
                    <span class="metric-value">${dlq.total_items}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">High Priority</span>
                    <span class="metric-value">${dlq.high_priority}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Normal Priority</span>
                    <span class="metric-value">${dlq.normal_priority}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Low Priority</span>
                    <span class="metric-value">${dlq.low_priority}</span>
                </div>
            `;
            document.getElementById('dlq-status').innerHTML = html;
        }
        
        function updateTracing(tracing) {
            const html = `
                <div class="metric">
                    <span class="metric-label">${getStatusIndicator(tracing.status)}Jaeger</span>
                    <span class="metric-value">${tracing.status}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Services Traced</span>
                    <span class="metric-value">${tracing.services_count}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Latest Trace</span>
                    <span class="metric-value">${tracing.latest_trace || 'N/A'}</span>
                </div>
            `;
            document.getElementById('tracing-status').innerHTML = html;
        }
        
        // Initial load and periodic updates
        updateDashboard();
        setInterval(updateDashboard, 5000);
    </script>
</body>
</html>
"""

class HealthChecker:
    """Check health of all systems"""
    
    def __init__(self):
        self.gateway_url = "http://localhost:5000"
        self.dlq_url = "http://localhost:5002"
        self.jaeger_url = "http://localhost:16686"
    
    def get_all_status(self):
        """Get comprehensive health status"""
        return {
            'timestamp': datetime.now().isoformat(),
            'services': self.check_services(),
            'protection': self.check_protection_systems(),
            'metrics': self.get_system_metrics(),
            'circuit_breakers': self.get_circuit_breakers(),
            'rate_limits': self.get_rate_limits(),
            'dlq': self.get_dlq_status(),
            'tracing': self.get_tracing_status()
        }
    
    def check_services(self):
        """Check core service health"""
        services = {}
        
        # Redis
        try:
            redis_client.ping()
            services['Redis'] = 'healthy'
        except:
            services['Redis'] = 'error'
        
        # API Gateway
        try:
            response = requests.get(f"{self.gateway_url}/health", timeout=2)
            services['API Gateway'] = 'healthy' if response.status_code == 200 else 'warning'
        except:
            services['API Gateway'] = 'error'
        
        # DLQ API
        try:
            response = requests.get(f"{self.dlq_url}/api/dlq/health", timeout=2)
            services['DLQ API'] = 'healthy' if response.status_code == 200 else 'warning'
        except:
            services['DLQ API'] = 'error'
        
        # Jaeger
        try:
            response = requests.get(f"{self.jaeger_url}/api/services", timeout=2)
            services['Jaeger'] = 'healthy' if response.status_code == 200 else 'warning'
        except:
            services['Jaeger'] = 'error'
        
        return services
    
    def check_protection_systems(self):
        """Check protection system status"""
        protection = {}
        
        # Circuit Breakers
        cb_status = self.get_circuit_breakers()
        any_open = any(cb['state'] == 'open' for cb in cb_status.values())
        protection['Circuit Breakers'] = {
            'status': 'warning' if any_open else 'healthy',
            'message': f"{len([cb for cb in cb_status.values() if cb['state'] == 'open'])} open" if any_open else "All closed"
        }
        
        # Rate Limiting
        rl_metrics = self.get_rate_limits()
        limit_ratio = rl_metrics.get('limited', 0) / max(rl_metrics.get('total_checks', 1), 1)
        protection['Rate Limiting'] = {
            'status': 'warning' if limit_ratio > 0.1 else 'healthy',
            'message': f"{int(limit_ratio * 100)}% limited"
        }
        
        # Dead Letter Queue
        dlq_status = self.get_dlq_status()
        protection['Dead Letter Queue'] = {
            'status': dlq_status['health'],
            'message': f"{dlq_status['total_items']} items"
        }
        
        # Distributed Tracing
        tracing = self.get_tracing_status()
        protection['Distributed Tracing'] = {
            'status': tracing['status'],
            'message': f"{tracing['services_count']} services"
        }
        
        return protection
    
    def get_system_metrics(self):
        """Get key system metrics"""
        metrics = {}
        
        try:
            # Get gateway metrics
            response = requests.get(f"{self.gateway_url}/health", timeout=2)
            if response.status_code == 200:
                data = response.json()
                metrics['Uptime'] = f"{int(data.get('uptime_seconds', 0) / 60)} minutes"
                metrics['Total Requests'] = data.get('request_count', 0)
        except:
            pass
        
        # Redis metrics
        try:
            info = redis_client.info()
            metrics['Redis Memory'] = f"{info.get('used_memory_human', 'N/A')}"
            metrics['Redis Connections'] = info.get('connected_clients', 0)
        except:
            pass
        
        return metrics
    
    def get_circuit_breakers(self):
        """Get circuit breaker states"""
        try:
            response = requests.get(f"{self.gateway_url}/health", timeout=2)
            if response.status_code == 200:
                data = response.json()
                breakers = data.get('systems', {}).get('circuit_breakers', {})
                return {
                    name: {
                        'state': cb['state'],
                        'failures': cb.get('fail_counter', 0),
                        'healthy': cb['state'] != 'open'
                    }
                    for name, cb in breakers.items()
                }
        except:
            pass
        
        return {}
    
    def get_rate_limits(self):
        """Get rate limit metrics"""
        try:
            response = requests.get(f"{self.gateway_url}/health", timeout=2)
            if response.status_code == 200:
                data = response.json()
                rl_data = data.get('systems', {}).get('rate_limiter', {})
                return {
                    'total_checks': rl_data.get('total_checks', 0),
                    'allowed': rl_data.get('total_checks', 0) - rl_data.get('limited_requests', 0),
                    'limited': rl_data.get('limited_requests', 0)
                }
        except:
            pass
        
        return {'total_checks': 0, 'allowed': 0, 'limited': 0}
    
    def get_dlq_status(self):
        """Get DLQ status"""
        try:
            response = requests.get(f"{self.dlq_url}/api/dlq/stats", timeout=2)
            if response.status_code == 200:
                stats = response.json()
                total = stats.get('total_items', 0)
                return {
                    'total_items': total,
                    'high_priority': stats.get('queues', {}).get('high', 0),
                    'normal_priority': stats.get('queues', {}).get('normal', 0),
                    'low_priority': stats.get('queues', {}).get('low', 0),
                    'health': 'error' if total > 100 else 'warning' if total > 50 else 'healthy'
                }
        except:
            pass
        
        return {
            'total_items': 0,
            'high_priority': 0,
            'normal_priority': 0,
            'low_priority': 0,
            'health': 'error'
        }
    
    def get_tracing_status(self):
        """Get tracing status"""
        try:
            response = requests.get(f"{self.jaeger_url}/api/services", timeout=2)
            if response.status_code == 200:
                services = response.json().get('data', [])
                return {
                    'status': 'healthy',
                    'services_count': len(services),
                    'services': services[:5],  # First 5 services
                    'latest_trace': None  # Would need to query for this
                }
        except:
            pass
        
        return {
            'status': 'error',
            'services_count': 0,
            'services': [],
            'latest_trace': None
        }

# Initialize health checker
health_checker = HealthChecker()

@app.route('/')
def dashboard():
    """Render health dashboard"""
    return render_template_string(DASHBOARD_TEMPLATE)

@app.route('/api/health-status')
def health_status():
    """API endpoint for health data"""
    return jsonify(health_checker.get_all_status())

if __name__ == '__main__':
    import logging
    import os
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    port = int(os.getenv('DASHBOARD_PORT', 5003))
    logger.info(f"🏥 Starting Health Dashboard on http://localhost:{port}")
    logger.info("Make sure all services are running for accurate health data")
    
    app.run(host='0.0.0.0', port=port, debug=True) 