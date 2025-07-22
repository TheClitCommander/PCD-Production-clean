#!/usr/bin/env python3
"""
CRM Dashboard - Web interface for viewing and managing lead tracking data
"""

from flask import Flask, render_template_string, request, jsonify, redirect, url_for
import logging
from demo_tracking_integration import DemoTrackingIntegration
from lead_tracker import LeadTracker
import json
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Initialize tracking
integration = DemoTrackingIntegration()
tracker = LeadTracker()

# HTML Template for the dashboard
DASHBOARD_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Pleasant Cove CRM Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-number { font-size: 2em; font-weight: bold; color: #2563eb; }
        .stat-label { color: #666; margin-top: 5px; }
        .leads-section { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .filters { margin-bottom: 20px; }
        .filter-btn { background: #e5e7eb; border: none; padding: 8px 16px; margin-right: 10px; border-radius: 4px; cursor: pointer; }
        .filter-btn.active { background: #2563eb; color: white; }
        .leads-table { width: 100%; border-collapse: collapse; }
        .leads-table th, .leads-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .leads-table th { background: #f9fafb; font-weight: 600; }
        .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 0.8em; font-weight: 500; }
        .status-new { background: #fef3c7; color: #92400e; }
        .status-demo_sent { background: #dbeafe; color: #1e40af; }
        .status-viewed_demo { background: #d1fae5; color: #065f46; }
        .status-interested { background: #fecaca; color: #991b1b; }
        .status-messaged_back { background: #fed7d7; color: #9b2c2c; }
        .status-in_progress { background: #e0e7ff; color: #3730a3; }
        .activity-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }
        .activity-high { background: #ef4444; }
        .activity-medium { background: #f59e0b; }
        .activity-low { background: #10b981; }
        .action-items { background: white; border-radius: 8px; padding: 20px; margin-top: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .action-item { padding: 12px; border-left: 4px solid #2563eb; background: #f8fafc; margin-bottom: 10px; border-radius: 0 4px 4px 0; }
        .priority-high { border-left-color: #ef4444; }
        .priority-medium { border-left-color: #f59e0b; }
        .priority-low { border-left-color: #10b981; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Pleasant Cove CRM Dashboard</h1>
            <p>Lead tracking and engagement analytics</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">{{ stats.total_leads }}</div>
                <div class="stat-label">Total Leads</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{ "%.1f"|format(stats.demo_view_rate) }}%</div>
                <div class="stat-label">Demo View Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{ "%.1f"|format(stats.cta_click_rate) }}%</div>
                <div class="stat-label">CTA Click Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{ "%.1f"|format(stats.reply_rate) }}%</div>
                <div class="stat-label">Reply Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{ categories.hot }}</div>
                <div class="stat-label">Hot Leads</div>
            </div>
        </div>
        
        <div class="leads-section">
            <h2>📋 Lead Management</h2>
            
            <div class="filters">
                <button class="filter-btn active" onclick="filterLeads('all')">All Leads</button>
                <button class="filter-btn" onclick="filterLeads('hot')">Hot ({{ categories.hot }})</button>
                <button class="filter-btn" onclick="filterLeads('warm')">Warm ({{ categories.warm }})</button>
                <button class="filter-btn" onclick="filterLeads('cold')">Cold ({{ categories.cold }})</button>
                <button class="filter-btn" onclick="filterLeads('dead')">Dead ({{ categories.dead }})</button>
            </div>
            
            <table class="leads-table">
                <thead>
                    <tr>
                        <th>Business</th>
                        <th>Status</th>
                        <th>Contact</th>
                        <th>Activity</th>
                        <th>Last Update</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {% for lead in leads %}
                    <tr data-status="{{ lead.status }}">
                        <td>
                            <strong>{{ lead.business_name }}</strong><br>
                            <small>{{ lead.business_type|title }}</small>
                        </td>
                        <td>
                            <span class="status-badge status-{{ lead.status }}">
                                {{ lead.status.replace('_', ' ')|title }}
                            </span>
                        </td>
                        <td>
                            {% if lead.phone %}<div>📱 {{ lead.phone }}</div>{% endif %}
                            {% if lead.email %}<div>📧 {{ lead.email }}</div>{% endif %}
                        </td>
                        <td>
                            <div>
                                <span class="activity-indicator activity-{{ 'high' if lead.click_count > 0 else 'medium' if lead.view_count > 0 else 'low' }}"></span>
                                {{ lead.view_count }} views, {{ lead.click_count }} clicks
                            </div>
                            {% if lead.message_count > 0 %}
                            <div><small>💬 {{ lead.message_count }} messages</small></div>
                            {% endif %}
                        </td>
                        <td>
                            <small>{{ lead.updated_at }}</small>
                        </td>
                        <td>
                            <select onchange="updateStatus('{{ lead.lead_id }}', this.value)">
                                <option value="">Update Status</option>
                                <option value="interested">Mark Interested</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="not_interested">Not Interested</option>
                                <option value="ghosted">Ghosted</option>
                            </select>
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        
        {% if action_items %}
        <div class="action-items">
            <h2>⚡ Action Items</h2>
            {% for item in action_items %}
            <div class="action-item priority-{{ item.priority }}">
                <strong>{{ item.priority|title }} Priority:</strong> {{ item.action }}
                <div><small>Contact: {{ item.contact }}</small></div>
            </div>
            {% endfor %}
        </div>
        {% endif %}
    </div>
    
    <script>
        function filterLeads(category) {
            const rows = document.querySelectorAll('.leads-table tbody tr');
            const buttons = document.querySelectorAll('.filter-btn');
            
            // Update button styles
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            // Filter rows
            rows.forEach(row => {
                const status = row.dataset.status;
                let show = false;
                
                if (category === 'all') {
                    show = true;
                } else if (category === 'hot') {
                    show = ['interested', 'messaged_back'].includes(status);
                } else if (category === 'warm') {
                    show = status === 'viewed_demo';
                } else if (category === 'cold') {
                    show = ['new', 'demo_sent'].includes(status);
                } else if (category === 'dead') {
                    show = ['ghosted', 'not_interested'].includes(status);
                }
                
                row.style.display = show ? '' : 'none';
            });
        }
        
        function updateStatus(leadId, newStatus) {
            if (!newStatus) return;
            
            fetch('/api/update-status', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({lead_id: leadId, status: newStatus})
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert('Failed to update status');
                }
            });
        }
        
        // Auto-refresh every 30 seconds
        setInterval(() => location.reload(), 30000);
    </script>
</body>
</html>
"""

@app.route('/')
def dashboard():
    """Main dashboard view"""
    try:
        # Get dashboard data
        dashboard_data = integration.get_dashboard_data()
        
        return render_template_string(
            DASHBOARD_HTML,
            stats=dashboard_data['overview'],
            categories=dashboard_data['lead_categories'],
            leads=dashboard_data['recent_activity'],
            action_items=dashboard_data['action_items']
        )
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        return f"Dashboard error: {e}", 500

@app.route('/api/update-status', methods=['POST'])
def update_status():
    """Update lead status via API"""
    try:
        data = request.get_json()
        lead_id = data.get('lead_id')
        new_status = data.get('status')
        
        success = tracker.update_lead_status(lead_id, new_status)
        
        return jsonify({'success': success})
    except Exception as e:
        logger.error(f"Status update error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/track-view', methods=['POST'])
def track_view():
    """API endpoint for tracking demo views"""
    try:
        data = request.get_json()
        
        result = integration.handle_demo_view(
            data.get('demo_id'),
            data.get('lead_id'),
            data.get('tracking_token'),
            request.headers.get('User-Agent'),
            request.remote_addr
        )
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"View tracking error: {e}")
        return jsonify({'view_tracked': False, 'error': str(e)})

@app.route('/api/track-click', methods=['POST'])
def track_click():
    """API endpoint for tracking CTA clicks"""
    try:
        data = request.get_json()
        
        result = integration.handle_cta_click(
            data.get('demo_id'),
            data.get('lead_id'),
            data.get('cta_type'),
            request.headers.get('User-Agent')
        )
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Click tracking error: {e}")
        return jsonify({'click_tracked': False, 'error': str(e)})

@app.route('/lead/<lead_id>')
def lead_detail(lead_id):
    """Detailed view of a specific lead"""
    try:
        activity = tracker.get_lead_activity(lead_id)
        
        if activity.get('error'):
            return f"Lead not found: {lead_id}", 404
        
        return jsonify(activity)
    except Exception as e:
        logger.error(f"Lead detail error: {e}")
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    print("🎯 Starting Pleasant Cove CRM Dashboard")
    print("📊 Dashboard: http://localhost:8006")
    print("🔧 API endpoints available for tracking")
    
    app.run(host='0.0.0.0', port=8006, debug=True) 