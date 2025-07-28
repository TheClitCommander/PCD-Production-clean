#!/usr/bin/env python3
"""
Demo Review Queue - Lock & Load System for Pleasant Cove Design
Generates demos but requires manual review before sending
"""

import json
import os
from datetime import datetime
from minerva_visual_generator import MinervaVisualGenerator
import requests

class DemoReviewQueue:
    def __init__(self):
        self.visual_generator = MinervaVisualGenerator()
        self.queue_file = "demo_review_queue.json"
        self.backend_url = "http://localhost:3000"
        
    def load_queue(self):
        """Load pending demos from file"""
        if os.path.exists(self.queue_file):
            with open(self.queue_file, 'r') as f:
                return json.load(f)
        return []
    
    def save_queue(self, queue):
        """Save queue to file"""
        with open(self.queue_file, 'w') as f:
            json.dump(queue, f, indent=2)
    
    def process_new_inquiry(self, lead_data):
        """
        Called when new high-priority lead comes in
        Generates demo but doesn't send - adds to review queue
        """
        print(f"🎯 Processing inquiry from {lead_data.get('name', 'Unknown')}")
        
        # Only process high-priority leads with known business types
        if lead_data.get('score', 0) < 80:
            print("❌ Lead score too low for auto-demo")
            return
            
        if lead_data.get('businessType', 'unknown') == 'unknown':
            print("❌ Business type unknown - can't generate relevant demo")
            return
        
        # Generate the demo
        print(f"🎨 Generating {lead_data['businessType']} demo...")
        demo_result = self.visual_generator.generate_demo_website({
            'name': lead_data.get('name', 'Your Business'),
            'business_type': lead_data.get('businessType'),
            'city': lead_data.get('city', 'Your City'),
            'email': lead_data.get('email'),
            'phone': lead_data.get('phone')
        })
        
        if demo_result.get('error'):
            print(f"❌ Demo generation failed: {demo_result['error']}")
            return
        
        # Add to review queue
        queue = self.load_queue()
        queue.append({
            'id': f"demo_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            'lead': lead_data,
            'demo_url': demo_result['demo_url'],
            'demo_path': demo_result['file_path'],
            'created_at': datetime.now().isoformat(),
            'status': 'pending_review',
            'score': lead_data.get('score', 0),
            'message': lead_data.get('message', '')
        })
        
        self.save_queue(queue)
        print(f"✅ Demo queued for review: {demo_result['demo_url']}")
        
        # Notify admin (you)
        self.notify_admin(lead_data, demo_result['demo_url'])
        
    def notify_admin(self, lead_data, demo_url):
        """Send notification to admin dashboard"""
        try:
            # Create activity in your system
            requests.post(f"{self.backend_url}/api/activities", json={
                'type': 'demo_ready',
                'businessId': lead_data.get('id', 0),
                'description': f"Demo ready for review: {lead_data.get('name')}",
                'metadata': json.dumps({
                    'demo_url': demo_url,
                    'business_type': lead_data.get('businessType'),
                    'score': lead_data.get('score')
                })
            })
        except Exception as e:
            print(f"Failed to notify admin: {e}")
    
    def get_pending_demos(self):
        """Get all demos waiting for review"""
        queue = self.load_queue()
        return [d for d in queue if d['status'] == 'pending_review']
    
    def approve_and_send(self, demo_id, custom_message=None):
        """Approve a demo and send to customer"""
        queue = self.load_queue()
        
        for demo in queue:
            if demo['id'] == demo_id:
                # Send the demo email
                lead = demo['lead']
                subject = f"Your Custom Website Design - {lead['name']}"
                
                message = custom_message or f"""
Hi {lead.get('name', 'there')},

Thanks for reaching out! Based on what you told us about your {lead.get('businessType', 'business')}, 
I've created a custom website demo just for you.

Check it out here: {demo['demo_url']}

This is just a starting point - we can customize everything to match your exact vision.

Ready to discuss? Reply to this email or give me a call at (207) 200-4281.

Best,
Ben
Pleasant Cove Design
"""
                
                # Update status
                demo['status'] = 'sent'
                demo['sent_at'] = datetime.now().isoformat()
                
                self.save_queue(queue)
                print(f"✅ Demo approved and sent to {lead['email']}")
                
                # Log the activity
                self.notify_admin(lead, f"Demo sent to {lead['email']}")
                
                return True
        
        return False
    
    def reject_demo(self, demo_id, reason=None):
        """Reject a demo (won't be sent)"""
        queue = self.load_queue()
        
        for demo in queue:
            if demo['id'] == demo_id:
                demo['status'] = 'rejected'
                demo['rejected_at'] = datetime.now().isoformat()
                demo['rejection_reason'] = reason
                
                self.save_queue(queue)
                print(f"❌ Demo rejected: {reason}")
                return True
        
        return False

# CLI Interface
if __name__ == "__main__":
    import sys
    
    queue = DemoReviewQueue()
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python demo_review_queue.py list              # Show pending demos")
        print("  python demo_review_queue.py approve <demo_id> # Approve and send")
        print("  python demo_review_queue.py reject <demo_id>  # Reject demo")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "list":
        pending = queue.get_pending_demos()
        if not pending:
            print("No demos pending review")
        else:
            print(f"\n🎯 {len(pending)} Demos Pending Review:\n")
            for demo in pending:
                print(f"ID: {demo['id']}")
                print(f"Lead: {demo['lead']['name']} ({demo['lead']['businessType']})")
                print(f"Score: {demo['score']}")
                print(f"URL: {demo['demo_url']}")
                print(f"Created: {demo['created_at']}")
                print("-" * 50)
    
    elif command == "approve" and len(sys.argv) > 2:
        demo_id = sys.argv[2]
        if queue.approve_and_send(demo_id):
            print("✅ Demo approved and sent!")
        else:
            print("❌ Demo not found")
    
    elif command == "reject" and len(sys.argv) > 2:
        demo_id = sys.argv[2]
        reason = sys.argv[3] if len(sys.argv) > 3 else "Not relevant enough"
        if queue.reject_demo(demo_id, reason):
            print("❌ Demo rejected")
        else:
            print("❌ Demo not found") 