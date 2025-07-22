#!/usr/bin/env python3
"""
Generate Professional Demos for R2 Upload
Creates client-ready demos with clean filenames
"""

import sys
import os
sys.path.append('..')

from minerva_visual_generator import MinervaVisualGenerator
import datetime

def create_professional_demos():
    """Generate demos for different business types with professional filenames"""
    
    generator = MinervaVisualGenerator()
    
    # Professional demo businesses
    demo_businesses = [
        {
            'name': 'Coastal Plumbing Services',
            'businessType': 'plumbing',
            'email': 'info@coastalplumbing.com',
            'phone': '(207) 555-0123',
            'address': '45 Harbor Road, Portland, ME 04101',
            'rating': '4.8',
            'score': 92,
            'filename': 'coastal-plumbing-demo.html'
        },
        {
            'name': 'The Harbor Bistro',
            'businessType': 'restaurant',
            'email': 'reservations@harborbistro.com', 
            'phone': '(207) 555-0456',
            'address': '123 Ocean View Drive, Bar Harbor, ME 04609',
            'rating': '4.9',
            'score': 95,
            'filename': 'harbor-bistro-demo.html'
        },
        {
            'name': 'Green Thumb Landscaping',
            'businessType': 'landscaping',
            'email': 'hello@greenthumbme.com',
            'phone': '(207) 555-0789', 
            'address': '78 Garden Way, Freeport, ME 04032',
            'rating': '4.7',
            'score': 89,
            'filename': 'green-thumb-landscaping-demo.html'
        },
        {
            'name': 'Lighthouse Electrical',
            'businessType': 'electrical',
            'email': 'service@lighthouseelectric.com',
            'phone': '(207) 555-0321',
            'address': '92 Beacon Street, Camden, ME 04843',
            'rating': '4.8',
            'score': 91,
            'filename': 'lighthouse-electrical-demo.html'
        },
        {
            'name': 'Seaside Family Dental',
            'businessType': 'dental',
            'email': 'appointments@seasidedental.com',
            'phone': '(207) 555-0654',
            'address': '156 Coastal Highway, Kennebunkport, ME 04046',
            'rating': '4.9',
            'score': 96,
            'filename': 'seaside-dental-demo.html'
        }
    ]
    
    print("🎨 Generating Professional Demos...")
    print("=" * 50)
    
    generated_demos = []
    
    for business in demo_businesses:
        print(f"Creating demo for {business['name']}...")
        
        # Generate the demo
        demo = generator.generate_demo_website(business)
        
        if demo.get('error'):
            print(f"   ❌ Error: {demo['error']}")
            continue
        
        # Copy to professional filename
        original_file = demo['html_file']
        professional_file = f"demos/{business['filename']}"
        
        # Copy the file
        os.system(f"cp '{original_file}' '{professional_file}'")
        
        demo_info = {
            'business_name': business['name'],
            'business_type': business['businessType'],
            'filename': business['filename'],
            'local_url': f"http://localhost:8000/{business['filename']}",
            'future_url': f"https://demos.pleasantcovedesign.com/{business['filename']}"
        }
        
        generated_demos.append(demo_info)
        
        print(f"   ✅ Created: {business['filename']}")
        print(f"   🔗 Local: {demo_info['local_url']}")
        print(f"   🌐 Future: {demo_info['future_url']}")
        print()
    
    print("🎉 DEMO GENERATION COMPLETE!")
    print("=" * 50)
    print(f"✅ {len(generated_demos)} professional demos created")
    print()
    
    print("📋 NEXT STEPS:")
    print("1. Upload these files to your R2 bucket:")
    for demo in generated_demos:
        print(f"   • {demo['filename']}")
    print()
    print("2. Set up custom domain: demos.pleasantcovedesign.com")
    print("3. Share professional URLs with clients!")
    print()
    
    print("🔗 DEMO URLS (after domain setup):")
    for demo in generated_demos:
        print(f"   {demo['business_name']}: {demo['future_url']}")
    
    return generated_demos

if __name__ == "__main__":
    create_professional_demos() 