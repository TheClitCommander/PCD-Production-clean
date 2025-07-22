#!/usr/bin/env python3
"""
Outreach Manager for Pleasant Cove Design Lead Generation
Handles email and SMS outreach with template support and tracking
"""

import os
import yaml
import logging
import time
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import email/SMS providers
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False
    logger.warning("SendGrid not installed. Install with: pip install sendgrid")

try:
    from twilio.rest import Client as TwilioClient
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    logger.warning("Twilio not installed. Install with: pip install twilio")


class OutreachManager:
    """Manages multi-channel outreach campaigns with tracking"""
    
    def __init__(self, config_path="outreach_config.yaml", db_path="scraper_results.db", 
                 dry_run=False, rate_limit=1.0):
        """
        Initialize the outreach manager
        
        Args:
            config_path: Path to YAML configuration file
            db_path: Path to SQLite database for tracking
            dry_run: If True, don't actually send messages
            rate_limit: Seconds to wait between sends (anti-spam)
        """
        self.dry_run = dry_run
        self.rate_limit = rate_limit
        self.db_path = db_path
        
        # Load configuration
        try:
            with open(config_path, 'r') as f:
                self.config = yaml.safe_load(f)
        except FileNotFoundError:
            logger.error(f"Configuration file not found: {config_path}")
            self.config = {"templates": {}}
        
        self.templates = self.config.get("templates", {})
        
        # Initialize email client
        self.email_client = None
        if SENDGRID_AVAILABLE and os.getenv("SENDGRID_API_KEY"):
            self.email_client = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
            self.from_email = self.config.get("from_email", "hello@pleasantcovedesign.com")
            logger.info("✅ SendGrid initialized")
        else:
            logger.warning("❌ SendGrid not available (missing library or API key)")
        
        # Initialize SMS client
        self.sms_client = None
        if TWILIO_AVAILABLE and os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN"):
            self.sms_client = TwilioClient(
                os.getenv("TWILIO_ACCOUNT_SID"),
                os.getenv("TWILIO_AUTH_TOKEN")
            )
            self.from_phone = self.config.get("from_phone", "+1234567890")
            logger.info("✅ Twilio initialized")
        else:
            logger.warning("❌ Twilio not available (missing library or credentials)")
        
        # Initialize database for tracking
        self._init_tracking_db()
    
    def _init_tracking_db(self):
        """Initialize database tables for outreach tracking"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Add outreach tracking columns to businesses table if they don't exist
        try:
            cursor.execute('''
                ALTER TABLE businesses ADD COLUMN outreach_status TEXT DEFAULT 'not_contacted'
            ''')
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        try:
            cursor.execute('''
                ALTER TABLE businesses ADD COLUMN last_contacted TIMESTAMP
            ''')
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        try:
            cursor.execute('''
                ALTER TABLE businesses ADD COLUMN outreach_count INTEGER DEFAULT 0
            ''')
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        # Create outreach log table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS outreach_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business_id INTEGER,
                channel TEXT,
                template_name TEXT,
                status TEXT,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                response_at TIMESTAMP,
                response_type TEXT,
                error_message TEXT,
                FOREIGN KEY (business_id) REFERENCES businesses(id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def send_email(self, to_email: str, template_name: str, variables: Dict, 
                   business_id: Optional[int] = None) -> bool:
        """
        Send an email using the specified template
        
        Args:
            to_email: Recipient email address
            template_name: Name of template from config
            variables: Dictionary of template variables
            business_id: Optional business ID for tracking
            
        Returns:
            True if sent successfully, False otherwise
        """
        if template_name not in self.templates:
            logger.error(f"Template not found: {template_name}")
            return False
        
        template = self.templates[template_name]
        if template.get("channel") != "email":
            logger.error(f"Template {template_name} is not an email template")
            return False
        
        try:
            subject = template["subject"].format(**variables)
            body = template["body"].format(**variables)
            
            if self.dry_run:
                logger.info(f"🔍 DRY RUN - Would send email:")
                logger.info(f"   To: {to_email}")
                logger.info(f"   Subject: {subject}")
                logger.info(f"   Body preview: {body[:100]}...")
                self._log_outreach(business_id, "email", template_name, "dry_run")
                return True
            
            if not self.email_client:
                logger.error("Email client not initialized")
                return False
            
            message = Mail(
                from_email=self.from_email,
                to_emails=to_email,
                subject=subject,
                html_content=body.replace('\n', '<br>')
            )
            
            response = self.email_client.send(message)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"✅ Email sent to {to_email}")
                self._log_outreach(business_id, "email", template_name, "sent")
                self._update_business_status(business_id, "contacted")
                return True
            else:
                logger.error(f"Failed to send email: {response.status_code}")
                self._log_outreach(business_id, "email", template_name, "failed", 
                                 f"Status code: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            self._log_outreach(business_id, "email", template_name, "error", str(e))
            return False
    
    def send_sms(self, to_phone: str, template_name: str, variables: Dict,
                 business_id: Optional[int] = None) -> bool:
        """
        Send an SMS using the specified template
        
        Args:
            to_phone: Recipient phone number
            template_name: Name of template from config
            variables: Dictionary of template variables
            business_id: Optional business ID for tracking
            
        Returns:
            True if sent successfully, False otherwise
        """
        if template_name not in self.templates:
            logger.error(f"Template not found: {template_name}")
            return False
        
        template = self.templates[template_name]
        if template.get("channel") != "sms":
            logger.error(f"Template {template_name} is not an SMS template")
            return False
        
        try:
            body = template["body"].format(**variables)
            
            if self.dry_run:
                logger.info(f"🔍 DRY RUN - Would send SMS:")
                logger.info(f"   To: {to_phone}")
                logger.info(f"   Message: {body}")
                self._log_outreach(business_id, "sms", template_name, "dry_run")
                return True
            
            if not self.sms_client:
                logger.error("SMS client not initialized")
                return False
            
            message = self.sms_client.messages.create(
                from_=self.from_phone,
                to=to_phone,
                body=body
            )
            
            if message.sid:
                logger.info(f"✅ SMS sent to {to_phone} (SID: {message.sid})")
                self._log_outreach(business_id, "sms", template_name, "sent")
                self._update_business_status(business_id, "contacted")
                return True
            else:
                logger.error("Failed to send SMS")
                self._log_outreach(business_id, "sms", template_name, "failed")
                return False
                
        except Exception as e:
            logger.error(f"Error sending SMS: {e}")
            self._log_outreach(business_id, "sms", template_name, "error", str(e))
            return False
    
    def _log_outreach(self, business_id: Optional[int], channel: str, 
                      template_name: str, status: str, error_message: str = None):
        """Log outreach attempt to database"""
        if not business_id:
            return
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO outreach_log (business_id, channel, template_name, status, error_message)
            VALUES (?, ?, ?, ?, ?)
        ''', (business_id, channel, template_name, status, error_message))
        
        conn.commit()
        conn.close()
    
    def _update_business_status(self, business_id: Optional[int], status: str):
        """Update business outreach status"""
        if not business_id:
            return
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE businesses 
            SET outreach_status = ?, 
                last_contacted = CURRENT_TIMESTAMP,
                outreach_count = outreach_count + 1
            WHERE id = ?
        ''', (status, business_id))
        
        conn.commit()
        conn.close()
    
    def load_leads(self, segment: str = "prime_prospects", limit: int = None) -> List[Dict]:
        """
        Load leads from database based on segment criteria
        
        Args:
            segment: Which segment to load (prime_prospects, no_website, etc.)
            limit: Maximum number of leads to return
            
        Returns:
            List of lead dictionaries
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Build query based on segment
        base_query = "SELECT * FROM businesses"
        where_clauses = []
        
        if segment == "prime_prospects":
            where_clauses.append("has_website = 0")
            where_clauses.append("phone IS NOT NULL")
            where_clauses.append("phone != ''")
            where_clauses.append("(outreach_status IS NULL OR outreach_status = 'not_contacted')")
        elif segment == "no_website":
            where_clauses.append("has_website = 0")
            where_clauses.append("(outreach_status IS NULL OR outreach_status = 'not_contacted')")
        elif segment == "high_rated":
            where_clauses.append("CAST(rating AS REAL) >= 4.0")
            where_clauses.append("(outreach_status IS NULL OR outreach_status = 'not_contacted')")
        elif segment == "all_not_contacted":
            where_clauses.append("(outreach_status IS NULL OR outreach_status = 'not_contacted')")
        
        if where_clauses:
            base_query += " WHERE " + " AND ".join(where_clauses)
        
        base_query += " ORDER BY CAST(rating AS REAL) DESC"
        
        if limit:
            base_query += f" LIMIT {limit}"
        
        cursor.execute(base_query)
        leads = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        logger.info(f"Loaded {len(leads)} leads from segment: {segment}")
        return leads
    
    def run_campaign(self, channel: str, template_name: str, segment: str = "prime_prospects",
                     limit: int = None, delay: float = None):
        """
        Run an outreach campaign
        
        Args:
            channel: "email" or "sms"
            template_name: Template to use
            segment: Which leads to target
            limit: Maximum number to contact
            delay: Seconds between sends (overrides rate_limit)
        """
        leads = self.load_leads(segment, limit)
        
        if not leads:
            logger.warning("No leads found for segment: " + segment)
            return
        
        delay = delay or self.rate_limit
        success_count = 0
        
        logger.info(f"🚀 Starting {channel} campaign:")
        logger.info(f"   Template: {template_name}")
        logger.info(f"   Segment: {segment}")
        logger.info(f"   Leads: {len(leads)}")
        logger.info(f"   Rate limit: {delay}s between sends")
        
        for i, lead in enumerate(leads):
            # Prepare template variables
            variables = {
                "business_name": lead.get("business_name", ""),
                "rating": lead.get("rating", ""),
                "reviews": lead.get("reviews", ""),
                "address": lead.get("address", ""),
                "location": lead.get("location", ""),
            }
            
            # Send based on channel
            if channel == "email":
                # For demo, use a test email if none exists
                email = lead.get("email") or f"test+{lead['id']}@example.com"
                success = self.send_email(email, template_name, variables, lead["id"])
            elif channel == "sms":
                if not lead.get("phone"):
                    logger.warning(f"No phone number for {lead['business_name']}")
                    continue
                success = self.send_sms(lead["phone"], template_name, variables, lead["id"])
            else:
                logger.error(f"Unknown channel: {channel}")
                break
            
            if success:
                success_count += 1
            
            # Rate limiting
            if i < len(leads) - 1:  # Don't delay after last message
                time.sleep(delay)
        
        logger.info(f"✅ Campaign complete: {success_count}/{len(leads)} messages sent")
    
    def get_campaign_stats(self) -> Dict:
        """Get statistics about outreach campaigns"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        stats = {}
        
        # Overall stats
        cursor.execute("SELECT COUNT(*) FROM businesses")
        stats["total_businesses"] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM businesses WHERE outreach_status = 'contacted'")
        stats["contacted"] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM businesses WHERE outreach_status = 'responded'")
        stats["responded"] = cursor.fetchone()[0]
        
        # Channel stats
        cursor.execute("""
            SELECT channel, COUNT(*) as count, 
                   SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                   SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM outreach_log
            GROUP BY channel
        """)
        
        stats["by_channel"] = {}
        for row in cursor.fetchall():
            channel, count, sent, failed = row
            stats["by_channel"][channel] = {
                "attempts": count,
                "sent": sent or 0,
                "failed": failed or 0
            }
        
        conn.close()
        return stats


if __name__ == "__main__":
    # Test the module
    print("✅ Outreach Manager module loaded successfully!")
    print("📋 Available features:")
    print("   • Multi-channel support (Email/SMS)")
    print("   • Template-based messaging")
    print("   • Dry-run mode for testing")
    print("   • Outreach tracking and logging")
    print("   • Campaign statistics") 