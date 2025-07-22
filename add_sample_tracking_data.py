#!/usr/bin/env python3
"""
Add Sample Tracking Data - Add demo views, clicks, and messages to existing leads
"""

import os
import sys
import json
import random
from datetime import datetime, timedelta

try:
    from lead_tracker import LeadTracker
    from demo_tracking_integration import DemoTrackingIntegration
except ImportError:
    print("❌ Tracking modules not found. Make sure you're in the right directory and have run the setup.")
    sys.exit(1)

def add_sample_tracking_data():
    """Add realistic tracking data to existing leads"""
    
    print("🎯 Adding Sample Tracking Data to Your Leads")
    print("=" * 50)
    
    tracker = LeadTracker()
    integration = DemoTrackingIntegration()
    
    # Sample company data that matches your existing leads
    sample_companies = [
        {
            'id': '1',
            'name': 'Tony\'s Plumbing',
            'phone': '(555) 123-4567',
            'email': 'tony@tonysplumbing.com'
        },
        {
            'id': '2', 
            'name': 'Superior Widget',
            'phone': '(555) 234-5678',
            'email': 'info@superiorwidget.com'
        },
        {
            'id': '3',
            'name': 'Demo Client',
            'phone': '(555) 345-6789',
            'email': 'demo@democlient.com'
        },
        {
            'id': '4',
            'name': 'Test Client',
            'phone': '(555) 456-7890',
            'email': 'test@testclient.com'
        }
    ]
    
    # Add tracking data for each company
    for company in sample_companies:
        lead_id = company['id']
        
        # Simulate different engagement levels
        engagement_level = random.choice(['hot', 'warm', 'cold', 'new'])
        
        if engagement_level == 'hot':
            # High engagement - viewed multiple times, clicked CTA, sent message
            demo_views = random.randint(3, 8)
            cta_clicks = random.randint(1, 3)
            messages = random.randint(1, 2)
            status = random.choice(['interested', 'messaged_back'])
            
        elif engagement_level == 'warm':
            # Medium engagement - viewed demo, maybe clicked
            demo_views = random.randint(1, 3)
            cta_clicks = random.randint(0, 1) 
            messages = 0
            status = 'viewed_demo'
            
        elif engagement_level == 'cold':
            # Low engagement - demo sent but not viewed
            demo_views = 0
            cta_clicks = 0
            messages = 0
            status = 'demo_sent'
            
        else:  # new
            # No engagement yet
            demo_views = 0
            cta_clicks = 0
            messages = 0
            status = 'new'
        
        # Add the lead to tracker
        business_data = {
            'id': lead_id,
            'name': company['name'],
            'phone': company['phone'],
            'email': company['email'],
            'businessType': 'service'
        }
        tracker.add_lead(business_data)
        
        # Simulate demo views
        for i in range(demo_views):
            demo_id = f"{company['name'].lower().replace(' ', '_')}_demo"
            timestamp = datetime.now() - timedelta(days=random.randint(0, 7), hours=random.randint(0, 23))
            tracker.track_demo_view(demo_id, lead_id, timestamp.isoformat())
        
        # Simulate CTA clicks
        for i in range(cta_clicks):
            demo_id = f"{company['name'].lower().replace(' ', '_')}_demo"
            timestamp = datetime.now() - timedelta(days=random.randint(0, 5), hours=random.randint(0, 23))
            tracker.track_cta_click(demo_id, lead_id, 'contact_us', timestamp.isoformat())
        
        # Simulate messages
        for i in range(messages):
            timestamp = datetime.now() - timedelta(days=random.randint(0, 3), hours=random.randint(0, 23))
            message_content = random.choice([
                "Yes, I'm interested in a website!",
                "Can we schedule a call?",
                "How much would this cost?",
                "I like the design, tell me more"
            ])
            tracker.log_message(lead_id, 'reply', 'inbound', message_content, timestamp.isoformat())
        
        # Update status
        tracker.update_lead_status(lead_id, status)
        
        # Print what we added
        engagement_emoji = {
            'hot': '🔥',
            'warm': '🌡️', 
            'cold': '❄️',
            'new': '⭐'
        }
        
        print(f"{engagement_emoji[engagement_level]} {company['name']}")
        print(f"   👀 {demo_views} demo views")
        print(f"   🖱️ {cta_clicks} CTA clicks") 
        print(f"   💬 {messages} messages")
        print(f"   📊 Status: {status}")
        print()
    
    print("✅ Sample tracking data added!")
    print()
    print("🎯 Now check your admin UI:")
    print("   1. Go to http://localhost:5173")
    print("   2. Click on 'Leads' tab")
    print("   3. You should see tracking badges on each lead card!")
    print()
    print("Look for:")
    print("   👀 Demo view counts")
    print("   🖱️ CTA click counts")
    print("   💬 Message counts")
    print("   📊 Engagement status badges")

if __name__ == "__main__":
    add_sample_tracking_data() 