#!/usr/bin/env python3
"""
Upwork Project Brief Generator
Auto-populates project handoff briefs using Pleasant Cove Design system data
"""

import json
import requests
import datetime
from pathlib import Path
from typing import Dict, Any, Optional

class UpworkBriefGenerator:
    def __init__(self, backend_url: str = "https://pleasantcovedesign-production.up.railway.app"):
        self.backend_url = backend_url
        self.template_path = Path("upwork_project_brief_template.md")
        
    def fetch_order_data(self, order_id: str) -> Optional[Dict[str, Any]]:
        """Fetch order data from Pleasant Cove backend"""
        try:
            response = requests.get(f"{self.backend_url}/api/orders/{order_id}")
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Could not fetch order {order_id}: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error fetching order data: {e}")
            return None
    
    def fetch_conversation_data(self, lead_id: str) -> Optional[Dict[str, Any]]:
        """Fetch conversation history for requirements gathering"""
        try:
            response = requests.get(f"{self.backend_url}/api/conversations/{lead_id}")
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Could not fetch conversation {lead_id}: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error fetching conversation data: {e}")
            return None
    
    def extract_client_requirements(self, messages: list) -> Dict[str, str]:
        """Extract client requirements from conversation messages"""
        requirements = {
            'specific_requests': [],
            'pain_points': [],
            'success_metrics': [],
            'timeline_constraints': [],
            'budget_notes': []
        }
        
        # Look for keyword patterns in messages
        for message in messages:
            content = message.get('message', '').lower()
            
            # Extract specific requests
            if any(word in content for word in ['want', 'need', 'require', 'must have']):
                requirements['specific_requests'].append(message.get('message', ''))
            
            # Extract pain points
            if any(word in content for word in ['problem', 'issue', 'frustrating', 'difficult']):
                requirements['pain_points'].append(message.get('message', ''))
            
            # Extract success metrics
            if any(word in content for word in ['goal', 'achieve', 'success', 'improve']):
                requirements['success_metrics'].append(message.get('message', ''))
            
            # Extract timeline info
            if any(word in content for word in ['deadline', 'launch', 'asap', 'urgent', 'time']):
                requirements['timeline_constraints'].append(message.get('message', ''))
        
        return requirements
    
    def generate_brief(self, order_id: str, meeting_notes: Dict[str, Any] = None) -> str:
        """Generate a complete Upwork brief for the given order"""
        
        # Fetch data
        order_data = self.fetch_order_data(order_id)
        if not order_data:
            return "❌ Could not generate brief - order data not found"
        
        lead_id = order_data.get('lead_id')
        conversation_data = self.fetch_conversation_data(lead_id) if lead_id else None
        
        # Load template
        if not self.template_path.exists():
            return "❌ Template file not found"
        
        template = self.template_path.read_text()
        
        # Auto-fill from order data
        replacements = {
            '[AUTO-FILLED FROM ORDER]': order_data.get('business_name', 'NOT PROVIDED'),
            '[AUTO-FILLED]': order_data.get('client_name', 'NOT PROVIDED'),
            '[GENERATED]': order_id,
            '[DATE]': datetime.datetime.now().strftime('%Y-%m-%d'),
            
            # Package details
            '[One-pager/Catalog/Service site]': order_data.get('site_type', 'NOT SPECIFIED'),
            '[Messaging Widget, Appointment Setter, Blog, SEO Audit, etc.]': ', '.join(order_data.get('features', [])),
            '[AUTO-FILLED FROM ORDER]': order_data.get('demo_url', 'NOT PROVIDED'),
        }
        
        # Add conversation-based requirements
        if conversation_data:
            messages = conversation_data.get('messages', [])
            requirements = self.extract_client_requirements(messages)
            
            replacements.update({
                '[Note 1 from meeting]': requirements['specific_requests'][0] if requirements['specific_requests'] else 'See conversation history',
                '[Note 2 from meeting]': requirements['specific_requests'][1] if len(requirements['specific_requests']) > 1 else 'Additional requirements TBD',
                '[Note 3 from meeting]': requirements['specific_requests'][2] if len(requirements['specific_requests']) > 2 else 'Client feedback pending',
                '[Current website issues or business challenges]': requirements['pain_points'][0] if requirements['pain_points'] else 'Not specified',
                '[What they want the website to achieve]': requirements['success_metrics'][0] if requirements['success_metrics'] else 'Not specified',
                '[Any specific deadlines or events]': requirements['timeline_constraints'][0] if requirements['timeline_constraints'] else 'Standard timeline',
            })
        
        # Add meeting notes if provided
        if meeting_notes:
            replacements.update({
                '[Date]': meeting_notes.get('date', 'NOT RECORDED'),
                '[Phone/Video/In-person]': meeting_notes.get('type', 'NOT SPECIFIED'),
                '[Client\'s preferred messaging]': meeting_notes.get('tagline', 'NOT PROVIDED'),
                '[What makes them unique]': meeting_notes.get('value_prop_1', 'NOT PROVIDED'),
                '[Why clients choose them]': meeting_notes.get('value_prop_2', 'NOT PROVIDED'),
                '[Special expertise/certifications]': meeting_notes.get('value_prop_3', 'NOT PROVIDED'),
            })
        
        # Apply replacements
        brief = template
        for placeholder, value in replacements.items():
            brief = brief.replace(placeholder, str(value))
        
        return brief
    
    def save_brief(self, brief: str, order_id: str) -> str:
        """Save the generated brief to a file"""
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"upwork_brief_{order_id}_{timestamp}.md"
        
        Path(filename).write_text(brief)
        return filename

def main():
    """CLI interface for brief generation"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python generate_upwork_brief.py <order_id> [meeting_notes.json]")
        print("Example: python generate_upwork_brief.py order_123456")
        return
    
    order_id = sys.argv[1]
    meeting_notes = None
    
    # Load meeting notes if provided
    if len(sys.argv) > 2:
        try:
            meeting_notes = json.loads(Path(sys.argv[2]).read_text())
        except Exception as e:
            print(f"⚠️  Could not load meeting notes: {e}")
    
    # Generate brief
    generator = UpworkBriefGenerator()
    print(f"🚀 Generating Upwork brief for order: {order_id}")
    
    brief = generator.generate_brief(order_id, meeting_notes)
    
    if brief.startswith("❌"):
        print(brief)
        return
    
    # Save brief
    filename = generator.save_brief(brief, order_id)
    print(f"✅ Brief generated: {filename}")
    
    # Display preview
    print("\n" + "="*50)
    print("📋 BRIEF PREVIEW:")
    print("="*50)
    print(brief[:1000] + "..." if len(brief) > 1000 else brief)

if __name__ == "__main__":
    main() 