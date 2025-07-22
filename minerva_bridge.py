#!/usr/bin/env python3
"""
Minerva Bridge Service for Pleasant Cove Design
Connects lead generation system to Minerva AI assistant
"""

import os
import json
import sqlite3
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for Squarespace widget

# Configuration
MINERVA_URL = os.getenv('MINERVA_URL', 'http://localhost:8000')  # Minerva service URL
LEAD_DB_PATH = os.getenv('LEAD_DB_PATH', 'scrapers/scraper_results.db')
OUTREACH_CONFIG = 'outreach_config.yaml'

# Import your existing modules
import sys
sys.path.append('.')
from outreach_manager import OutreachManager
from validation import LeadEnricher
from email_validator import EmailEnricher

class MinervaBridge:
    """Bridge between Pleasant Cove lead system and Minerva AI"""
    
    def __init__(self):
        self.outreach_manager = OutreachManager(config_path=OUTREACH_CONFIG)
        self.lead_enricher = LeadEnricher()
        self.email_enricher = EmailEnricher()
        
    def get_lead_context(self, lead_id):
        """Get comprehensive lead information for Minerva"""
        conn = sqlite3.connect(LEAD_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get lead details
        cursor.execute('''
            SELECT * FROM businesses WHERE id = ?
        ''', (lead_id,))
        
        lead = dict(cursor.fetchone()) if cursor.rowcount else None
        
        if not lead:
            return None
        
        # Get interaction history
        cursor.execute('''
            SELECT * FROM outreach_log 
            WHERE business_id = ? 
            ORDER BY sent_at DESC
        ''', (lead_id,))
        
        interactions = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        # Build context for Minerva
        context = {
            'lead_info': {
                'business_name': lead['business_name'],
                'rating': lead['rating'],
                'reviews': lead['reviews'],
                'address': lead['address'],
                'phone': lead['phone_formatted'] if lead.get('phone_valid') else lead['phone'],
                'email': lead['email'],
                'has_website': lead['has_website'],
                'phone_valid': lead.get('phone_valid', False),
                'email_valid': lead.get('email_valid', False),
                'email_confidence': lead.get('email_confidence_score', 0)
            },
            'interaction_history': interactions,
            'outreach_status': lead.get('outreach_status', 'not_contacted'),
            'last_contacted': lead.get('last_contacted')
        }
        
        return context
    
    def prepare_minerva_prompt(self, lead_context, user_message=None):
        """Prepare a context-aware prompt for Minerva"""
        lead = lead_context['lead_info']
        
        prompt = f"""You are an AI assistant for Pleasant Cove Design, a web design company.
        
Current Lead Information:
- Business: {lead['business_name']}
- Rating: {lead['rating']}⭐ ({lead['reviews']} reviews)
- Location: {lead['address']}
- Has Website: {'Yes' if lead['has_website'] else 'No'}
- Contact Status: {lead_context['outreach_status']}

Your goals:
1. Help schedule meetings with interested prospects
2. Answer questions about our web design services
3. Qualify leads based on their needs and budget
4. Update lead status based on conversation outcomes

Available actions:
- Book appointments
- Send follow-up emails
- Update lead status
- Schedule callbacks
"""
        
        if user_message:
            prompt += f"\n\nUser message: {user_message}"
        
        return prompt
    
    def update_lead_from_minerva(self, lead_id, minerva_response):
        """Update lead database based on Minerva's actions"""
        conn = sqlite3.connect(LEAD_DB_PATH)
        cursor = conn.cursor()
        
        # Parse Minerva's response for actions
        if 'status_update' in minerva_response:
            cursor.execute('''
                UPDATE businesses 
                SET outreach_status = ?, last_contacted = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (minerva_response['status_update'], lead_id))
        
        if 'appointment_booked' in minerva_response:
            # Log the appointment
            cursor.execute('''
                INSERT INTO outreach_log (business_id, channel, template_name, status, response_type)
                VALUES (?, 'ai_chat', 'minerva_conversation', 'appointment_booked', 'positive')
            ''', (lead_id,))
        
        conn.commit()
        conn.close()

bridge = MinervaBridge()

# API Endpoints for Minerva to call

@app.route('/api/lead/<lead_id>/context', methods=['GET'])
def get_lead_context(lead_id):
    """Get lead context for Minerva"""
    context = bridge.get_lead_context(lead_id)
    if context:
        return jsonify(context)
    return jsonify({'error': 'Lead not found'}), 404

@app.route('/api/lead/<lead_id>/update', methods=['POST'])
def update_lead(lead_id):
    """Update lead based on Minerva interaction"""
    data = request.json
    bridge.update_lead_from_minerva(lead_id, data)
    return jsonify({'status': 'updated'})

@app.route('/api/lead/<lead_id>/send-email', methods=['POST'])
def send_email_to_lead(lead_id):
    """Send email to lead via existing outreach system"""
    data = request.json
    
    # Get lead info
    context = bridge.get_lead_context(lead_id)
    if not context:
        return jsonify({'error': 'Lead not found'}), 404
    
    lead = context['lead_info']
    
    # Use existing outreach manager
    if lead.get('email_valid'):
        success = bridge.outreach_manager.send_email(
            to_email=lead['email'],
            template_name=data.get('template', 'follow_up_email_v1'),
            variables={
                'business_name': lead['business_name'],
                'rating': lead['rating'],
                'reviews': lead['reviews']
            },
            business_id=lead_id
        )
        return jsonify({'success': success})
    
    return jsonify({'error': 'No valid email for lead'}), 400

@app.route('/api/lead/<lead_id>/book-appointment', methods=['POST'])
def book_appointment(lead_id):
    """Book appointment for lead"""
    data = request.json
    
    # Get lead info
    context = bridge.get_lead_context(lead_id)
    if not context:
        return jsonify({'error': 'Lead not found'}), 404
    
    # Here you would integrate with your calendar system
    # For now, we'll log it and update status
    appointment_time = data.get('datetime')
    
    conn = sqlite3.connect(LEAD_DB_PATH)
    cursor = conn.cursor()
    
    # Update lead status
    cursor.execute('''
        UPDATE businesses 
        SET outreach_status = 'meeting_scheduled', 
            last_contacted = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (lead_id,))
    
    # Log the appointment
    cursor.execute('''
        INSERT INTO outreach_log (business_id, channel, template_name, status, response_type, response_at)
        VALUES (?, 'ai_chat', 'appointment_booking', 'sent', 'appointment_scheduled', ?)
    ''', (lead_id, appointment_time))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'status': 'booked',
        'appointment_time': appointment_time,
        'lead_name': context['lead_info']['business_name']
    })

# Endpoints for your Squarespace widget to call

@app.route('/api/chat/start/<lead_id>', methods=['POST'])
def start_chat_session(lead_id):
    """Initialize a chat session with Minerva for a specific lead"""
    context = bridge.get_lead_context(lead_id)
    if not context:
        return jsonify({'error': 'Lead not found'}), 404
    
    # Prepare initial prompt for Minerva
    initial_prompt = bridge.prepare_minerva_prompt(context)
    
    # Forward to Minerva
    try:
        response = requests.post(f"{MINERVA_URL}/chat", json={
            'message': initial_prompt,
            'session_id': f"lead_{lead_id}",
            'context': context
        })
        
        return jsonify(response.json())
    except Exception as e:
        logger.error(f"Error connecting to Minerva: {e}")
        return jsonify({'error': 'Could not connect to AI assistant'}), 500

@app.route('/api/chat/message/<lead_id>', methods=['POST'])
def send_chat_message(lead_id):
    """Forward a message to Minerva with lead context"""
    data = request.json
    message = data.get('message')
    
    context = bridge.get_lead_context(lead_id)
    if not context:
        return jsonify({'error': 'Lead not found'}), 404
    
    # Forward to Minerva with context
    try:
        response = requests.post(f"{MINERVA_URL}/chat", json={
            'message': message,
            'session_id': f"lead_{lead_id}",
            'context': context
        })
        
        minerva_response = response.json()
        
        # Update lead based on Minerva's response
        if 'actions' in minerva_response:
            bridge.update_lead_from_minerva(lead_id, minerva_response['actions'])
        
        return jsonify(minerva_response)
    except Exception as e:
        logger.error(f"Error in Minerva chat: {e}")
        return jsonify({'error': 'Chat error occurred'}), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    """Check if bridge service is running"""
    return jsonify({
        'status': 'healthy',
        'minerva_url': MINERVA_URL,
        'database': os.path.exists(LEAD_DB_PATH)
    })

if __name__ == '__main__':
    port = int(os.getenv('BRIDGE_PORT', 5000))
    logger.info(f"🌉 Starting Minerva Bridge on port {port}")
    logger.info(f"📡 Minerva URL: {MINERVA_URL}")
    logger.info(f"💾 Lead Database: {LEAD_DB_PATH}")
    
    app.run(host='0.0.0.0', port=port, debug=True) 