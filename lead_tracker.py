#!/usr/bin/env python3
"""
Lead Tracker - CRM-like system for tracking lead engagement
Handles status updates, demo views, and message logging
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import sqlite3
import uuid

logger = logging.getLogger(__name__)

class LeadTracker:
    """
    Comprehensive lead tracking and CRM functionality
    """
    
    def __init__(self, db_path="lead_tracker.db"):
        self.db_path = db_path
        self.init_database()
        
        # Lead status options
        self.status_options = [
            'new',
            'demo_sent', 
            'viewed_demo',
            'messaged_back',
            'interested',
            'in_progress',
            'completed',
            'ghosted',
            'not_interested'
        ]
        
        logger.info("📊 Lead Tracker initialized")
    
    def init_database(self):
        """Initialize SQLite database with tracking tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Lead status tracking table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS lead_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id TEXT UNIQUE NOT NULL,
                business_name TEXT,
                email TEXT,
                phone TEXT,
                business_type TEXT,
                status TEXT DEFAULT 'new',
                demo_id TEXT,
                tracking_token TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT
            )
        ''')
        
        # Demo view tracking table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS demo_views (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id TEXT NOT NULL,
                demo_id TEXT NOT NULL,
                tracking_token TEXT,
                view_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_agent TEXT,
                ip_address TEXT,
                referrer TEXT,
                time_on_page INTEGER,
                FOREIGN KEY (lead_id) REFERENCES lead_status (lead_id)
            )
        ''')
        
        # Message/conversation tracking table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id TEXT NOT NULL,
                message_type TEXT, -- 'sms', 'email', 'chat'
                direction TEXT, -- 'outbound', 'inbound'
                content TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sender TEXT,
                recipient TEXT,
                message_id TEXT,
                FOREIGN KEY (lead_id) REFERENCES lead_status (lead_id)
            )
        ''')
        
        # CTA click tracking table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cta_clicks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id TEXT NOT NULL,
                demo_id TEXT NOT NULL,
                cta_type TEXT, -- 'contact', 'phone', 'email', 'book_call'
                click_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                user_agent TEXT,
                FOREIGN KEY (lead_id) REFERENCES lead_status (lead_id)
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("✅ Database initialized")
    
    def add_lead(self, business_data: Dict, demo_id: str = None, tracking_token: str = None) -> str:
        """Add a new lead to tracking system"""
        try:
            lead_id = business_data.get('id', str(uuid.uuid4()))
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO lead_status 
                (lead_id, business_name, email, phone, business_type, demo_id, tracking_token, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (
                str(lead_id),
                business_data.get('name'),
                business_data.get('email'),
                business_data.get('phone'),
                business_data.get('businessType'),
                demo_id,
                tracking_token
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Lead added: {business_data.get('name')} ({lead_id})")
            return str(lead_id)
            
        except Exception as e:
            logger.error(f"❌ Failed to add lead: {e}")
            return None
    
    def update_lead_status(self, lead_id: str, new_status: str, notes: str = None) -> bool:
        """Update lead status"""
        try:
            if new_status not in self.status_options:
                logger.warning(f"⚠️ Invalid status: {new_status}")
                return False
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            update_query = '''
                UPDATE lead_status 
                SET status = ?, updated_at = CURRENT_TIMESTAMP
            '''
            params = [new_status]
            
            if notes:
                update_query += ', notes = ?'
                params.append(notes)
            
            update_query += ' WHERE lead_id = ?'
            params.append(lead_id)
            
            cursor.execute(update_query, params)
            conn.commit()
            
            if cursor.rowcount > 0:
                logger.info(f"✅ Status updated: {lead_id} → {new_status}")
                conn.close()
                return True
            else:
                logger.warning(f"⚠️ Lead not found: {lead_id}")
                conn.close()
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to update status: {e}")
            return False
    
    def track_demo_view(self, lead_id: str, demo_id: str, tracking_token: str = None, 
                       user_agent: str = None, ip_address: str = None) -> bool:
        """Track when a lead views their demo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Record the view
            cursor.execute('''
                INSERT INTO demo_views 
                (lead_id, demo_id, tracking_token, user_agent, ip_address)
                VALUES (?, ?, ?, ?, ?)
            ''', (lead_id, demo_id, tracking_token, user_agent, ip_address))
            
            # Auto-update lead status if this is first view
            cursor.execute('''
                UPDATE lead_status 
                SET status = 'viewed_demo', updated_at = CURRENT_TIMESTAMP
                WHERE lead_id = ? AND status IN ('new', 'demo_sent')
            ''', (lead_id,))
            
            conn.commit()
            conn.close()
            
            logger.info(f"👀 Demo view tracked: {lead_id} viewed {demo_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to track demo view: {e}")
            return False
    
    def track_cta_click(self, lead_id: str, demo_id: str, cta_type: str, user_agent: str = None) -> bool:
        """Track when a lead clicks a CTA in their demo"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Record the click
            cursor.execute('''
                INSERT INTO cta_clicks 
                (lead_id, demo_id, cta_type, user_agent)
                VALUES (?, ?, ?, ?)
            ''', (lead_id, demo_id, cta_type, user_agent))
            
            # Auto-update lead status to interested
            cursor.execute('''
                UPDATE lead_status 
                SET status = 'interested', updated_at = CURRENT_TIMESTAMP
                WHERE lead_id = ? AND status NOT IN ('in_progress', 'completed')
            ''', (lead_id,))
            
            conn.commit()
            conn.close()
            
            logger.info(f"🎯 CTA click tracked: {lead_id} clicked {cta_type}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to track CTA click: {e}")
            return False
    
    def log_message(self, lead_id: str, message_type: str, direction: str, 
                   content: str, sender: str = None, recipient: str = None) -> bool:
        """Log a message/conversation with a lead"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO conversations 
                (lead_id, message_type, direction, content, sender, recipient)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (lead_id, message_type, direction, content, sender, recipient))
            
            # Auto-update status if this is an inbound message
            if direction == 'inbound':
                cursor.execute('''
                    UPDATE lead_status 
                    SET status = 'messaged_back', updated_at = CURRENT_TIMESTAMP
                    WHERE lead_id = ? AND status NOT IN ('in_progress', 'completed')
                ''', (lead_id,))
            
            conn.commit()
            conn.close()
            
            logger.info(f"💬 Message logged: {lead_id} - {direction} {message_type}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to log message: {e}")
            return False
    
    def get_lead_activity(self, lead_id: str) -> Dict:
        """Get complete activity history for a lead"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get lead info
            cursor.execute('SELECT * FROM lead_status WHERE lead_id = ?', (lead_id,))
            lead_row = cursor.fetchone()
            
            if not lead_row:
                conn.close()
                return {'error': 'Lead not found'}
            
            # Convert lead row to dict
            lead_columns = [desc[0] for desc in cursor.description]
            lead_info = dict(zip(lead_columns, lead_row))
            
            # Get demo views
            cursor.execute('''
                SELECT * FROM demo_views 
                WHERE lead_id = ? 
                ORDER BY view_timestamp DESC
            ''', (lead_id,))
            demo_views = cursor.fetchall()
            
            # Get CTA clicks
            cursor.execute('''
                SELECT * FROM cta_clicks 
                WHERE lead_id = ? 
                ORDER BY click_timestamp DESC
            ''', (lead_id,))
            cta_clicks = cursor.fetchall()
            
            # Get conversations
            cursor.execute('''
                SELECT * FROM conversations 
                WHERE lead_id = ? 
                ORDER BY timestamp DESC
            ''', (lead_id,))
            conversations = cursor.fetchall()
            
            conn.close()
            
            # Calculate last activity
            last_activities = []
            if lead_info.get('updated_at'):
                last_activities.append(lead_info['updated_at'])
            if demo_views:
                last_activities.append(demo_views[0][2])  # view_timestamp
            if cta_clicks:
                last_activities.append(cta_clicks[0][3])  # click_timestamp  
            if conversations:
                last_activities.append(conversations[0][5])  # timestamp
            
            last_activity = max(last_activities) if last_activities else '1970-01-01'
            
            return {
                'lead_info': lead_info,
                'demo_views': len(demo_views),
                'demo_views_detail': demo_views,
                'cta_clicks': len(cta_clicks),
                'cta_clicks_detail': cta_clicks,
                'conversations': len(conversations),
                'conversations_detail': conversations,
                'last_activity': last_activity
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get lead activity: {e}")
            return {'error': str(e)}
    
    def get_leads_by_status(self, status: str = None) -> List[Dict]:
        """Get leads filtered by status"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if status:
                cursor.execute('''
                    SELECT ls.*, 
                           COUNT(DISTINCT dv.id) as view_count,
                           COUNT(DISTINCT cc.id) as click_count,
                           COUNT(DISTINCT c.id) as message_count,
                           MAX(dv.view_timestamp) as last_view,
                           MAX(cc.click_timestamp) as last_click,
                           MAX(c.timestamp) as last_message
                    FROM lead_status ls
                    LEFT JOIN demo_views dv ON ls.lead_id = dv.lead_id
                    LEFT JOIN cta_clicks cc ON ls.lead_id = cc.lead_id
                    LEFT JOIN conversations c ON ls.lead_id = c.lead_id
                    WHERE ls.status = ?
                    GROUP BY ls.lead_id
                    ORDER BY ls.updated_at DESC
                ''', (status,))
            else:
                cursor.execute('''
                    SELECT ls.*, 
                           COUNT(DISTINCT dv.id) as view_count,
                           COUNT(DISTINCT cc.id) as click_count,
                           COUNT(DISTINCT c.id) as message_count,
                           MAX(dv.view_timestamp) as last_view,
                           MAX(cc.click_timestamp) as last_click,
                           MAX(c.timestamp) as last_message
                    FROM lead_status ls
                    LEFT JOIN demo_views dv ON ls.lead_id = dv.lead_id
                    LEFT JOIN cta_clicks cc ON ls.lead_id = cc.lead_id
                    LEFT JOIN conversations c ON ls.lead_id = c.lead_id
                    GROUP BY ls.lead_id
                    ORDER BY ls.updated_at DESC
                ''')
            
            results = cursor.fetchall()
            conn.close()
            
            # Convert to list of dicts
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in results]
            
        except Exception as e:
            logger.error(f"❌ Failed to get leads: {e}")
            return []
    
    def get_engagement_stats(self) -> Dict:
        """Get overall engagement statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Status breakdown
            cursor.execute('''
                SELECT status, COUNT(*) as count 
                FROM lead_status 
                GROUP BY status
            ''')
            status_breakdown = dict(cursor.fetchall())
            
            # Engagement rates
            cursor.execute('SELECT COUNT(*) FROM lead_status')
            total_leads = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(DISTINCT lead_id) FROM demo_views')
            viewed_demos = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(DISTINCT lead_id) FROM cta_clicks')
            clicked_cta = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(DISTINCT lead_id) FROM conversations WHERE direction = "inbound"')
            replied = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                'total_leads': total_leads,
                'demo_view_rate': (viewed_demos / total_leads * 100) if total_leads > 0 else 0,
                'cta_click_rate': (clicked_cta / total_leads * 100) if total_leads > 0 else 0,
                'reply_rate': (replied / total_leads * 100) if total_leads > 0 else 0,
                'status_breakdown': status_breakdown,
                'engaged_leads': viewed_demos + clicked_cta + replied
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get engagement stats: {e}")
            return {}

if __name__ == "__main__":
    # Test the lead tracker
    tracker = LeadTracker()
    
    print("📊 Lead Tracker Test")
    print("=" * 30)
    
    # Add a test lead
    test_lead = {
        'id': 'test123',
        'name': 'Test Plumbing Co',
        'email': 'test@example.com',
        'phone': '(555) 123-4567',
        'businessType': 'plumbing'
    }
    
    lead_id = tracker.add_lead(test_lead, 'demo123', 'token123')
    print(f"✅ Added lead: {lead_id}")
    
    # Simulate activity
    tracker.track_demo_view(lead_id, 'demo123', 'token123', 'Mozilla/5.0...')
    tracker.track_cta_click(lead_id, 'demo123', 'contact')
    tracker.log_message(lead_id, 'email', 'inbound', 'Hi, I saw your demo. Very interested!')
    
    # Get activity
    activity = tracker.get_lead_activity(lead_id)
    print(f"\n📈 Activity for {lead_id}:")
    print(f"  Status: {activity['lead_info']['status']}")
    print(f"  Demo views: {activity['demo_views']}")
    print(f"  CTA clicks: {activity['cta_clicks']}")
    print(f"  Messages: {activity['conversations']}")
    
    # Get stats
    stats = tracker.get_engagement_stats()
    print(f"\n📊 Overall Stats:")
    print(f"  Total leads: {stats['total_leads']}")
    print(f"  Demo view rate: {stats['demo_view_rate']:.1f}%")
    print(f"  Reply rate: {stats['reply_rate']:.1f}%") 