#!/usr/bin/env python3
"""
Pleasant Cove Design - Complete Lead Pipeline Demo
This script demonstrates the entire lead generation workflow:
1. Scrape Google Maps for businesses
2. Add leads to the CRM via API
3. Generate website demos via Minerva
4. Show AI interaction with the data
"""

import requests
import json
import time
from datetime import datetime
import sys

# Configuration
BASE_URL = "http://localhost:3000"
ADMIN_TOKEN = "pleasantcove2024admin"
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {ADMIN_TOKEN}"
}

def print_section(title):
    """Print a fancy section header"""
    print(f"\n{'='*60}")
    print(f"🎯 {title}")
    print('='*60)

def print_step(step, description):
    """Print a step in the process"""
    print(f"\n📌 Step {step}: {description}")
    print("-" * 40)

def check_api_health():
    """Check if the API is running"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ API is running and healthy")
            return True
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot reach API: {e}")
        return False

def demonstrate_lead_creation():
    """Demonstrate creating leads via API"""
    print_step(1, "Creating Sample Leads via API")
    
    # Sample leads from different industries
    sample_leads = [
        {
            "name": "Acme Plumbing Services",
            "email": "contact@acmeplumbing.com",
            "phone": "(555) 123-4567",
            "businessType": "plumbing",
            "notes": "Found via Google Maps scraper - Maine Coast area"
        },
        {
            "name": "Green Thumb Landscaping",
            "email": "info@greenthumblandscaping.com", 
            "phone": "(555) 987-6543",
            "businessType": "landscaping",
            "notes": "High-potential lead - multiple locations"
        },
        {
            "name": "Harbor Bistro & Grill",
            "email": "reservations@harborbistro.com",
            "phone": "(555) 456-7890", 
            "businessType": "restaurant",
            "notes": "Premium dining establishment - waterfront location"
        }
    ]
    
    created_leads = []
    
    for lead in sample_leads:
        try:
            print(f"Creating lead: {lead['name']}")
            response = requests.post(f"{BASE_URL}/api/companies", json=lead, headers=HEADERS)
            
            if response.status_code == 201:
                lead_data = response.json()
                created_leads.append(lead_data)
                print(f"✅ Created lead ID: {lead_data['id']} - {lead_data['name']}")
            else:
                print(f"❌ Failed to create {lead['name']}: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error creating {lead['name']}: {e}")
    
    return created_leads

def demonstrate_ai_interaction(leads):
    """Demonstrate AI interaction with the lead data"""
    print_step(2, "Demonstrating AI Interaction with Lead Data")
    
    # Test queries to show AI can access and work with the data
    ai_queries = [
        "Show me recent leads",
        "Search for plumbing companies", 
        "Generate a demo for Acme Plumbing",
        "Create a new lead for Seaside Dental with email info@seasidedental.com"
    ]
    
    for query in ai_queries:
        print(f"\n🤖 AI Query: '{query}'")
        try:
            response = requests.post(
                f"{BASE_URL}/api/ai/chat",
                json={
                    "message": query,
                    "context": {"sessionId": f"demo_{int(time.time())}"}
                },
                headers=HEADERS
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ AI Response: {result['response'][:200]}...")
                
                # Show function calls if any
                if result.get('functionCalls'):
                    print(f"🔧 Functions Called: {len(result['functionCalls'])}")
                    for fc in result['functionCalls']:
                        print(f"   - {fc.get('name', 'unknown')}")
            else:
                print(f"❌ AI query failed: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error with AI query: {e}")
        
        time.sleep(2)  # Don't spam the API

def demonstrate_demo_generation(leads):
    """Demonstrate website demo generation"""
    print_step(3, "Demonstrating Website Demo Generation")
    
    if not leads:
        print("❌ No leads available for demo generation")
        return
    
    # Pick the first lead for demo generation
    lead = leads[0]
    company_name = lead['name']
    business_type = lead.get('businessType', 'general')
    
    print(f"Generating demo for: {company_name} ({business_type})")
    
    try:
        # Check if Minerva Bridge is running
        bridge_response = requests.get("http://localhost:8001/health")
        if bridge_response.status_code != 200:
            print("❌ Minerva Bridge not running - skipping demo generation")
            print("💡 To enable: cd pleasantcovedesign/server && npx tsx minerva-bridge.ts")
            return
        
        print("✅ Minerva Bridge is running")
        
        # Generate demo via Minerva Bridge
        demo_response = requests.post(
            "http://localhost:8001/api/minerva/generate-demo",
            json={
                "company_name": company_name,
                "industry": business_type,
                "demo_type": "both"
            },
            headers=HEADERS
        )
        
        if demo_response.status_code == 200:
            demo_result = demo_response.json()
            if demo_result.get('success'):
                print(f"✅ Demo generated successfully!")
                print(f"🌐 Storefront: {demo_result.get('storefront_url', 'N/A')}")
                print(f"🎨 Stylized: {demo_result.get('stylized_url', 'N/A')}")
            else:
                print(f"❌ Demo generation failed: {demo_result.get('error')}")
        else:
            print(f"❌ Demo generation request failed: {demo_response.status_code}")
            
    except Exception as e:
        print(f"❌ Error generating demo: {e}")

def show_current_data():
    """Show what data is currently in the system"""
    print_step(4, "Current System Data Overview")
    
    try:
        # Get companies
        companies_response = requests.get(f"{BASE_URL}/api/companies", headers=HEADERS)
        if companies_response.status_code == 200:
            companies = companies_response.json()
            print(f"📊 Total Companies: {len(companies)}")
            
            # Show breakdown by business type
            business_types = {}
            for company in companies:
                btype = company.get('businessType', 'unknown')
                business_types[btype] = business_types.get(btype, 0) + 1
            
            print("📈 Business Type Breakdown:")
            for btype, count in business_types.items():
                print(f"   - {btype}: {count}")
        
        # Get projects  
        projects_response = requests.get(f"{BASE_URL}/api/projects", headers=HEADERS)
        if projects_response.status_code == 200:
            projects = projects_response.json()
            print(f"📊 Total Projects: {len(projects)}")
            
    except Exception as e:
        print(f"❌ Error fetching system data: {e}")

def demonstrate_scraper_integration():
    """Show how the Google Maps scraper would integrate"""
    print_step(5, "Google Maps Scraper Integration Demo")
    
    print("🔍 This is how the scraper integration works:")
    print("1. Run: python3 scrapers/google_maps_scraper.py")
    print("2. Scraper finds businesses in target area")
    print("3. Business data is automatically added to CRM")
    print("4. AI can immediately work with the new leads")
    print("5. Demos can be generated for qualified prospects")
    
    # Check if scraper files exist
    import os
    scraper_files = [
        "scrapers/google_maps_scraper.py",
        "scrapers/simple_maps_scraper.py"
    ]
    
    for file in scraper_files:
        if os.path.exists(file):
            print(f"✅ Scraper available: {file}")
        else:
            print(f"❌ Scraper not found: {file}")

def main():
    """Run the complete demo"""
    print_section("Pleasant Cove Design - Complete Lead Pipeline Demo")
    print(f"🕐 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check if API is running
    if not check_api_health():
        print("\n❌ Please start the API first:")
        print("   npm run dev")
        sys.exit(1)
    
    print("\n🚀 Running complete pipeline demonstration...")
    
    # Step 1: Create sample leads
    leads = demonstrate_lead_creation()
    
    # Step 2: Show AI interaction
    demonstrate_ai_interaction(leads)
    
    # Step 3: Generate demos
    demonstrate_demo_generation(leads)
    
    # Step 4: Show current data
    show_current_data()
    
    # Step 5: Show scraper integration
    demonstrate_scraper_integration()
    
    print_section("Demo Complete!")
    print("🎉 This demonstrates the complete lead pipeline:")
    print("   ✅ Lead creation and management")
    print("   ✅ AI interaction with data")
    print("   ✅ Website demo generation")
    print("   ✅ Data persistence and retrieval")
    print("   ✅ Integration points for scrapers")
    
    print(f"\n🌐 Access the admin UI at: http://localhost:5173")
    print("🤖 Chat with Minerva to interact with your leads!")

if __name__ == "__main__":
    main() 