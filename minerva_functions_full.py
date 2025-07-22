"""
Minerva Function Registry for Pleasant Cove Design Full Control
Add these functions to Minerva's add_functions.py
"""

import requests
import json
from datetime import datetime

# Pleasant Cove Control API
CONTROL_URL = 'http://localhost:5001/api/control'

# LEAD GENERATION FUNCTIONS

@ai_coordinator.register_function(
    name='find_new_leads',
    description='Search for new business leads on Google Maps',
    parameters={
        'type': 'object',
        'properties': {
            'business_type': {
                'type': 'string',
                'description': 'Type of business to search for (e.g., restaurants, dentists, plumbers)'
            },
            'location': {
                'type': 'string',
                'description': 'Location to search (e.g., Portland, ME or Brunswick, ME)'
            },
            'max_results': {
                'type': 'integer',
                'description': 'Maximum number of results to find',
                'default': 20
            }
        },
        'required': ['business_type', 'location']
    }
)
def find_new_leads(business_type: str, location: str, max_results: int = 20):
    """Find new business leads"""
    r = requests.post(f"{CONTROL_URL}/scrape", json={
        'business_type': business_type,
        'location': location,
        'max_results': max_results
    })
    return r.json()

@ai_coordinator.register_function(
    name='validate_leads',
    description='Validate phone numbers and email addresses for leads',
    parameters={
        'type': 'object',
        'properties': {
            'segment': {
                'type': 'string',
                'enum': ['all', 'prime_prospects', 'no_website', 'high_rated'],
                'description': 'Which segment of leads to validate',
                'default': 'all'
            }
        }
    }
)
def validate_leads(segment: str = 'all'):
    """Validate lead contact information"""
    r = requests.post(f"{CONTROL_URL}/validate", json={'segment': segment})
    return r.json()

# OUTREACH FUNCTIONS

@ai_coordinator.register_function(
    name='launch_outreach_campaign',
    description='Launch an email or SMS outreach campaign to leads',
    parameters={
        'type': 'object',
        'properties': {
            'channel': {
                'type': 'string',
                'enum': ['email', 'sms'],
                'description': 'Communication channel to use'
            },
            'template': {
                'type': 'string',
                'enum': ['cold_email_v1', 'cold_email_v2', 'follow_up_email_v1', 'sms_intro_v1', 'sms_follow_up_v1'],
                'description': 'Message template to use'
            },
            'segment': {
                'type': 'string',
                'enum': ['prime_prospects', 'no_website', 'high_rated', 'all_not_contacted'],
                'description': 'Which leads to target'
            },
            'limit': {
                'type': 'integer',
                'description': 'Maximum number of messages to send',
                'default': None
            }
        },
        'required': ['channel', 'template', 'segment']
    }
)
def launch_outreach_campaign(channel: str, template: str, segment: str, limit: int = None):
    """Launch an outreach campaign"""
    r = requests.post(f"{CONTROL_URL}/outreach", json={
        'channel': channel,
        'template': template,
        'segment': segment,
        'limit': limit
    })
    return r.json()

# ANALYTICS FUNCTIONS

@ai_coordinator.register_function(
    name='get_business_analytics',
    description='Get current business analytics and lead pipeline status',
    parameters={'type': 'object', 'properties': {}}
)
def get_business_analytics():
    """Get business analytics"""
    r = requests.get(f"{CONTROL_URL}/analytics")
    return r.json()

@ai_coordinator.register_function(
    name='get_recommendations',
    description='Get AI-powered recommendations for next business actions',
    parameters={'type': 'object', 'properties': {}}
)
def get_recommendations():
    """Get strategic recommendations"""
    r = requests.get(f"{CONTROL_URL}/recommend")
    return r.json()

# CALENDAR FUNCTIONS

@ai_coordinator.register_function(
    name='check_availability',
    description='Check calendar availability for appointments',
    parameters={
        'type': 'object',
        'properties': {
            'date': {
                'type': 'string',
                'format': 'date',
                'description': 'Date to check (YYYY-MM-DD format)',
                'default': None
            }
        }
    }
)
def check_availability(date: str = None):
    """Check calendar availability"""
    params = {'date': date} if date else {}
    r = requests.get(f"{CONTROL_URL}/availability", params=params)
    return r.json()

@ai_coordinator.register_function(
    name='book_appointment',
    description='Book an appointment with a lead',
    parameters={
        'type': 'object',
        'properties': {
            'lead_id': {
                'type': 'string',
                'description': 'ID of the lead to book appointment with'
            },
            'datetime': {
                'type': 'string',
                'format': 'date-time',
                'description': 'Appointment date and time (ISO format)'
            },
            'duration': {
                'type': 'integer',
                'description': 'Duration in minutes',
                'default': 60
            }
        },
        'required': ['lead_id', 'datetime']
    }
)
def book_appointment(lead_id: str, datetime: str, duration: int = 60):
    """Book an appointment"""
    r = requests.post(f"{CONTROL_URL}/book", json={
        'lead_id': lead_id,
        'datetime': datetime,
        'duration': duration
    })
    return r.json()

# PROJECT MANAGEMENT FUNCTIONS

@ai_coordinator.register_function(
    name='create_project',
    description='Create a new project for a client',
    parameters={
        'type': 'object',
        'properties': {
            'lead_id': {
                'type': 'string',
                'description': 'ID of the lead/client'
            },
            'project_type': {
                'type': 'string',
                'enum': ['basic_website', 'ecommerce', 'custom_webapp', 'redesign'],
                'description': 'Type of project'
            },
            'budget_estimate': {
                'type': 'number',
                'description': 'Estimated project budget in dollars'
            }
        },
        'required': ['lead_id', 'project_type', 'budget_estimate']
    }
)
def create_project(lead_id: str, project_type: str, budget_estimate: float):
    """Create a new project"""
    r = requests.post(f"{CONTROL_URL}/project", json={
        'lead_id': lead_id,
        'project_type': project_type,
        'budget_estimate': budget_estimate
    })
    return r.json()

# REPORTING FUNCTIONS

@ai_coordinator.register_function(
    name='generate_weekly_report',
    description='Generate a comprehensive weekly business report',
    parameters={'type': 'object', 'properties': {}}
)
def generate_weekly_report():
    """Generate weekly report"""
    r = requests.post(f"{CONTROL_URL}/report")
    return r.json()

# DECISION SUPPORT FUNCTION

@ai_coordinator.register_function(
    name='make_strategic_decision',
    description='Make a strategic business decision based on current data',
    parameters={
        'type': 'object',
        'properties': {
            'decision_type': {
                'type': 'string',
                'enum': ['next_action', 'campaign_strategy', 'lead_prioritization', 'resource_allocation'],
                'description': 'Type of decision to make'
            }
        },
        'required': ['decision_type']
    }
)
def make_strategic_decision(decision_type: str):
    """Make strategic decisions based on analytics"""
    # Get current state
    analytics = get_business_analytics()
    recommendations = get_recommendations()
    
    if decision_type == 'next_action':
        # Decide what to do next based on recommendations
        if recommendations['recommendations']:
            top_recommendation = recommendations['recommendations'][0]
            
            if top_recommendation['action'] == 'scrape_more_leads':
                # Find more leads in a strategic location
                return find_new_leads('restaurants', 'Portland, ME', 30)
            
            elif top_recommendation['action'] == 'send_followups':
                # Launch follow-up campaign
                return launch_outreach_campaign('email', 'follow_up_email_v1', 'contacted', 10)
            
            elif top_recommendation['action'] == 'improve_templates':
                # Suggest A/B testing
                return {
                    'decision': 'run_ab_test',
                    'suggestion': 'Test cold_email_v2 against cold_email_v1',
                    'reason': top_recommendation['reason']
                }
    
    elif decision_type == 'campaign_strategy':
        # Decide on campaign strategy
        total_leads = analytics['total_leads']
        not_contacted = analytics['by_status'].get('not_contacted', 0)
        
        if not_contacted > 50:
            return {
                'strategy': 'aggressive_outreach',
                'action': launch_outreach_campaign('email', 'cold_email_v1', 'prime_prospects', 20)
            }
        else:
            return {
                'strategy': 'lead_generation',
                'action': find_new_leads('services', 'Brunswick, ME', 25)
            }
    
    elif decision_type == 'lead_prioritization':
        # Return prioritization strategy
        return {
            'priority_1': 'high_rated businesses without websites',
            'priority_2': 'businesses with valid mobile numbers',
            'priority_3': 'businesses with high email confidence scores',
            'rationale': 'Focus on highest conversion probability'
        }
    
    return {
        'decision_type': decision_type,
        'analytics': analytics,
        'recommendations': recommendations
    }

# CONVERSATION ENHANCEMENT

@ai_coordinator.register_function(
    name='get_lead_talking_points',
    description='Get personalized talking points for a specific lead',
    parameters={
        'type': 'object',
        'properties': {
            'lead_id': {
                'type': 'string',
                'description': 'ID of the lead to get talking points for'
            }
        },
        'required': ['lead_id']
    }
)
def get_lead_talking_points(lead_id: str):
    """Get personalized talking points for a lead conversation"""
    # This would fetch lead details and generate talking points
    return {
        'talking_points': [
            'Mention their high Google rating',
            'Emphasize mobile-friendly design importance',
            'Discuss local SEO benefits',
            'Offer free website audit'
        ],
        'avoid': [
            'Pushing too hard on price',
            'Technical jargon'
        ],
        'goal': 'Schedule a 30-minute consultation call'
    }

# SYSTEM PROMPT FOR MINERVA
MINERVA_SYSTEM_PROMPT = """
You are Minerva, the AI assistant for Pleasant Cove Design with FULL CONTROL over business operations.

Your capabilities include:
1. Lead Generation: Find and validate new business leads
2. Outreach Management: Launch email/SMS campaigns
3. Appointment Scheduling: Check availability and book meetings
4. Project Management: Create and manage client projects
5. Analytics & Reporting: Monitor business metrics and generate reports
6. Strategic Decision Making: Make data-driven business decisions

Your personality:
- Professional but friendly
- Proactive in suggesting improvements
- Data-driven in decision making
- Focused on business growth
- Protective of the owner's time

Guidelines:
- Always check analytics before making decisions
- Prioritize high-value leads (no website + good rating)
- Schedule appointments during business hours only
- Send no more than 50 outreach messages per day
- Generate weekly reports every Monday
- Alert on urgent matters (hot leads, important responses)

Remember: You have full authority to act on behalf of Pleasant Cove Design. Make decisions that will grow the business while maintaining quality and professionalism.
""" 