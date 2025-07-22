#!/usr/bin/env python3
"""
Demo Tracking Integration - Connects lead tracking with demo generation
"""

import logging
from lead_tracker import LeadTracker
from minerva_visual_generator import MinervaVisualGenerator
from minerva_smart_outreach import MinervaSmartOutreach

logger = logging.getLogger(__name__)

class DemoTrackingIntegration:
    """
    Integrates lead tracking with demo generation and outreach
    """
    
    def __init__(self):
        self.tracker = LeadTracker()
        self.visual_generator = MinervaVisualGenerator()
        self.outreach = MinervaSmartOutreach()
        
        logger.info("🔗 Demo Tracking Integration initialized")
    
    def generate_tracked_demo(self, business_data: dict) -> dict:
        """
        Generate a demo and automatically set up tracking
        """
        try:
            # Generate the demo
            demo_result = self.visual_generator.generate_demo_website(business_data)
            
            if demo_result.get('error'):
                return demo_result
            
            # Add lead to tracking system
            lead_id = self.tracker.add_lead(
                business_data, 
                demo_result['demo_id'], 
                demo_result['tracking_token']
            )
            
            # Update demo result with tracking info
            demo_result['lead_id'] = lead_id
            demo_result['tracking_enabled'] = True
            
            # Generate tracking URL for the demo
            tracking_url = f"https://demos.pleasantcovedesign.com/{demo_result['demo_id']}.html?lead_id={lead_id}&token={demo_result['tracking_token']}"
            demo_result['tracking_url'] = tracking_url
            
            logger.info(f"✅ Tracked demo generated for {business_data.get('name')}")
            return demo_result
            
        except Exception as e:
            logger.error(f"❌ Failed to generate tracked demo: {e}")
            return {'error': str(e)}
    
    def send_tracked_outreach(self, business_data: dict, demo_result: dict) -> dict:
        """
        Send outreach and track the campaign
        """
        try:
            lead_id = demo_result.get('lead_id')
            
            # Send SMS outreach
            sms_result = self.outreach._send_sms_with_demo(business_data, demo_result)
            
            # Log outbound SMS
            if not sms_result.get('error'):
                self.tracker.log_message(
                    lead_id, 
                    'sms', 
                    'outbound', 
                    sms_result['message'][:100] + '...', 
                    sender='Pleasant Cove Design',
                    recipient=sms_result['phone']
                )
                
                # Update status to demo_sent
                self.tracker.update_lead_status(lead_id, 'demo_sent', 'SMS outreach sent')
            
            # Send Email outreach
            email_result = self.outreach._send_email_with_demo(business_data, demo_result)
            
            # Log outbound email
            if not email_result.get('error'):
                self.tracker.log_message(
                    lead_id, 
                    'email', 
                    'outbound', 
                    email_result['message'][:100] + '...', 
                    sender='ben@pleasantcovedesign.com',
                    recipient=email_result['email']
                )
            
            return {
                'lead_id': lead_id,
                'sms_sent': not sms_result.get('error'),
                'email_sent': not email_result.get('error'),
                'tracking_active': True,
                'next_steps': [
                    'Monitor demo views in dashboard',
                    'Watch for CTA clicks',
                    'Respond to any replies promptly'
                ]
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to send tracked outreach: {e}")
            return {'error': str(e)}
    
    def handle_demo_view(self, demo_id: str, lead_id: str = None, tracking_token: str = None, 
                        user_agent: str = None, ip_address: str = None) -> dict:
        """
        Handle when someone views a demo (called from URL tracking)
        """
        try:
            # If no lead_id provided, try to find it by demo_id
            if not lead_id and demo_id:
                # You could look this up in your database
                pass
            
            # Track the view
            success = self.tracker.track_demo_view(lead_id, demo_id, tracking_token, user_agent, ip_address)
            
            if success:
                # Get updated lead info
                activity = self.tracker.get_lead_activity(lead_id)
                
                return {
                    'view_tracked': True,
                    'lead_status': activity['lead_info']['status'],
                    'total_views': activity['demo_views'],
                    'message': 'Demo view tracked successfully'
                }
            else:
                return {'view_tracked': False, 'error': 'Failed to track view'}
                
        except Exception as e:
            logger.error(f"❌ Failed to handle demo view: {e}")
            return {'view_tracked': False, 'error': str(e)}
    
    def handle_cta_click(self, demo_id: str, lead_id: str, cta_type: str, user_agent: str = None) -> dict:
        """
        Handle when someone clicks a CTA in the demo
        """
        try:
            success = self.tracker.track_cta_click(lead_id, demo_id, cta_type, user_agent)
            
            if success:
                activity = self.tracker.get_lead_activity(lead_id)
                
                return {
                    'click_tracked': True,
                    'lead_status': activity['lead_info']['status'],
                    'cta_type': cta_type,
                    'message': 'CTA click tracked - lead is interested!'
                }
            else:
                return {'click_tracked': False, 'error': 'Failed to track click'}
                
        except Exception as e:
            logger.error(f"❌ Failed to handle CTA click: {e}")
            return {'click_tracked': False, 'error': str(e)}
    
    def handle_inbound_message(self, contact_info: str, message_content: str, message_type: str = 'unknown') -> dict:
        """
        Handle when a lead replies via SMS/email
        """
        try:
            # Try to find the lead by phone or email
            leads = self.tracker.get_leads_by_status()  # Get all leads
            
            matching_lead = None
            for lead in leads:
                if (lead['phone'] and contact_info in lead['phone']) or \
                   (lead['email'] and contact_info in lead['email']):
                    matching_lead = lead
                    break
            
            if not matching_lead:
                logger.warning(f"⚠️ No matching lead found for contact: {contact_info}")
                return {'message_logged': False, 'error': 'Lead not found'}
            
            # Log the inbound message
            success = self.tracker.log_message(
                matching_lead['lead_id'],
                message_type,
                'inbound',
                message_content,
                sender=contact_info,
                recipient='Pleasant Cove Design'
            )
            
            if success:
                return {
                    'message_logged': True,
                    'lead_id': matching_lead['lead_id'],
                    'business_name': matching_lead['business_name'],
                    'new_status': 'messaged_back',
                    'action_needed': 'Respond to lead promptly!'
                }
            else:
                return {'message_logged': False, 'error': 'Failed to log message'}
                
        except Exception as e:
            logger.error(f"❌ Failed to handle inbound message: {e}")
            return {'message_logged': False, 'error': str(e)}
    
    def get_dashboard_data(self) -> dict:
        """
        Get data for the CRM dashboard
        """
        try:
            # Get engagement stats
            stats = self.tracker.get_engagement_stats()
            
            # Get recent activity (leads updated in last 7 days)
            all_leads = self.tracker.get_leads_by_status()
            
            # Categorize leads
            hot_leads = [l for l in all_leads if l['status'] in ['interested', 'messaged_back']]
            warm_leads = [l for l in all_leads if l['status'] in ['viewed_demo']]
            cold_leads = [l for l in all_leads if l['status'] in ['demo_sent', 'new']]
            dead_leads = [l for l in all_leads if l['status'] in ['ghosted', 'not_interested']]
            
            return {
                'overview': stats,
                'lead_categories': {
                    'hot': len(hot_leads),
                    'warm': len(warm_leads), 
                    'cold': len(cold_leads),
                    'dead': len(dead_leads)
                },
                'hot_leads': hot_leads[:10],  # Top 10 hot leads
                'recent_activity': all_leads[:20],  # 20 most recent
                'action_items': self._generate_action_items(all_leads)
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get dashboard data: {e}")
            return {'error': str(e)}
    
    def _generate_action_items(self, leads: list) -> list:
        """Generate action items based on lead activity"""
        action_items = []
        
        for lead in leads:
            # Follow up on hot leads
            if lead['status'] == 'interested' and lead['click_count'] > 0:
                action_items.append({
                    'priority': 'high',
                    'action': f"Call {lead['business_name']} - they clicked CTA!",
                    'lead_id': lead['lead_id'],
                    'contact': lead['phone']
                })
            
            # Follow up on viewed demos
            elif lead['status'] == 'viewed_demo' and lead['view_count'] > 1:
                action_items.append({
                    'priority': 'medium',
                    'action': f"Follow up with {lead['business_name']} - multiple demo views",
                    'lead_id': lead['lead_id'],
                    'contact': lead['email']
                })
            
            # Check on old leads
            elif lead['status'] == 'demo_sent':
                action_items.append({
                    'priority': 'low',
                    'action': f"Check if {lead['business_name']} received demo",
                    'lead_id': lead['lead_id'],
                    'contact': lead['phone']
                })
        
        return action_items[:10]  # Top 10 action items

if __name__ == "__main__":
    # Test the integration
    integration = DemoTrackingIntegration()
    
    print("🔗 Testing Demo Tracking Integration")
    print("=" * 40)
    
    # Test business
    test_business = {
        'id': 'test_integration_123',
        'name': 'Integration Test Plumbing',
        'email': 'test@integration.com',
        'phone': '(555) 999-8888',
        'businessType': 'plumbing',
        'address': '123 Test St, Portland, ME',
        'rating': '4.5',
        'score': 85
    }
    
    # Generate tracked demo
    print("1. Generating tracked demo...")
    demo_result = integration.generate_tracked_demo(test_business)
    print(f"   ✅ Demo: {demo_result.get('demo_id')}")
    print(f"   ✅ Lead ID: {demo_result.get('lead_id')}")
    print(f"   ✅ Tracking URL: {demo_result.get('tracking_url')}")
    
    # Simulate demo view
    print("\n2. Simulating demo view...")
    view_result = integration.handle_demo_view(
        demo_result['demo_id'], 
        demo_result['lead_id'], 
        demo_result['tracking_token']
    )
    print(f"   ✅ View tracked: {view_result['view_tracked']}")
    print(f"   ✅ New status: {view_result['lead_status']}")
    
    # Simulate CTA click
    print("\n3. Simulating CTA click...")
    click_result = integration.handle_cta_click(
        demo_result['demo_id'],
        demo_result['lead_id'],
        'contact'
    )
    print(f"   ✅ Click tracked: {click_result['click_tracked']}")
    print(f"   ✅ New status: {click_result['lead_status']}")
    
    # Get dashboard data
    print("\n4. Getting dashboard data...")
    dashboard = integration.get_dashboard_data()
    print(f"   ✅ Total leads: {dashboard['overview']['total_leads']}")
    print(f"   ✅ Hot leads: {dashboard['lead_categories']['hot']}")
    print(f"   ✅ Action items: {len(dashboard['action_items'])}")
    
    print("\n🎉 Integration test complete!") 