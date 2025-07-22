#!/usr/bin/env python3
"""
Setup script for Minerva + Pleasant Cove Design Integration
Shows how to connect all the pieces together
"""

import os
import sys
import subprocess
import time

def print_step(step_num, description):
    print(f"\n{'='*60}")
    print(f"STEP {step_num}: {description}")
    print('='*60)

def main():
    print("""
    🚀 MINERVA + PLEASANT COVE DESIGN INTEGRATION SETUP
    ===================================================
    
    This will show you how to connect Minerva AI to your lead system.
    """)
    
    # Step 1: Architecture Overview
    print_step(1, "UNDERSTAND THE ARCHITECTURE")
    print("""
    Your system will have 3 main components:
    
    1. LEAD GENERATION SYSTEM (existing)
       - Google Maps Scraper
       - Phone/Email Validation
       - Outreach Manager
       - SQLite Database
    
    2. MINERVA BRIDGE (new)
       - Connects your lead data to Minerva
       - Handles API calls between systems
       - Updates lead status from AI conversations
       - Routes messages to appropriate handlers
    
    3. MINERVA AI SERVICE (external)
       - Handles natural language conversations
       - Makes function calls back to your system
       - Books appointments, sends emails, etc.
    
    Flow: Lead Data → Bridge → Minerva → Actions → Bridge → Database
    """)
    
    input("\nPress Enter to continue...")
    
    # Step 2: Set up Minerva locally (simulation)
    print_step(2, "MINERVA SETUP (SIMULATION)")
    print("""
    Since we don't have Minerva's actual code, here's what you need to do:
    
    1. Clone/Download Minerva to a separate directory:
       git clone [minerva-repo-url] ../minerva
    
    2. Set up Minerva's environment:
       cd ../minerva
       python3 -m venv venv
       source venv/bin/activate
       pip install -r requirements.txt
    
    3. Configure Minerva to call your bridge endpoints:
       - Update add_functions.py to point to http://localhost:5000/api/
       - Add your OpenAI API key to Minerva's config
    
    4. Start Minerva service:
       python serve_lite_orbital.py --port 8000
    """)
    
    input("\nPress Enter to continue...")
    
    # Step 3: Configure the bridge
    print_step(3, "CONFIGURE THE BRIDGE")
    print("""
    The bridge needs these environment variables:
    """)
    
    # Create .env file
    env_content = """# Minerva Bridge Configuration
MINERVA_URL=http://localhost:8000
LEAD_DB_PATH=scrapers/scraper_results.db
BRIDGE_PORT=5000

# Add these to your system environment or .env file
export MINERVA_URL=http://localhost:8000
export LEAD_DB_PATH=scrapers/scraper_results.db
export BRIDGE_PORT=5000
"""
    
    with open('.env.example', 'w') as f:
        f.write(env_content)
    
    print("Created .env.example with configuration")
    print("\nTo use these settings:")
    print("  cp .env.example .env")
    print("  source .env")
    
    input("\nPress Enter to continue...")
    
    # Step 4: Update Minerva's function registry
    print_step(4, "MINERVA FUNCTION REGISTRY")
    print("""
    Add these functions to Minerva's add_functions.py:
    """)
    
    minerva_functions = '''
import requests

BRIDGE_URL = 'http://localhost:5000/api'

@ai_coordinator.register_function(
    name='get_lead_info',
    description='Get information about a business lead',
    parameters={
        'type': 'object',
        'properties': {
            'lead_id': {'type': 'string', 'description': 'The lead ID'}
        },
        'required': ['lead_id']
    }
)
def get_lead_info(lead_id: str):
    """Get lead context from Pleasant Cove system"""
    r = requests.get(f"{BRIDGE_URL}/lead/{lead_id}/context")
    return r.json()

@ai_coordinator.register_function(
    name='book_appointment',
    description='Book an appointment with a lead',
    parameters={
        'type': 'object',
        'properties': {
            'lead_id': {'type': 'string'},
            'datetime': {'type': 'string', 'format': 'date-time'}
        },
        'required': ['lead_id', 'datetime']
    }
)
def book_appointment(lead_id: str, datetime: str):
    """Book appointment through Pleasant Cove system"""
    r = requests.post(f"{BRIDGE_URL}/lead/{lead_id}/book-appointment", 
                     json={'datetime': datetime})
    return r.json()

@ai_coordinator.register_function(
    name='send_follow_up_email',
    description='Send a follow-up email to a lead',
    parameters={
        'type': 'object',
        'properties': {
            'lead_id': {'type': 'string'},
            'template': {'type': 'string', 'enum': ['follow_up_email_v1', 'warm_email_v1']}
        },
        'required': ['lead_id']
    }
)
def send_follow_up_email(lead_id: str, template: str = 'follow_up_email_v1'):
    """Send email through Pleasant Cove outreach system"""
    r = requests.post(f"{BRIDGE_URL}/lead/{lead_id}/send-email", 
                     json={'template': template})
    return r.json()

@ai_coordinator.register_function(
    name='update_lead_status',
    description='Update the status of a lead after conversation',
    parameters={
        'type': 'object',
        'properties': {
            'lead_id': {'type': 'string'},
            'status': {'type': 'string', 'enum': ['interested', 'not_interested', 'meeting_scheduled', 'follow_up_needed']}
        },
        'required': ['lead_id', 'status']
    }
)
def update_lead_status(lead_id: str, status: str):
    """Update lead status in Pleasant Cove database"""
    r = requests.post(f"{BRIDGE_URL}/lead/{lead_id}/update", 
                     json={'status_update': status})
    return r.json()
'''
    
    with open('minerva_functions_example.py', 'w') as f:
        f.write(minerva_functions)
    
    print("Created minerva_functions_example.py")
    print("Copy these functions to Minerva's add_functions.py")
    
    input("\nPress Enter to continue...")
    
    # Step 5: Test the integration
    print_step(5, "TEST THE INTEGRATION")
    print("""
    To test everything is working:
    
    1. Start the Minerva Bridge:
       python minerva_bridge.py
    
    2. In another terminal, start Minerva:
       cd ../minerva
       python serve_lite_orbital.py --port 8000
    
    3. Test the bridge health check:
       curl http://localhost:5000/health
    
    4. Test a chat session with a lead:
       curl -X POST http://localhost:5000/api/chat/start/1 \\
            -H "Content-Type: application/json" \\
            -d '{"message": "Hello"}'
    """)
    
    # Create a test script
    test_script = '''#!/usr/bin/env python3
"""Test script for Minerva integration"""

import requests
import json

BRIDGE_URL = 'http://localhost:5000'

def test_health():
    """Test if bridge is running"""
    r = requests.get(f"{BRIDGE_URL}/health")
    print("Health Check:", r.json())

def test_lead_context(lead_id=1):
    """Test getting lead context"""
    r = requests.get(f"{BRIDGE_URL}/api/lead/{lead_id}/context")
    if r.status_code == 200:
        print(f"Lead {lead_id} Context:", json.dumps(r.json(), indent=2))
    else:
        print(f"Lead {lead_id} not found")

def test_chat(lead_id=1):
    """Test starting a chat session"""
    r = requests.post(f"{BRIDGE_URL}/api/chat/start/{lead_id}", 
                     json={"message": "I'm interested in a website"})
    print("Chat Response:", r.json())

if __name__ == "__main__":
    print("Testing Minerva Bridge Integration...")
    print("="*50)
    
    test_health()
    print()
    test_lead_context()
    print()
    # test_chat()  # Uncomment when Minerva is running
'''
    
    with open('test_minerva_integration.py', 'w') as f:
        f.write(test_script)
    os.chmod('test_minerva_integration.py', 0o755)
    
    print("\nCreated test_minerva_integration.py")
    
    input("\nPress Enter to continue...")
    
    # Step 6: Production deployment
    print_step(6, "PRODUCTION DEPLOYMENT")
    print("""
    For production deployment:
    
    1. Use proper process managers:
       - systemd service for the bridge
       - Docker containers for isolation
       - nginx for reverse proxy
    
    2. Security considerations:
       - Add authentication between services
       - Use HTTPS for all endpoints
       - Validate all inputs
       - Rate limiting
    
    3. Monitoring:
       - Log all AI conversations
       - Track conversion metrics
       - Monitor API response times
       - Set up alerts for errors
    
    4. Scaling:
       - Use Redis for session storage
       - PostgreSQL instead of SQLite
       - Load balancer for multiple instances
       - Queue system for async tasks
    """)
    
    print("\n" + "="*60)
    print("✅ SETUP GUIDE COMPLETE!")
    print("="*60)
    print("""
    Next steps:
    1. Install Minerva in a separate directory
    2. Configure both services with your API keys
    3. Start the bridge: python minerva_bridge.py
    4. Start Minerva: python serve_lite_orbital.py
    5. Test with: python test_minerva_integration.py
    
    The bridge will handle all communication between your
    lead system and Minerva AI, keeping them properly separated
    while allowing full integration!
    """)

if __name__ == "__main__":
    main() 