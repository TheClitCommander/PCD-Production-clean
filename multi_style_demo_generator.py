#!/usr/bin/env python3
"""
Multi-Style Demo Generator - Creates 5 different style demos for each business
Perfect for cold outreach: "Here are 5 website concepts for your business..."
"""

import os
import json
import requests
import subprocess
from datetime import datetime

class MultiStyleDemoGenerator:
    def __init__(self):
        self.demo_creator = "create_industry_demo_templates.py"
        self.backend_url = "http://localhost:3000"
        self.demos_generated = "multi_style_demos.json"
        
        # Define the 5 styles we'll create for each business
        self.styles = {
            "modern": {
                "name": "Modern & Clean",
                "description": "Contemporary design with bold typography and clean lines",
                "emoji": "🎨"
            },
            "professional": {
                "name": "Professional Business",
                "description": "Corporate-style design that builds trust and credibility",
                "emoji": "💼"
            },
            "minimal": {
                "name": "Minimalist",
                "description": "Clean, simple design focusing on content and clarity",
                "emoji": "✨"
            },
            "classic": {
                "name": "Classic & Timeless",
                "description": "Traditional design that never goes out of style",
                "emoji": "🏛️"
            },
            "bold": {
                "name": "Bold & Dynamic",
                "description": "Eye-catching design that stands out from competitors",
                "emoji": "🚀"
            }
        }
    
    def get_scraped_businesses(self):
        """Get all businesses from your scraper database or files"""
        try:
            # Try to get from your Pleasant Cove backend first
            response = requests.get(f"{self.backend_url}/api/businesses")
            if response.status_code == 200:
                businesses = response.json()
                print(f"📊 Found {len(businesses)} businesses from backend")
                return businesses
        except:
            print("Backend not available, checking local data...")
        
        # Fallback to local data files
        data_files = ["sample_businesses.json", "data/businesses.json", "leads.json", "scraped_data.json"]
        for file_path in data_files:
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        print(f"📁 Loaded {len(data)} businesses from {file_path}")
                        return data
                    elif isinstance(data, dict) and 'businesses' in data:
                        businesses = data['businesses']
                        print(f"📁 Loaded {len(businesses)} businesses from {file_path}")
                        return businesses
        
        return []
    
    def load_generated_demos(self):
        """Load record of already generated multi-style demos"""
        if os.path.exists(self.demos_generated):
            with open(self.demos_generated, 'r') as f:
                return json.load(f)
        return {}
    
    def save_generated_demos(self, demos):
        """Save record of generated demos"""
        with open(self.demos_generated, 'w') as f:
            json.dump(demos, f, indent=2)
    
    def generate_style_demo(self, business, style_key):
        """Generate a single style demo for a business"""
        business_name = business.get('name', 'Your Business')
        business_type = business.get('businessType') or business.get('category') or business.get('industry', 'general')
        
        try:
            # Call your existing demo creator with specific style
            result = subprocess.run([
                'python', self.demo_creator, 
                business_name,
                business_type.lower(),
                style_key
            ], capture_output=True, text=True, cwd='.')
            
            if result.returncode != 0:
                print(f"❌ Failed to generate {style_key} demo for {business_name}: {result.stderr}")
                return None
            
            # Parse the JSON response
            try:
                demo_result = json.loads(result.stdout)
                if not demo_result.get('success'):
                    print(f"❌ {style_key} demo creation failed: {demo_result.get('message', 'Unknown error')}")
                    return None
                
                return {
                    'style': style_key,
                    'style_name': self.styles[style_key]['name'],
                    'demo_url': demo_result.get('demo_url'),
                    'demo_path': demo_result.get('demo_path'),
                    'generated_at': datetime.now().isoformat()
                }
                
            except json.JSONDecodeError:
                print(f"❌ Failed to parse {style_key} demo response")
                return None
                
        except Exception as e:
            print(f"❌ Error generating {style_key} demo for {business_name}: {str(e)}")
            return None
    
    def create_unified_demo_experience(self, business, style_demos, timestamp):
        """Create a unified demo experience page that showcases all 5 styles"""
        business_name = business.get('name', 'Your Business')
        business_type = business.get('businessType') or business.get('category') or business.get('industry', 'general')
        
        # Copy the multi-style experience template to a business-specific file
        safe_name = business_name.lower().replace(' ', '_').replace('&', 'and')
        unified_filename = f"multi_style_{safe_name}_{business_type}_{timestamp}.html"
        unified_filepath = os.path.join("demos", unified_filename)
        
        # Create demos directory if it doesn't exist
        if not os.path.exists("demos"):
            os.makedirs("demos")
        
        # Read the original template
        template_path = "pleasant_cove_demo_experience.html"
        if not os.path.exists(template_path):
            print(f"❌ Template not found: {template_path}")
            return None
            
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                template_content = f.read()
            
            # Generate the URL with parameters for the unified experience
            base_url = "https://pleasantcovedesign-production.up.railway.app/api/demos"
            unified_url = f"{base_url}/{unified_filename}?company={business_name}&industry={business_type}&timestamp={timestamp}&base_url={base_url}"
            
            # Create the business-specific unified experience file
            with open(unified_filepath, 'w', encoding='utf-8') as f:
                f.write(template_content)
            
            print(f"📄 Created unified experience: {unified_filepath}")
            return unified_url
            
        except Exception as e:
            print(f"❌ Failed to create unified demo experience: {str(e)}")
            return None
    
    def generate_all_styles_for_business(self, business):
        """Generate all 5 style demos for a single business"""
        business_name = business.get('name', 'Your Business')
        business_id = business.get('id', business_name)
        
        print(f"\n🎨 Generating 5 style demos for {business_name}")
        
        style_demos = {}
        success_count = 0
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        for style_key in self.styles.keys():
            print(f"  {self.styles[style_key]['emoji']} Creating {self.styles[style_key]['name']} style...")
            
            demo_info = self.generate_style_demo(business, style_key)
            if demo_info:
                style_demos[style_key] = demo_info
                success_count += 1
                print(f"    ✅ {demo_info['demo_url']}")
            else:
                print(f"    ❌ Failed")
        
        if success_count > 0:
            # Create unified multi-style experience page
            unified_demo_url = self.create_unified_demo_experience(business, style_demos, timestamp)
            
            business_demos = {
                'business_id': business_id,
                'business_name': business_name,
                'business_type': business.get('businessType', 'general'),
                'styles': style_demos,
                'unified_demo_url': unified_demo_url,  # This is the ONE link we send
                'generated_at': datetime.now().isoformat(),
                'business_data': business,
                'total_styles': success_count,
                'timestamp': timestamp
            }
            
            print(f"✅ Generated {success_count}/5 style demos for {business_name}")
            print(f"🎯 Unified demo experience: {unified_demo_url}")
            return business_demos
        
        print(f"❌ No demos generated for {business_name}")
        return None
    
    def generate_multi_style_demos(self, limit=None, business_type_filter=None):
        """Generate 5 style demos for multiple businesses"""
        print("🚀 Starting multi-style demo generation...")
        
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
        
        new_business_demos = []
        skipped = 0
        
        for i, business in enumerate(businesses, 1):
            business_id = str(business.get('id', business.get('name', f'business_{i}')))
            
            # Skip if already generated
            if business_id in generated_demos:
                print(f"⏭️  {i}/{len(businesses)}: {business.get('name')} - Already has multi-style demos")
                skipped += 1
                continue
            
            print(f"🎯 {i}/{len(businesses)}: Processing {business.get('name')}")
            
            # Generate all 5 styles for this business
            business_demos = self.generate_all_styles_for_business(business)
            
            if business_demos:
                generated_demos[business_id] = business_demos
                new_business_demos.append(business_demos)
                
                # Save progress after each business
                self.save_generated_demos(generated_demos)
                print(f"💾 Progress saved for {business.get('name')}")
        
        print(f"\n🎉 Multi-style demo generation complete!")
        print(f"✅ Businesses processed: {len(new_business_demos)}")
        print(f"⏭️  Skipped (already existed): {skipped}")
        print(f"📊 Total businesses with demos: {len(generated_demos)}")
        
        return new_business_demos
    
    def get_demos_for_business(self, business_name_or_id):
        """Get all style demos for a specific business"""
        generated_demos = self.load_generated_demos()
        
        # Search by ID first
        if str(business_name_or_id) in generated_demos:
            return generated_demos[str(business_name_or_id)]
        
        # Search by name
        for demo_id, demo_info in generated_demos.items():
            if demo_info['business_name'].lower() == business_name_or_id.lower():
                return demo_info
        
        return None
    
    def generate_outreach_message(self, business_name):
        """Generate a ready-to-send outreach message with unified demo link"""
        business_demos = self.get_demos_for_business(business_name)
        
        if not business_demos:
            return f"No demos found for {business_name}"
        
        unified_demo_url = business_demos.get('unified_demo_url')
        if not unified_demo_url:
            return f"No unified demo found for {business_name}"
        
        business_type = business_demos.get('business_type', 'local')
        total_styles = business_demos.get('total_styles', 5)
        
        message = f"""Hi there,

I noticed {business_name} doesn't have a website yet. I specialize in creating professional websites for {business_type} businesses.

I went ahead and created {total_styles} different website concepts specifically for {business_name} to show you what's possible:

🎯 **View All {total_styles} Designs**: {unified_demo_url}

Each design shows a different approach - Modern, Professional, Minimalist, Classic, and Bold styles. All {total_styles} demos are displayed on one page so you can easily compare them side by side.

Which style feels most like your brand?

This is just a starting point. Everything can be customized to match your exact business needs, colors, and content.

What do you think? Would you like to discuss making one of these live for {business_name}?

Best,
Ben
Pleasant Cove Design
(207) 200-4281"""
        
        return message
    
    def list_all_demos(self, business_type_filter=None):
        """List all generated multi-style demos"""
        generated_demos = self.load_generated_demos()
        
        if business_type_filter:
            filtered_demos = {k: v for k, v in generated_demos.items() 
                            if business_type_filter.lower() in v.get('business_type', '').lower()}
        else:
            filtered_demos = generated_demos
        
        print(f"\n📋 Multi-Style Demos ({len(filtered_demos)} businesses):")
        print("=" * 60)
        
        for business_id, business_demos in filtered_demos.items():
            business_name = business_demos['business_name']
            business_type = business_demos.get('business_type', 'Unknown')
            total_styles = business_demos.get('total_styles', 0)
            
            print(f"\n🏢 {business_name} ({business_type}) - {total_styles} styles")
            print("-" * 40)
            
            styles = business_demos.get('styles', {})
            for style_key, style_info in styles.items():
                style_data = self.styles.get(style_key, {})
                emoji = style_data.get('emoji', '🎨')
                name = style_data.get('name', style_key.title())
                
                print(f"  {emoji} {name}")
                print(f"     🔗 {style_info['demo_url']}")
        
        print(f"\n📊 Total: {len(filtered_demos)} businesses with {sum(d.get('total_styles', 0) for d in filtered_demos.values())} style demos")
        
        return filtered_demos

# CLI Interface
if __name__ == "__main__":
    import sys
    
    generator = MultiStyleDemoGenerator()
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python multi_style_demo_generator.py generate [limit] [business_type]")
        print("  python multi_style_demo_generator.py list [business_type]")
        print("  python multi_style_demo_generator.py get <business_name>")
        print("  python multi_style_demo_generator.py message <business_name>")
        print("\nExamples:")
        print("  python multi_style_demo_generator.py generate 2")
        print("  python multi_style_demo_generator.py generate 10 plumbing")
        print("  python multi_style_demo_generator.py list")
        print("  python multi_style_demo_generator.py get 'Maine Coastal Plumbing'")
        print("  python multi_style_demo_generator.py message 'Maine Coastal Plumbing'")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "generate":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else None
        business_type = sys.argv[3] if len(sys.argv) > 3 else None
        
        demos = generator.generate_multi_style_demos(limit, business_type)
        
        if demos:
            total_demos = sum(d.get('total_styles', 0) for d in demos)
            print(f"\n🎯 Ready for outreach! You now have {total_demos} personalized demos across {len(demos)} businesses.")
            print("Next step: Use 'message' command to get ready-to-send outreach messages!")
    
    elif command == "list":
        business_type = sys.argv[2] if len(sys.argv) > 2 else None
        generator.list_all_demos(business_type)
    
    elif command == "get":
        if len(sys.argv) < 3:
            print("Please specify business name")
            sys.exit(1)
        
        business_name = sys.argv[2]
        demos = generator.get_demos_for_business(business_name)
        
        if demos:
            print(f"\n🎯 5-Style Demo Set for {demos['business_name']}:")
            styles = demos.get('styles', {})
            for style_key, style_info in styles.items():
                style_data = generator.styles.get(style_key, {})
                print(f"{style_data.get('emoji', '🎨')} {style_data.get('name', style_key)}: {style_info['demo_url']}")
        else:
            print(f"❌ No demos found for '{business_name}'")
    
    elif command == "message":
        if len(sys.argv) < 3:
            print("Please specify business name")
            sys.exit(1)
        
        business_name = sys.argv[2]
        message = generator.generate_outreach_message(business_name)
        print(f"\n📧 Ready-to-Send Outreach Message:")
        print("=" * 50)
        print(message)
        print("=" * 50)
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1) 