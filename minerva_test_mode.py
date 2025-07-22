#!/usr/bin/env python3
"""
Minerva Test Mode - Safe testing with your own contact info
Perfect for validating the system before contacting real prospects
"""

import json
import logging
from datetime import datetime
from minerva_smart_outreach import MinervaSmartOutreach

logger = logging.getLogger(__name__)

class MinervaTestMode:
    """
    Safe testing mode using your own contact information
    Tests the complete pipeline without bothering real prospects
    """
    
    def __init__(self):
        self.outreach = MinervaSmartOutreach()
        
        # Your test contact information (replace with your actual details)
        self.test_contact = {
            'email': 'ben04537@gmail.com',  # Your email
            'phone': '(207) 380-5680',      # Your phone 
            'name': 'Ben Dickinson'         # Your name
        }
        
        logger.info("🧪 Minerva Test Mode initialized - Safe testing environment")
    
    def create_test_businesses(self):
        """Create realistic test businesses using your contact info"""
        test_businesses = [
            {
                'name': 'Ben\'s Test Plumbing Co',
                'businessType': 'plumbing',
                'email': self.test_contact['email'],
                'phone': self.test_contact['phone'],
                'address': '123 Test Street, Portland, ME 04101',
                'rating': '4.8',
                'score': 85,
                'stage': 'scraped',
                'id': 99901
            },
            {
                'name': 'Test Bistro & Grill',
                'businessType': 'restaurant', 
                'email': self.test_contact['email'],
                'phone': self.test_contact['phone'],
                'address': '456 Demo Avenue, Camden, ME 04843',
                'rating': '4.6',
                'score': 90,
                'stage': 'scraped',
                'id': 99902
            },
            {
                'name': 'Demo Landscaping Services',
                'businessType': 'landscaping',
                'email': self.test_contact['email'],
                'phone': self.test_contact['phone'],
                'address': '789 Sample Road, Freeport, ME 04032',
                'rating': '4.9',
                'score': 88,
                'stage': 'scraped',
                'id': 99903
            },
            {
                'name': 'Test Electric & Lighting',
                'businessType': 'electrical',
                'email': self.test_contact['email'],
                'phone': self.test_contact['phone'],
                'address': '321 Trial Lane, Bangor, ME 04401',
                'rating': '4.7',
                'score': 82,
                'stage': 'scraped',
                'id': 99904
            },
            {
                'name': 'Sample Dental Practice',
                'businessType': 'dental',
                'email': self.test_contact['email'],
                'phone': self.test_contact['phone'],
                'address': '654 Example Drive, Augusta, ME 04330',
                'rating': '4.9',
                'score': 95,
                'stage': 'scraped',
                'id': 99905
            }
        ]
        
        return test_businesses
    
    def run_safe_test(self, num_businesses=3):
        """Run complete outreach test with your own contact info"""
        try:
            print("🧪 MINERVA SAFE TEST MODE")
            print("=" * 50)
            print(f"📧 All demos and messages will be sent to: {self.test_contact['email']}")
            print(f"📱 Phone number in messages: {self.test_contact['phone']}")
            print(f"👤 Testing under name: {self.test_contact['name']}")
            print()
            
            # Get test businesses
            test_businesses = self.create_test_businesses()[:num_businesses]
            
            results = []
            demos_created = []
            
            for i, business in enumerate(test_businesses, 1):
                print(f"🎯 Test {i}/{len(test_businesses)}: {business['name']}")
                print(f"   🏷️ Type: {business['businessType']}")
                print(f"   📊 Score: {business['score']}")
                
                # Step 1: Generate demo
                demo = self.outreach.visual_generator.generate_demo_website(business)
                if demo.get('error'):
                    print(f"   ❌ Demo failed: {demo['error']}")
                    continue
                
                print(f"   ✅ Demo created: {demo['demo_id']}")
                print(f"   🔗 Preview: {demo['preview_url']}")
                demos_created.append(demo)
                
                # Step 2: Generate outreach messages (but don't actually send)
                sms_result = self.outreach._send_sms_with_demo(business, demo)
                email_result = self.outreach._send_email_with_demo(business, demo)
                
                print(f"   📱 SMS message prepared:")
                print(f"      To: {sms_result['phone']}")
                print(f"      Preview: {sms_result['message'][:80]}...")
                
                print(f"   📧 Email message prepared:")
                email_subject = email_result['message'].split('\\n')[0].replace('Subject: ', '')
                print(f"      To: {email_result['email']}")
                print(f"      Subject: {email_subject}")
                print()
                
                results.append({
                    'business': business,
                    'demo': demo,
                    'sms': sms_result,
                    'email': email_result
                })
            
            # Summary
            print("🎉 SAFE TEST COMPLETE!")
            print("=" * 50)
            print(f"✅ {len(demos_created)} professional demos created")
            print(f"✅ {len(results)} complete outreach packages ready")
            print(f"✅ All targeting your test contact: {self.test_contact['email']}")
            print()
            
            print("📁 Generated demos you can view:")
            for demo in demos_created:
                print(f"   🔗 {demo['business_name']}: {demo['html_file']}")
            
            print()
            print("🚀 Next steps:")
            print("   1. Open the demo HTML files to see the generated websites")
            print("   2. Review the SMS/email messages above")
            print("   3. When ready, update contact info for real prospects")
            print("   4. Enable actual sending (currently in preview mode)")
            
            return {
                'status': 'success',
                'demos_created': len(demos_created),
                'messages_prepared': len(results),
                'test_contact': self.test_contact,
                'results': results
            }
            
        except Exception as e:
            logger.error(f"Test failed: {e}")
            return {'status': 'error', 'error': str(e)}
    
    def preview_outreach_message(self, business_type='plumbing'):
        """Preview what an outreach message would look like"""
        test_businesses = self.create_test_businesses()
        business = next((b for b in test_businesses if b['businessType'] == business_type), test_businesses[0])
        
        print(f"🎭 PREVIEW: Outreach for {business_type.title()} Business")
        print("=" * 50)
        
        # Generate demo
        demo = self.outreach.visual_generator.generate_demo_website(business)
        
        if demo.get('error'):
            print(f"❌ Demo generation failed: {demo['error']}")
            return
        
        # Generate messages
        sms = self.outreach._send_sms_with_demo(business, demo)
        email = self.outreach._send_email_with_demo(business, demo)
        
        print(f"📱 SMS MESSAGE:")
        print(f"   To: {sms['phone']}")
        print(f"   Text: {sms['message']}")
        print()
        
        print(f"📧 EMAIL MESSAGE:")
        print(f"   To: {email['email']}")
        print(f"   Content: {email['message'][:300]}...")
        print()
        
        print(f"🔗 Demo URL: {demo['preview_url']}")
        print(f"📁 Demo file: {demo['html_file']}")
    
    def show_available_templates(self):
        """Show all available business type templates"""
        templates = self.outreach.visual_generator.templates.keys()
        
        print("🎨 AVAILABLE DEMO TEMPLATES:")
        print("=" * 30)
        for template in templates:
            template_data = self.outreach.visual_generator.templates[template]
            print(f"🏷️ {template.title()}")
            print(f"   Colors: {template_data['color_primary']} / {template_data['color_secondary']}")
            print(f"   CTA: {template_data['cta_text']}")
            print()

if __name__ == "__main__":
    import sys
    
    test_mode = MinervaTestMode()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "run":
            num_tests = int(sys.argv[2]) if len(sys.argv) > 2 else 3
            result = test_mode.run_safe_test(num_tests)
            
        elif command == "preview":
            business_type = sys.argv[2] if len(sys.argv) > 2 else 'plumbing'
            test_mode.preview_outreach_message(business_type)
            
        elif command == "templates":
            test_mode.show_available_templates()
            
        else:
            print(f"Unknown command: {command}")
    else:
        print("🧪 Minerva Test Mode - Safe Testing Environment")
        print()
        print("Commands:")
        print("  python minerva_test_mode.py run [number]    - Run safe test with your contact info")
        print("  python minerva_test_mode.py preview [type]  - Preview outreach for business type")
        print("  python minerva_test_mode.py templates       - Show available demo templates")
        print()
        print("Examples:")
        print("  python minerva_test_mode.py run 3          - Test 3 different business types")
        print("  python minerva_test_mode.py preview restaurant - Preview restaurant outreach")
        print("  python minerva_test_mode.py templates      - See all available templates") 