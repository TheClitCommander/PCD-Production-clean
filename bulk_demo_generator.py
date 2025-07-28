#!/usr/bin/env python3
"""
Bulk Demo Generator - Creates personalized demos for all scraped leads
This is the core of your cold outreach strategy: every business gets a custom demo
"""

import os
import json
import requests
from datetime import datetime
import subprocess

class BulkDemoGenerator:
    def __init__(self):
        # Use your existing demo creation system
        self.demo_creator = "create_industry_demo_templates.py"
        self.backend_url = "http://localhost:3000"
        self.leads_db = "data/businesses.db"  # Your scraped leads
        self.demos_generated = "demos_generated.json"
        
    def get_scraped_businesses(self):
        """Get all businesses from your scraper database"""
        try:
            # Try to get from your Pleasant Cove backend first
            response = requests.get(f"{self.backend_url}/api/businesses")
            if response.status_code == 200:
                businesses = response.json()
                print(f"📊 Found {len(businesses)} businesses from backend")
                return businesses
        except:
            print("Backend not available, checking local data...")
        
        # Fallback to local database or JSON files
        businesses = []
        
        # Check for JSON data files
        data_files = ["sample_businesses.json", "data/businesses.json", "leads.json", "scraped_data.json"]
        for file_path in data_files:
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        businesses.extend(data)
                    elif isinstance(data, dict) and 'businesses' in data:
                        businesses.extend(data['businesses'])
                print(f"📁 Loaded {len(businesses)} from {file_path}")
                break
        
        return businesses
    
    def load_generated_demos(self):
        """Load record of already generated demos"""
        if os.path.exists(self.demos_generated):
            with open(self.demos_generated, 'r') as f:
                return json.load(f)
        return {}
    
    def save_generated_demos(self, demos):
        """Save record of generated demos"""
        with open(self.demos_generated, 'w') as f:
            json.dump(demos, f, indent=2)
    
    def generate_demo_for_business(self, business):
        """Generate a tailored demo for a specific business"""
        business_name = business.get('name', 'Your Business')
        business_type = business.get('businessType') or business.get('category') or business.get('industry', 'general')
        city = business.get('city', 'Your City')
        
        print(f"🎨 Generating demo for {business_name} ({business_type})")
        
        # Prepare business data for demo generation
        demo_data = {
            'name': business_name,
            'business_type': business_type.lower(),
            'city': city,
            'email': business.get('email', ''),
            'phone': business.get('phone', ''),
            'address': business.get('address', ''),
            'website_exists': business.get('website', '') != '',
            'rating': business.get('rating', 0),
            'reviews': business.get('reviews', 0)
        }
        
        # Generate demo using your existing system
        try:
            # Call your existing demo creator with correct format
            result = subprocess.run([
                'python', self.demo_creator, 
                business_name,
                business_type.lower(),
                'modern'  # default style
            ], capture_output=True, text=True, cwd='.')
            
            if result.returncode != 0:
                print(f"❌ Failed to generate demo for {business_name}: {result.stderr}")
                return None
            
            # Parse the JSON response from your existing demo creator
            try:
                demo_result = json.loads(result.stdout)
                if not demo_result.get('success'):
                    print(f"❌ Demo creation failed: {demo_result.get('message', 'Unknown error')}")
                    return None
                
                demo_url = demo_result.get('demo_url')
                demo_path = demo_result.get('demo_path')
            except json.JSONDecodeError:
                print(f"❌ Failed to parse demo creation response")
                return None
            
            demo_info = {
                'business_id': business.get('id'),
                'business_name': business_name,
                'business_type': business_type,
                'demo_url': demo_url,
                'demo_path': demo_path,
                'generated_at': datetime.now().isoformat(),
                'business_data': business
            }
            
            print(f"✅ Demo generated: {demo_url}")
            return demo_info
            
        except Exception as e:
            print(f"❌ Failed to generate demo for {business_name}: {str(e)}")
            return None
    
    def generate_all_demos(self, limit=None, business_type_filter=None):
        """Generate demos for all scraped businesses"""
        print("🚀 Starting bulk demo generation...")
        
        # Get all scraped businesses
        businesses = self.get_scraped_businesses()
        if not businesses:
            print("❌ No businesses found. Please run scraper first.")
            return
        
        # Filter by business type if specified
        if business_type_filter:
            businesses = [b for b in businesses if business_type_filter.lower() in str(b.get('businessType', '')).lower()]
            print(f"🎯 Filtered to {len(businesses)} {business_type_filter} businesses")
        
        # Apply limit if specified
        if limit:
            businesses = businesses[:limit]
            print(f"📊 Processing first {limit} businesses")
        
        # Load existing demos to avoid duplicates
        generated_demos = self.load_generated_demos()
        
        new_demos = []
        skipped = 0
        
        for i, business in enumerate(businesses, 1):
            business_id = business.get('id') or business.get('name', f'business_{i}')
            
            # Skip if already generated
            if str(business_id) in generated_demos:
                print(f"⏭️  {i}/{len(businesses)}: {business.get('name')} - Already has demo")
                skipped += 1
                continue
            
            print(f"🎯 {i}/{len(businesses)}: Processing {business.get('name')}")
            
            # Generate demo
            demo_info = self.generate_demo_for_business(business)
            
            if demo_info:
                generated_demos[str(business_id)] = demo_info
                new_demos.append(demo_info)
                
                # Save progress every 5 demos
                if len(new_demos) % 5 == 0:
                    self.save_generated_demos(generated_demos)
                    print(f"💾 Progress saved: {len(new_demos)} new demos generated")
        
        # Final save
        self.save_generated_demos(generated_demos)
        
        print(f"\n🎉 Bulk demo generation complete!")
        print(f"✅ New demos generated: {len(new_demos)}")
        print(f"⏭️  Skipped (already existed): {skipped}")
        print(f"📊 Total demos available: {len(generated_demos)}")
        
        return new_demos
    
    def get_demo_for_business(self, business_name_or_id):
        """Get the demo URL for a specific business"""
        generated_demos = self.load_generated_demos()
        
        # Search by ID first
        if str(business_name_or_id) in generated_demos:
            return generated_demos[str(business_name_or_id)]
        
        # Search by name
        for demo_id, demo_info in generated_demos.items():
            if demo_info['business_name'].lower() == business_name_or_id.lower():
                return demo_info
        
        return None
    
    def list_generated_demos(self, business_type_filter=None):
        """List all generated demos"""
        generated_demos = self.load_generated_demos()
        
        demos = list(generated_demos.values())
        
        if business_type_filter:
            demos = [d for d in demos if business_type_filter.lower() in d['business_type'].lower()]
        
        print(f"\n📋 Generated Demos ({len(demos)} total):")
        print("-" * 60)
        
        for demo in demos:
            print(f"🏢 {demo['business_name']} ({demo['business_type']})")
            print(f"   🔗 {demo['demo_url']}")
            print(f"   📅 {demo['generated_at'][:10]}")
            print()
        
        return demos

# CLI Interface
if __name__ == "__main__":
    import sys
    
    generator = BulkDemoGenerator()
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python bulk_demo_generator.py generate [limit] [business_type]")
        print("  python bulk_demo_generator.py list [business_type]")
        print("  python bulk_demo_generator.py get <business_name>")
        print("\nExamples:")
        print("  python bulk_demo_generator.py generate 10 plumbing")
        print("  python bulk_demo_generator.py generate 50")
        print("  python bulk_demo_generator.py list")
        print("  python bulk_demo_generator.py get 'Acme Plumbing'")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "generate":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else None
        business_type = sys.argv[3] if len(sys.argv) > 3 else None
        
        demos = generator.generate_all_demos(limit, business_type)
        
        if demos:
            print(f"\n🎯 Ready for outreach! You now have {len(demos)} new personalized demos.")
            print("Next step: Use these demo URLs in your outreach messages!")
    
    elif command == "list":
        business_type = sys.argv[2] if len(sys.argv) > 2 else None
        generator.list_generated_demos(business_type)
    
    elif command == "get":
        if len(sys.argv) < 3:
            print("Please specify business name")
            sys.exit(1)
        
        business_name = sys.argv[2]
        demo = generator.get_demo_for_business(business_name)
        
        if demo:
            print(f"🎯 Demo for {demo['business_name']}:")
            print(f"🔗 {demo['demo_url']}")
        else:
            print(f"❌ No demo found for '{business_name}'")
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1) 