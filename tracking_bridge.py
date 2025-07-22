#!/usr/bin/env python3
"""
Tracking Bridge - CLI interface for Node.js backend to call Python tracking functions
"""

import sys
import json
import logging
from demo_tracking_integration import DemoTrackingIntegration
from lead_tracker import LeadTracker

# Suppress logs for CLI output
logging.basicConfig(level=logging.ERROR)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        sys.exit(1)
    
    command = sys.argv[1]
    integration = DemoTrackingIntegration()
    tracker = LeadTracker()
    
    try:
        if command == "get_dashboard_data":
            result = integration.get_dashboard_data()
            print(json.dumps(result))
            
        elif command == "get_activity":
            if len(sys.argv) < 3:
                print(json.dumps({"error": "Lead ID required"}))
                sys.exit(1)
            lead_id = sys.argv[2]
            result = tracker.get_lead_activity(lead_id)
            print(json.dumps(result))
            
        elif command == "update_status":
            if len(sys.argv) < 4:
                print(json.dumps({"error": "Lead ID and status required"}))
                sys.exit(1)
            lead_id = sys.argv[2]
            status = sys.argv[3]
            notes = sys.argv[4] if len(sys.argv) > 4 else None
            success = tracker.update_lead_status(lead_id, status, notes)
            print(json.dumps({"success": success}))
            
        elif command == "track_view":
            if len(sys.argv) < 5:
                print(json.dumps({"error": "Demo ID, Lead ID, and tracking token required"}))
                sys.exit(1)
            demo_id = sys.argv[2]
            lead_id = sys.argv[3]
            tracking_token = sys.argv[4]
            user_agent = sys.argv[5] if len(sys.argv) > 5 else None
            result = integration.handle_demo_view(demo_id, lead_id, tracking_token, user_agent)
            print(json.dumps(result))
            
        elif command == "track_click":
            if len(sys.argv) < 5:
                print(json.dumps({"error": "Demo ID, Lead ID, and CTA type required"}))
                sys.exit(1)
            demo_id = sys.argv[2]
            lead_id = sys.argv[3]
            cta_type = sys.argv[4]
            user_agent = sys.argv[5] if len(sys.argv) > 5 else None
            result = integration.handle_cta_click(demo_id, lead_id, cta_type, user_agent)
            print(json.dumps(result))
            
        elif command == "generate_tracked_demo":
            if len(sys.argv) < 3:
                print(json.dumps({"error": "Business data required"}))
                sys.exit(1)
            business_data = json.loads(sys.argv[2])
            result = integration.generate_tracked_demo(business_data)
            print(json.dumps(result))
            
        elif command == "handle_inbound_message":
            if len(sys.argv) < 4:
                print(json.dumps({"error": "Contact info and message content required"}))
                sys.exit(1)
            contact_info = sys.argv[2]
            message_content = sys.argv[3]
            message_type = sys.argv[4] if len(sys.argv) > 4 else 'unknown'
            result = integration.handle_inbound_message(contact_info, message_content, message_type)
            print(json.dumps(result))
            
        else:
            print(json.dumps({"error": f"Unknown command: {command}"}))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main() 