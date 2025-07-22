#!/usr/bin/env python3
"""
Minerva Auto Scheduler - Runs outreach cycles automatically
Set it and forget it - your 24/7 client acquisition machine
"""

import os
import json
import logging
import schedule
import time
from datetime import datetime, timedelta
from typing import Dict, List
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from minerva_smart_outreach import MinervaSmartOutreach

# Configure logging with timestamps
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('minerva_scheduler.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MinervaAutoScheduler:
    """
    Automated scheduler for Minerva outreach cycles
    Runs campaigns, tracks performance, and sends reports
    """
    
    def __init__(self):
        self.smart_outreach = MinervaSmartOutreach()
        self.cycle_history = []
        
        # Notification settings
        self.notification_email = os.getenv('NOTIFICATION_EMAIL', 'ben@pleasantcovedesign.com')
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', 587))
        self.email_user = os.getenv('EMAIL_USER', 'ben@pleasantcovedesign.com')
        self.email_password = os.getenv('EMAIL_PASSWORD', '')
        
        # Scheduling settings
        self.max_daily_outreach = 10  # Don't overwhelm prospects
        self.daily_outreach_sent = 0
        self.last_reset_date = datetime.now().date()
        
        logger.info("🤖 Minerva Auto Scheduler initialized")
    
    def run_scheduled_outreach(self, max_leads=5):
        """Run a scheduled outreach cycle with safety limits"""
        try:
            # Reset daily counter if it's a new day
            today = datetime.now().date()
            if today != self.last_reset_date:
                self.daily_outreach_sent = 0
                self.last_reset_date = today
                logger.info(f"📅 New day: Reset outreach counter")
            
            # Check daily limits
            if self.daily_outreach_sent >= self.max_daily_outreach:
                logger.info(f"⏳ Daily limit reached ({self.max_daily_outreach}). Skipping cycle.")
                return
            
            remaining_quota = self.max_daily_outreach - self.daily_outreach_sent
            actual_max_leads = min(max_leads, remaining_quota)
            
            logger.info(f"🚀 Starting scheduled outreach cycle (max: {actual_max_leads} leads)")
            
            # Run the outreach cycle
            result = self.smart_outreach.run_complete_outreach_cycle(actual_max_leads)
            
            # Update daily counter
            outreach_sent = result.get('outreach_sent', 0)
            self.daily_outreach_sent += outreach_sent
            
            # Store cycle history
            cycle_record = {
                'timestamp': datetime.now().isoformat(),
                'cycle_id': result.get('cycle_id'),
                'status': result.get('status'),
                'leads_processed': result.get('leads_found', 0),
                'demos_generated': result.get('demos_generated', 0),
                'outreach_sent': outreach_sent,
                'estimated_value': 'TBD based on conversion rates',
                'daily_total': self.daily_outreach_sent
            }
            
            self.cycle_history.append(cycle_record)
            
            # Save history to file
            self._save_cycle_history()
            
            # Send notification if significant activity
            if outreach_sent > 0:
                self._send_success_notification(cycle_record, result)
            
            logger.info(f"✅ Scheduled cycle complete: {outreach_sent} outreach sent")
            
        except Exception as e:
            logger.error(f"❌ Scheduled outreach failed: {e}")
            self._send_error_notification(str(e))
    
    def run_weekly_analytics(self):
        """Generate and send weekly performance report"""
        try:
            logger.info("📊 Generating weekly analytics report")
            
            # Get recent cycles (last 7 days)
            week_ago = datetime.now() - timedelta(days=7)
            recent_cycles = [
                cycle for cycle in self.cycle_history
                if datetime.fromisoformat(cycle['timestamp']) > week_ago
            ]
            
            # Calculate totals
            total_leads = sum(c.get('leads_processed', 0) for c in recent_cycles)
            total_demos = sum(c.get('demos_generated', 0) for c in recent_cycles)
            total_outreach = sum(c.get('outreach_sent', 0) for c in recent_cycles)
            total_potential_value = sum(c.get('estimated_value', 0) for c in recent_cycles)
            
            # Get analytics from smart outreach
            analytics = self.smart_outreach.get_campaign_analytics()
            
            # Create weekly report
            report = {
                'week_ending': datetime.now().isoformat(),
                'cycles_run': len(recent_cycles),
                'leads_processed': total_leads,
                'demos_generated': total_demos,
                'outreach_sent': total_outreach,
                'potential_revenue': total_potential_value,
                'demo_analytics': analytics,
                'performance_insights': self._generate_weekly_insights(recent_cycles),
                'recommendations': self._get_weekly_recommendations(recent_cycles)
            }
            
            # Send weekly report
            self._send_weekly_report(report)
            
            logger.info("✅ Weekly analytics report sent")
            
        except Exception as e:
            logger.error(f"❌ Weekly analytics failed: {e}")
    
    def _generate_weekly_insights(self, cycles: List[Dict]) -> List[str]:
        """Generate insights from weekly performance"""
        insights = []
        
        if not cycles:
            insights.append("📊 No cycles run this week")
            return insights
        
        total_outreach = sum(c.get('outreach_sent', 0) for c in cycles)
        avg_per_cycle = total_outreach / len(cycles) if cycles else 0
        
        insights.append(f"📈 Average {avg_per_cycle:.1f} outreach messages per cycle")
        
        if total_outreach >= 20:
            insights.append("🚀 High activity week - great momentum!")
        elif total_outreach >= 10:
            insights.append("📊 Steady progress - consistent outreach")
        else:
            insights.append("⚠️ Lower activity - consider increasing frequency")
        
        # Check for consecutive successful cycles
        successful_cycles = [c for c in cycles if c.get('outreach_sent', 0) > 0]
        if len(successful_cycles) >= 5:
            insights.append("🔥 Excellent consistency - automation is working!")
        
        return insights
    
    def _get_weekly_recommendations(self, cycles: List[Dict]) -> List[str]:
        """Get recommendations based on weekly performance"""
        recommendations = []
        
        total_outreach = sum(c.get('outreach_sent', 0) for c in cycles)
        
        if total_outreach < 10:
            recommendations.append("🎯 Consider increasing daily limits or adding more lead sources")
        
        if len(cycles) < 7:
            recommendations.append("⏰ Add more frequent scheduling (twice daily?)")
        
        recommendations.append("📞 Follow up with recent outreach recipients")
        recommendations.append("📊 Monitor demo engagement and conversion rates")
        recommendations.append("🔄 A/B test different outreach templates")
        
        return recommendations
    
    def _save_cycle_history(self):
        """Save cycle history to file"""
        try:
            with open('minerva_cycle_history.json', 'w') as f:
                json.dump(self.cycle_history, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save cycle history: {e}")
    
    def _load_cycle_history(self):
        """Load cycle history from file"""
        try:
            if os.path.exists('minerva_cycle_history.json'):
                with open('minerva_cycle_history.json', 'r') as f:
                    self.cycle_history = json.load(f)
                logger.info(f"📁 Loaded {len(self.cycle_history)} historical cycles")
        except Exception as e:
            logger.error(f"Failed to load cycle history: {e}")
            self.cycle_history = []
    
    def _send_success_notification(self, cycle_record: Dict, full_result: Dict):
        """Send success notification email"""
        try:
            if not self.email_password:
                logger.info("📧 Email password not set, skipping notification")
                return
            
            subject = f"✅ Minerva Outreach Success - {cycle_record['outreach_sent']} messages sent"
            
            body = f"""
Minerva Outreach Cycle Complete!

🎯 Cycle ID: {cycle_record['cycle_id']}
📊 Leads Processed: {cycle_record['leads_processed']}
🎨 Demos Generated: {cycle_record['demos_generated']}
📱 Outreach Sent: {cycle_record['outreach_sent']}
💰 Potential Value: ${cycle_record['estimated_value']}
📅 Daily Total: {cycle_record['daily_total']}/{self.max_daily_outreach}

Next Actions:
{chr(10).join(f'• {action}' for action in full_result.get('next_actions', []))}

View demos: http://localhost:8005

Keep up the great work!
- Minerva 🤖
"""
            
            self._send_email(subject, body)
            
        except Exception as e:
            logger.error(f"Failed to send success notification: {e}")
    
    def _send_error_notification(self, error_message: str):
        """Send error notification email"""
        try:
            if not self.email_password:
                return
            
            subject = "❌ Minerva Outreach Error"
            body = f"""
Minerva encountered an error during scheduled outreach:

Error: {error_message}
Time: {datetime.now().isoformat()}

Please check the logs and system status.

- Minerva 🤖
"""
            
            self._send_email(subject, body)
            
        except Exception as e:
            logger.error(f"Failed to send error notification: {e}")
    
    def _send_weekly_report(self, report: Dict):
        """Send weekly performance report"""
        try:
            if not self.email_password:
                return
            
            subject = f"📊 Minerva Weekly Report - {report['outreach_sent']} Total Outreach"
            
            body = f"""
Minerva Weekly Performance Report

📅 Week Ending: {report['week_ending'][:10]}
🔄 Cycles Run: {report['cycles_run']}
📊 Leads Processed: {report['leads_processed']}
🎨 Demos Generated: {report['demos_generated']}
📱 Outreach Sent: {report['outreach_sent']}
💰 Potential Revenue: ${report['potential_revenue']}

Performance Insights:
{chr(10).join(f'• {insight}' for insight in report['performance_insights'])}

Recommendations:
{chr(10).join(f'• {rec}' for rec in report['recommendations'])}

Demo Analytics:
• Total Demos: {report['demo_analytics'].get('total_demos_generated', 0)}
• Time Saved: {report['demo_analytics'].get('estimated_time_saved', 'N/A')}

Dashboard: http://localhost:8005

Keep scaling!
- Minerva 🤖
"""
            
            self._send_email(subject, body)
            
        except Exception as e:
            logger.error(f"Failed to send weekly report: {e}")
    
    def _send_email(self, subject: str, body: str):
        """Send email notification"""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.email_user
            msg['To'] = self.notification_email
            msg['Subject'] = subject
            
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.email_user, self.email_password)
            server.sendmail(self.email_user, self.notification_email, msg.as_string())
            server.quit()
            
            logger.info(f"📧 Email sent: {subject}")
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
    
    def setup_schedule(self):
        """Setup the automatic scheduling"""
        logger.info("⏰ Setting up Minerva schedule...")
        
        # Load historical data
        self._load_cycle_history()
        
        # Schedule outreach cycles
        schedule.every().day.at("09:00").do(self.run_scheduled_outreach, max_leads=3)  # Morning
        schedule.every().day.at("14:00").do(self.run_scheduled_outreach, max_leads=2)  # Afternoon
        
        # Schedule weekly report
        schedule.every().monday.at("08:00").do(self.run_weekly_analytics)
        
        logger.info("✅ Schedule configured:")
        logger.info("   📅 Daily outreach: 9:00 AM (3 leads), 2:00 PM (2 leads)")
        logger.info("   📊 Weekly report: Monday 8:00 AM")
        logger.info(f"   📧 Notifications: {self.notification_email}")
    
    def run_scheduler(self):
        """Run the scheduler loop"""
        logger.info("🚀 Starting Minerva Auto Scheduler...")
        logger.info("   Press Ctrl+C to stop")
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
                
        except KeyboardInterrupt:
            logger.info("🛑 Scheduler stopped by user")
        except Exception as e:
            logger.error(f"❌ Scheduler error: {e}")
            self._send_error_notification(f"Scheduler crashed: {e}")

# CLI
if __name__ == "__main__":
    import sys
    
    scheduler = MinervaAutoScheduler()
    
    if len(sys.argv) < 2:
        print("🤖 Minerva Auto Scheduler - 24/7 Client Acquisition")
        print("\nCommands:")
        print("  python minerva_auto_scheduler.py start     - Start the scheduler")
        print("  python minerva_auto_scheduler.py test      - Test a single cycle")
        print("  python minerva_auto_scheduler.py report    - Generate weekly report")
        print("  python minerva_auto_scheduler.py status    - Show current status")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "start":
        scheduler.setup_schedule()
        scheduler.run_scheduler()
        
    elif command == "test":
        print("🧪 Testing scheduled outreach...")
        scheduler.run_scheduled_outreach(max_leads=2)
        
    elif command == "report":
        print("📊 Generating weekly report...")
        scheduler.run_weekly_analytics()
        
    elif command == "status":
        print(f"📊 Minerva Scheduler Status:")
        print(f"   Daily outreach sent: {scheduler.daily_outreach_sent}/{scheduler.max_daily_outreach}")
        print(f"   Cycle history: {len(scheduler.cycle_history)} cycles")
        print(f"   Notification email: {scheduler.notification_email}")
        
    else:
        print(f"Unknown command: {command}") 