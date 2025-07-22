#!/usr/bin/env python3
"""
Minerva Full Control System for Pleasant Cove Design
Gives Minerva AI comprehensive access to act on your behalf across all systems
"""

import os
import json
import sqlite3
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import logging
import subprocess
import threading
import queue

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
MINERVA_URL = os.getenv('MINERVA_URL', 'http://localhost:8000')
LEAD_DB_PATH = os.getenv('LEAD_DB_PATH', 'scrapers/scraper_results.db')
OUTREACH_CONFIG = 'outreach_config.yaml'

# Import all your modules
import sys
sys.path.append('.')
from outreach_manager import OutreachManager
from validation import LeadEnricher
from email_validator import EmailEnricher

class MinervaFullControl:
    """Gives Minerva comprehensive control over Pleasant Cove Design operations"""
    
    def __init__(self):
        self.outreach_manager = OutreachManager(config_path=OUTREACH_CONFIG)
        self.lead_enricher = LeadEnricher()
        self.email_enricher = EmailEnricher()
        self.task_queue = queue.Queue()
        self.active_sessions = {}
        
        # Start background task processor
        self.task_processor = threading.Thread(target=self._process_tasks, daemon=True)
        self.task_processor.start()
        
        logger.info("🤖 Minerva Full Control System initialized")
    
    def _process_tasks(self):
        """Background task processor for async operations"""
        while True:
            try:
                task = self.task_queue.get(timeout=1)
                self._execute_task(task)
            except queue.Empty:
                continue
    
    def _execute_task(self, task):
        """Execute a queued task"""
        task_type = task.get('type')
        
        if task_type == 'scrape_leads':
            self._run_lead_scraping(task['params'])
        elif task_type == 'validate_batch':
            self._run_batch_validation(task['params'])
        elif task_type == 'outreach_campaign':
            self._run_outreach_campaign(task['params'])
        elif task_type == 'generate_report':
            self._generate_report(task['params'])
    
    # LEAD GENERATION CONTROL
    
    def scrape_new_leads(self, business_type, location, max_results=20):
        """Run the Google Maps scraper to find new leads"""
        logger.info(f"🔍 Minerva initiating lead scraping: {business_type} in {location}")
        
        # Queue the scraping task
        self.task_queue.put({
            'type': 'scrape_leads',
            'params': {
                'business_type': business_type,
                'location': location,
                'max_results': max_results
            }
        })
        
        return {
            'status': 'queued',
            'message': f'Scraping {business_type} in {location}',
            'task_id': f'scrape_{business_type}_{location}_{datetime.now().timestamp()}'
        }
    
    def _run_lead_scraping(self, params):
        """Execute lead scraping in background"""
        cmd = [
            'python', 'scrapers/google_maps_scraper.py',
            params['business_type'],
            params['location'],
            '--max-results', str(params['max_results']),
            '--validate',  # Auto-validate phone numbers
            '--validate-emails'  # Auto-validate emails
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            logger.info(f"✅ Scraping completed: {result.stdout}")
        except Exception as e:
            logger.error(f"❌ Scraping failed: {e}")
    
    # VALIDATION CONTROL
    
    def validate_all_leads(self, segment='all'):
        """Run comprehensive validation on leads"""
        logger.info(f"🔍 Minerva initiating validation for segment: {segment}")
        
        self.task_queue.put({
            'type': 'validate_batch',
            'params': {'segment': segment}
        })
        
        return {
            'status': 'queued',
            'message': f'Validating {segment} leads'
        }
    
    def _run_batch_validation(self, params):
        """Execute batch validation"""
        # Run phone validation
        subprocess.run([
            'python', 'scrapers/google_maps_scraper.py',
            '--validate',
            '--validate-segment', params['segment']
        ])
        
        # Run email validation
        subprocess.run([
            'python', 'scrapers/google_maps_scraper.py',
            '--validate-emails',
            '--email-segment', params['segment']
        ])
    
    # OUTREACH CONTROL
    
    def launch_outreach_campaign(self, channel, template, segment, limit=None):
        """Launch an outreach campaign"""
        logger.info(f"📧 Minerva launching {channel} campaign: {template} to {segment}")
        
        self.task_queue.put({
            'type': 'outreach_campaign',
            'params': {
                'channel': channel,
                'template': template,
                'segment': segment,
                'limit': limit
            }
        })
        
        return {
            'status': 'queued',
            'message': f'Launching {channel} campaign to {segment}'
        }
    
    def _run_outreach_campaign(self, params):
        """Execute outreach campaign"""
        cmd = [
            'python', 'scrapers/google_maps_scraper.py',
            '--outreach',
            '--channel', params['channel'],
            '--template', params['template'],
            '--segment', params['segment']
        ]
        
        if params.get('limit'):
            cmd.extend(['--limit', str(params['limit'])])
        
        subprocess.run(cmd)
    
    # DATABASE QUERIES
    
    def get_business_analytics(self):
        """Get comprehensive business analytics"""
        conn = sqlite3.connect(LEAD_DB_PATH)
        cursor = conn.cursor()
        
        analytics = {}
        
        # Total leads
        cursor.execute("SELECT COUNT(*) FROM businesses")
        analytics['total_leads'] = cursor.fetchone()[0]
        
        # Leads by status
        cursor.execute("""
            SELECT outreach_status, COUNT(*) 
            FROM businesses 
            GROUP BY outreach_status
        """)
        analytics['by_status'] = dict(cursor.fetchall())
        
        # Conversion metrics
        cursor.execute("""
            SELECT 
                COUNT(CASE WHEN outreach_status = 'contacted' THEN 1 END) as contacted,
                COUNT(CASE WHEN outreach_status = 'responded' THEN 1 END) as responded,
                COUNT(CASE WHEN outreach_status = 'meeting_scheduled' THEN 1 END) as meetings
            FROM businesses
        """)
        metrics = cursor.fetchone()
        analytics['conversion'] = {
            'contacted': metrics[0],
            'responded': metrics[1],
            'meetings': metrics[2],
            'response_rate': (metrics[1] / metrics[0] * 100) if metrics[0] > 0 else 0,
            'meeting_rate': (metrics[2] / metrics[1] * 100) if metrics[1] > 0 else 0
        }
        
        # Recent activity
        cursor.execute("""
            SELECT business_name, outreach_status, last_contacted
            FROM businesses
            WHERE last_contacted IS NOT NULL
            ORDER BY last_contacted DESC
            LIMIT 10
        """)
        analytics['recent_activity'] = [
            {
                'business': row[0],
                'status': row[1],
                'last_contact': row[2]
            }
            for row in cursor.fetchall()
        ]
        
        conn.close()
        return analytics
    
    # DECISION MAKING
    
    def recommend_next_action(self):
        """AI-powered recommendation for next business action"""
        analytics = self.get_business_analytics()
        
        recommendations = []
        
        # Check if we need more leads
        total_leads = analytics['total_leads']
        not_contacted = analytics['by_status'].get('not_contacted', 0)
        
        if not_contacted < 10:
            recommendations.append({
                'action': 'scrape_more_leads',
                'reason': 'Low pipeline - less than 10 uncontacted leads',
                'priority': 'high'
            })
        
        # Check response rates
        if analytics['conversion']['response_rate'] < 10:
            recommendations.append({
                'action': 'improve_templates',
                'reason': 'Low response rate - consider A/B testing new templates',
                'priority': 'medium'
            })
        
        # Check follow-up needs
        conn = sqlite3.connect(LEAD_DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT COUNT(*) FROM businesses
            WHERE outreach_status = 'contacted'
            AND last_contacted < datetime('now', '-3 days')
        """)
        needs_followup = cursor.fetchone()[0]
        
        if needs_followup > 0:
            recommendations.append({
                'action': 'send_followups',
                'reason': f'{needs_followup} leads need follow-up',
                'priority': 'high'
            })
        
        conn.close()
        
        return {
            'analytics': analytics,
            'recommendations': recommendations
        }
    
    # CALENDAR INTEGRATION
    
    def check_availability(self, date_str=None):
        """Check your calendar availability"""
        # This would integrate with your actual calendar system
        # For now, returning mock availability
        
        if not date_str:
            date_str = datetime.now().strftime('%Y-%m-%d')
        
        # Mock available slots
        base_date = datetime.strptime(date_str, '%Y-%m-%d')
        slots = []
        
        for hour in [9, 10, 11, 14, 15, 16]:
            slot_time = base_date.replace(hour=hour)
            slots.append({
                'datetime': slot_time.isoformat(),
                'duration': 60,
                'available': True
            })
        
        return {
            'date': date_str,
            'slots': slots
        }
    
    def book_appointment(self, lead_id, datetime_str, duration=60):
        """Book an appointment with a lead"""
        conn = sqlite3.connect(LEAD_DB_PATH)
        cursor = conn.cursor()
        
        # Get lead info
        cursor.execute("SELECT business_name, email, phone FROM businesses WHERE id = ?", (lead_id,))
        lead = cursor.fetchone()
        
        if not lead:
            return {'error': 'Lead not found'}
        
        # Update lead status
        cursor.execute("""
            UPDATE businesses 
            SET outreach_status = 'meeting_scheduled',
                last_contacted = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (lead_id,))
        
        # Log the appointment
        cursor.execute("""
            INSERT INTO outreach_log (business_id, channel, status, response_type, response_at)
            VALUES (?, 'calendar', 'appointment_booked', 'meeting_scheduled', ?)
        """, (lead_id, datetime_str))
        
        conn.commit()
        conn.close()
        
        # Send confirmation email
        if lead[1]:  # If email exists
            self.outreach_manager.send_email(
                to_email=lead[1],
                template_name='appointment_confirmation',
                variables={
                    'business_name': lead[0],
                    'appointment_time': datetime_str,
                    'duration': duration
                },
                business_id=lead_id
            )
        
        return {
            'status': 'booked',
            'lead_name': lead[0],
            'datetime': datetime_str,
            'duration': duration
        }
    
    # PROJECT MANAGEMENT
    
    def create_project(self, lead_id, project_type, budget_estimate):
        """Create a new project from a lead"""
        conn = sqlite3.connect(LEAD_DB_PATH)
        cursor = conn.cursor()
        
        # This would integrate with your project management system
        # For now, updating lead status
        cursor.execute("""
            UPDATE businesses
            SET outreach_status = 'client',
                project_type = ?,
                budget_estimate = ?
            WHERE id = ?
        """, (project_type, budget_estimate, lead_id))
        
        conn.commit()
        conn.close()
        
        return {
            'status': 'project_created',
            'lead_id': lead_id,
            'project_type': project_type,
            'budget': budget_estimate
        }
    
    # REPORTING
    
    def generate_weekly_report(self):
        """Generate comprehensive weekly business report"""
        self.task_queue.put({
            'type': 'generate_report',
            'params': {'report_type': 'weekly'}
        })
        
        return {
            'status': 'queued',
            'message': 'Generating weekly report'
        }
    
    def _generate_report(self, params):
        """Generate business report"""
        analytics = self.get_business_analytics()
        
        report = f"""
        PLEASANT COVE DESIGN - WEEKLY REPORT
        Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}
        
        LEAD PIPELINE:
        - Total Leads: {analytics['total_leads']}
        - Not Contacted: {analytics['by_status'].get('not_contacted', 0)}
        - Contacted: {analytics['by_status'].get('contacted', 0)}
        - Responded: {analytics['by_status'].get('responded', 0)}
        - Meetings Scheduled: {analytics['by_status'].get('meeting_scheduled', 0)}
        
        CONVERSION METRICS:
        - Response Rate: {analytics['conversion']['response_rate']:.1f}%
        - Meeting Rate: {analytics['conversion']['meeting_rate']:.1f}%
        
        RECENT ACTIVITY:
        """
        
        for activity in analytics['recent_activity']:
            report += f"- {activity['business']}: {activity['status']} ({activity['last_contact']})\n"
        
        # Save report
        with open(f"reports/weekly_{datetime.now().strftime('%Y%m%d')}.txt", 'w') as f:
            f.write(report)
        
        logger.info("📊 Weekly report generated")

# Initialize the control system
minerva = MinervaFullControl()

# API ENDPOINTS FOR MINERVA

@app.route('/api/control/scrape', methods=['POST'])
def scrape_leads():
    """Allow Minerva to initiate lead scraping"""
    data = request.json
    result = minerva.scrape_new_leads(
        business_type=data['business_type'],
        location=data['location'],
        max_results=data.get('max_results', 20)
    )
    return jsonify(result)

@app.route('/api/control/validate', methods=['POST'])
def validate_leads():
    """Allow Minerva to initiate validation"""
    data = request.json
    result = minerva.validate_all_leads(
        segment=data.get('segment', 'all')
    )
    return jsonify(result)

@app.route('/api/control/outreach', methods=['POST'])
def launch_outreach():
    """Allow Minerva to launch outreach campaigns"""
    data = request.json
    result = minerva.launch_outreach_campaign(
        channel=data['channel'],
        template=data['template'],
        segment=data['segment'],
        limit=data.get('limit')
    )
    return jsonify(result)

@app.route('/api/control/analytics', methods=['GET'])
def get_analytics():
    """Get business analytics for Minerva"""
    return jsonify(minerva.get_business_analytics())

@app.route('/api/control/recommend', methods=['GET'])
def get_recommendations():
    """Get AI recommendations for next actions"""
    return jsonify(minerva.recommend_next_action())

@app.route('/api/control/availability', methods=['GET'])
def check_availability():
    """Check calendar availability"""
    date_str = request.args.get('date')
    return jsonify(minerva.check_availability(date_str))

@app.route('/api/control/book', methods=['POST'])
def book_appointment():
    """Book an appointment"""
    data = request.json
    result = minerva.book_appointment(
        lead_id=data['lead_id'],
        datetime_str=data['datetime'],
        duration=data.get('duration', 60)
    )
    return jsonify(result)

@app.route('/api/control/project', methods=['POST'])
def create_project():
    """Create a new project"""
    data = request.json
    result = minerva.create_project(
        lead_id=data['lead_id'],
        project_type=data['project_type'],
        budget_estimate=data['budget_estimate']
    )
    return jsonify(result)

@app.route('/api/control/report', methods=['POST'])
def generate_report():
    """Generate business report"""
    result = minerva.generate_weekly_report()
    return jsonify(result)

# MINERVA CONVERSATION ENDPOINT

@app.route('/api/minerva/chat', methods=['POST'])
def minerva_chat():
    """Handle Minerva conversation with full context"""
    data = request.json
    message = data.get('message')
    session_id = data.get('session_id', 'default')
    
    # Get current business context
    context = {
        'analytics': minerva.get_business_analytics(),
        'recommendations': minerva.recommend_next_action(),
        'availability': minerva.check_availability(),
        'capabilities': [
            'scrape_leads', 'validate_leads', 'launch_campaigns',
            'book_appointments', 'create_projects', 'generate_reports'
        ]
    }
    
    # Forward to Minerva with full context
    try:
        response = requests.post(f"{MINERVA_URL}/chat", json={
            'message': message,
            'session_id': session_id,
            'context': context,
            'system_prompt': """You are the AI assistant for Pleasant Cove Design, with full control 
            over business operations. You can:
            - Find and validate new leads
            - Launch outreach campaigns
            - Book appointments
            - Create projects
            - Generate reports
            - Make strategic recommendations
            
            Act professionally and make decisions that benefit the business."""
        })
        
        return jsonify(response.json())
    except Exception as e:
        logger.error(f"Minerva chat error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Create necessary directories
    os.makedirs('reports', exist_ok=True)
    
    port = int(os.getenv('CONTROL_PORT', 5001))
    logger.info(f"🤖 Starting Minerva Full Control System on port {port}")
    logger.info(f"📡 Minerva URL: {MINERVA_URL}")
    logger.info(f"💾 Lead Database: {LEAD_DB_PATH}")
    logger.info(f"🎯 Full business control enabled!")
    
    app.run(host='0.0.0.0', port=port, debug=True) 