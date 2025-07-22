#!/usr/bin/env python3
"""
Simple Tracking API - Direct API for serving tracking data to the admin UI
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import logging
import json
from lead_tracker import LeadTracker
from demo_tracking_integration import DemoTrackingIntegration

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=[
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080'
])

# Initialize tracking system
tracker = LeadTracker()
integration = DemoTrackingIntegration()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'tracking_api',
        'timestamp': tracker.get_current_timestamp()
    })

@app.route('/api/leads/tracking/summary', methods=['GET'])
def get_tracking_summary():
    """Get overall tracking summary"""
    try:
        dashboard_data = integration.get_dashboard_data()
        
        # Transform to match expected format
        summary = {
            'total_leads': dashboard_data.get('total_leads', 0),
            'demo_view_rate': dashboard_data.get('demo_view_rate', 0),
            'cta_click_rate': dashboard_data.get('cta_click_rate', 0),
            'reply_rate': dashboard_data.get('reply_rate', 0),
            'lead_categories': dashboard_data.get('lead_categories', {
                'hot': 0, 'warm': 0, 'cold': 0, 'dead': 0
            })
        }
        
        logger.info(f"📊 Tracking summary requested: {summary}")
        return jsonify(summary)
        
    except Exception as e:
        logger.error(f"❌ Failed to get tracking summary: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/leads/<lead_id>/tracking', methods=['GET'])
def get_lead_tracking(lead_id):
    """Get tracking data for a specific lead"""
    try:
        activity = tracker.get_lead_activity(lead_id)
        
        if activity:
            # Transform to expected format
            tracking_data = {
                'demo_views': len(activity.get('demo_views', [])),
                'cta_clicks': len(activity.get('cta_clicks', [])),
                'conversations': len(activity.get('conversations', [])),
                'lead_info': activity.get('lead_info', {}),
                'last_activity': activity.get('last_activity')
            }
            
            logger.info(f"📈 Lead {lead_id} tracking: {tracking_data}")
            return jsonify(tracking_data)
        else:
            return jsonify({'error': 'Lead not found'}), 404
            
    except Exception as e:
        logger.error(f"❌ Failed to get lead {lead_id} tracking: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/companies', methods=['GET'])
def get_companies_with_tracking():
    """Get companies with tracking data merged in"""
    try:
        # For demo purposes, return sample companies with tracking data
        companies = [
            {
                'id': 1,
                'name': "Tony's Plumbing",
                'industry': 'plumbing',
                'phone': '(555) 123-4567',
                'email': 'tony@tonysplumbing.com',
                'stage': 'contacted',
                'priority': 'high',
                'projects': []
            },
            {
                'id': 2,
                'name': 'Superior Widget',
                'industry': 'manufacturing',
                'phone': '(555) 234-5678', 
                'email': 'info@superiorwidget.com',
                'stage': 'scraped',
                'priority': 'medium',
                'projects': []
            },
            {
                'id': 3,
                'name': 'Demo Client',
                'industry': 'retail',
                'phone': '(555) 345-6789',
                'email': 'demo@democlient.com', 
                'stage': 'responded',
                'priority': 'high',
                'projects': []
            },
            {
                'id': 4,
                'name': 'Test Client',
                'industry': 'services',
                'phone': '(555) 456-7890',
                'email': 'test@testclient.com',
                'stage': 'contacted', 
                'priority': 'medium',
                'projects': []
            }
        ]
        
        # Add tracking data to each company
        for company in companies:
            try:
                activity = tracker.get_lead_activity(str(company['id']))
                if activity:
                    company['trackingData'] = {
                        'demo_views': len(activity.get('demo_views', [])),
                        'cta_clicks': len(activity.get('cta_clicks', [])),
                        'messages': len(activity.get('conversations', [])),
                        'status': activity.get('lead_info', {}).get('status', 'new'),
                        'last_activity': activity.get('last_activity')
                    }
                else:
                    company['trackingData'] = {
                        'demo_views': 0,
                        'cta_clicks': 0,
                        'messages': 0,
                        'status': 'new',
                        'last_activity': None
                    }
            except Exception as e:
                logger.warning(f"⚠️ Could not get tracking for company {company['id']}: {e}")
                company['trackingData'] = {
                    'demo_views': 0,
                    'cta_clicks': 0,
                    'messages': 0,
                    'status': 'new',
                    'last_activity': None
                }
        
        logger.info(f"🏢 Returning {len(companies)} companies with tracking data")
        return jsonify(companies)
        
    except Exception as e:
        logger.error(f"❌ Failed to get companies with tracking: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/projects', methods=['GET'])
def get_projects():
    """Get projects (placeholder for compatibility)"""
    return jsonify([])

@app.route('/api/tags', methods=['GET'])
def get_tags():
    """Get tags (placeholder for compatibility)"""
    return jsonify([])

if __name__ == '__main__':
    logger.info("🎯 Starting Simple Tracking API")
    logger.info("📊 Serving tracking data to admin UI")
    logger.info("🔧 API available at: http://localhost:8001")
    
    app.run(host='0.0.0.0', port=8001, debug=True) 