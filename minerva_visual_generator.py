#!/usr/bin/env python3
"""
Minerva Visual Demo Generator
Automatically creates website mockups from scraped business data
"""

import os
import json
import logging
from typing import Dict, List, Optional
from datetime import datetime
import base64
from PIL import Image, ImageDraw, ImageFont
import requests
from io import BytesIO

logger = logging.getLogger(__name__)

class MinervaVisualGenerator:
    """
    Generates visual website demos from business data
    Creates HTML mockups that can be shared with prospects
    """
    
    def __init__(self, output_dir="demos"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        # Business type templates
        self.templates = {
            'plumbing': {
                'hero_title': '{business_name} - Expert Plumbing Services',
                'tagline': 'Fast, Reliable, Local Plumbing Solutions',
                'services': ['Emergency Repairs', 'Drain Cleaning', 'Water Heater Installation', 'Leak Detection'],
                'color_primary': '#1e40af',
                'color_secondary': '#dc2626',
                'hero_image': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'
            },
            'restaurant': {
                'hero_title': '{business_name} - Authentic Local Dining',
                'tagline': 'Fresh Ingredients, Bold Flavors, Unforgettable Experience',
                'services': ['Dine-In', 'Takeout', 'Catering', 'Private Events'],
                'color_primary': '#dc2626',
                'color_secondary': '#f59e0b',
                'hero_image': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'
            },
            'landscaping': {
                'hero_title': '{business_name} - Transform Your Outdoor Space',
                'tagline': 'Professional Landscaping & Lawn Care Services',
                'services': ['Lawn Maintenance', 'Garden Design', 'Tree Service', 'Irrigation Systems'],
                'color_primary': '#16a34a',
                'color_secondary': '#eab308',
                'hero_image': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800'
            },
            'electrical': {
                'hero_title': '{business_name} - Licensed Electrical Services',
                'tagline': 'Safe, Professional Electrical Work You Can Trust',
                'services': ['Panel Upgrades', 'Outlet Installation', 'Lighting Repair', 'Emergency Service'],
                'color_primary': '#f59e0b',
                'color_secondary': '#1f2937',
                'hero_image': 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800'
            },
            'dental': {
                'hero_title': '{business_name} - Your Family Dental Care',
                'tagline': 'Gentle, Comprehensive Dental Services',
                'services': ['Cleanings', 'Fillings', 'Crowns', 'Cosmetic Dentistry'],
                'color_primary': '#0ea5e9',
                'color_secondary': '#f8fafc',
                'hero_image': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800'
            },
            'default': {
                'hero_title': '{business_name} - Professional Services',
                'tagline': 'Quality Service You Can Count On',
                'services': ['Professional Service', 'Expert Consultation', 'Quality Work', 'Customer Support'],
                'color_primary': '#6366f1',
                'color_secondary': '#f3f4f6',
                'hero_image': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'
            }
        }
        
        logger.info("🎨 Minerva Visual Generator initialized")
    
    def generate_demo_website(self, business_data: Dict) -> Dict:
        """
        Generate a complete demo website from business data
        """
        try:
            # Extract business info
            business_name = business_data.get('name', 'Your Business')
            business_type = business_data.get('businessType', 'default').lower()
            phone = business_data.get('phone', '(555) 123-4567')
            email = business_data.get('email', 'contact@yourbusiness.com')
            address = business_data.get('address', 'Your Location')
            rating = business_data.get('rating', '5.0')
            reviews = business_data.get('reviews', '50')
            
            # Get template for business type
            template = self.templates.get(business_type, self.templates['default'])
            
            # Generate content
            hero_title = template['hero_title'].format(business_name=business_name)
            tagline = template['tagline']
            services = template['services']
            
            # Create HTML demo
            html_content = self._create_html_template(
                business_name=business_name,
                hero_title=hero_title,
                tagline=tagline,
                services=services,
                phone=phone,
                email=email,
                address=address,
                rating=rating,
                reviews=reviews,
                template=template
            )
            
            # Save to file
            demo_id = f"{business_name.lower().replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            html_file = os.path.join(self.output_dir, f"{demo_id}.html")
            
            with open(html_file, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            # Generate preview image (optional)
            preview_url = f"file://{os.path.abspath(html_file)}"
            
            result = {
                'demo_id': demo_id,
                'business_name': business_name,
                'business_type': business_type,
                'html_file': html_file,
                'preview_url': preview_url,
                'public_url': f"http://localhost:8004/demo/{demo_id}",  # If we serve it
                'created_at': datetime.now().isoformat(),
                'template_used': business_type,
                'content': {
                    'hero_title': hero_title,
                    'tagline': tagline,
                    'services': services
                }
            }
            
            logger.info(f"✅ Generated demo for {business_name}: {demo_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error generating demo: {e}")
            return {'error': str(e)}
    
    def _create_html_template(self, **kwargs) -> str:
        """Create the HTML template with business data"""
        
        template = kwargs['template']
        
        html_template = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{kwargs['hero_title']}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
        }}
        
        .hero {{
            background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('{template['hero_image']}');
            background-size: cover;
            background-position: center;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: white;
        }}
        
        .hero-content {{
            max-width: 800px;
            padding: 2rem;
        }}
        
        .hero h1 {{
            font-size: 3.5rem;
            margin-bottom: 1rem;
            font-weight: 700;
        }}
        
        .hero p {{
            font-size: 1.5rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }}
        
        .cta-button {{
            display: inline-block;
            background: {template['color_primary']};
            color: white;
            padding: 1rem 2rem;
            text-decoration: none;
            border-radius: 8px;
            font-size: 1.2rem;
            font-weight: 600;
            transition: transform 0.2s;
        }}
        
        .cta-button:hover {{
            transform: translateY(-2px);
        }}
        
        .services {{
            padding: 6rem 2rem;
            background: #f8fafc;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        
        .services h2 {{
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 3rem;
            color: {template['color_primary']};
        }}
        
        .services-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
        }}
        
        .service-card {{
            background: white;
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        
        .contact {{
            padding: 6rem 2rem;
            background: {template['color_primary']};
            color: white;
            text-align: center;
        }}
        
        .contact h2 {{
            font-size: 2.5rem;
            margin-bottom: 2rem;
        }}
        
        .contact-info {{
            display: flex;
            justify-content: center;
            gap: 4rem;
            margin-top: 2rem;
        }}
        
        .contact-item {{
            font-size: 1.2rem;
        }}
        
        .rating {{
            display: inline-block;
            background: {template['color_secondary']};
            color: {template['color_primary']};
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-weight: 600;
            margin: 1rem 0;
        }}
        
        .demo-watermark {{
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-size: 0.9rem;
            z-index: 1000;
        }}
        
        @media (max-width: 768px) {{
            .hero h1 {{ font-size: 2.5rem; }}
            .hero p {{ font-size: 1.2rem; }}
            .contact-info {{ flex-direction: column; gap: 1rem; }}
        }}
    </style>
</head>
<body>
    <div class="demo-watermark">
        🎨 Demo by Pleasant Cove Design
    </div>
    
    <section class="hero">
        <div class="hero-content">
            <h1>{kwargs['hero_title']}</h1>
            <p>{kwargs['tagline']}</p>
            <div class="rating">⭐ {kwargs['rating']} ({kwargs['reviews']} reviews)</div>
            <br><br>
            <a href="tel:{kwargs['phone']}" class="cta-button">Call Now: {kwargs['phone']}</a>
        </div>
    </section>
    
    <section class="services">
        <div class="container">
            <h2>Our Services</h2>
            <div class="services-grid">
"""
        
        # Add service cards
        for service in kwargs['services']:
            html_template += f"""
                <div class="service-card">
                    <h3>{service}</h3>
                    <p>Professional {service.lower()} services you can trust.</p>
                </div>
"""
        
        html_template += f"""
            </div>
        </div>
    </section>
    
    <section class="contact">
        <div class="container">
            <h2>Get In Touch</h2>
            <p>Ready to get started? Contact us today for a free consultation!</p>
            <div class="contact-info">
                <div class="contact-item">
                    📞 {kwargs['phone']}
                </div>
                <div class="contact-item">
                    ✉️ {kwargs['email']}
                </div>
                <div class="contact-item">
                    📍 {kwargs['address']}
                </div>
            </div>
        </div>
    </section>
</body>
</html>
"""
        
        return html_template
    
    def generate_batch_demos(self, leads: List[Dict]) -> List[Dict]:
        """Generate demos for multiple leads"""
        results = []
        
        for lead in leads:
            demo = self.generate_demo_website(lead)
            results.append(demo)
            
        logger.info(f"✅ Generated {len(results)} demo websites")
        return results
    
    def get_demo_sharing_info(self, demo_id: str) -> Dict:
        """Get sharing information for a demo"""
        demo_file = os.path.join(self.output_dir, f"{demo_id}.html")
        
        if not os.path.exists(demo_file):
            return {'error': 'Demo not found'}
        
        return {
            'demo_id': demo_id,
            'share_url': f"http://localhost:8004/demo/{demo_id}",
            'download_url': f"http://localhost:8004/download/{demo_id}",
            'preview_image': f"http://localhost:8004/preview/{demo_id}.png",
            'email_template': self._generate_email_template(demo_id),
            'sms_template': self._generate_sms_template(demo_id)
        }
    
    def _generate_email_template(self, demo_id: str) -> str:
        """Generate email template for sharing demo"""
        return f"""
Subject: Quick Website Mockup for Your Business

Hi [NAME],

I put together a quick mockup of what a professional website could look like for your business. 

👀 Take a look: http://localhost:8004/demo/{demo_id}

This is just a preview of what we could build for $500 - no upfront costs, just a simple monthly plan.

What do you think? Would love to hear your thoughts!

Best,
Ben
Pleasant Cove Design
(207) 555-0123
"""
    
    def _generate_sms_template(self, demo_id: str) -> str:
        """Generate SMS template for sharing demo"""
        return f"""Hi [NAME]! Made a quick mockup of what your website could look like: http://localhost:8004/demo/{demo_id} - What do you think? Just $500 to get started. -Ben, Pleasant Cove Design"""

# CLI for testing
if __name__ == "__main__":
    import sys
    
    generator = MinervaVisualGenerator()
    
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Test with sample data
        sample_business = {
            'name': 'Maine Coast Plumbing',
            'businessType': 'plumbing',
            'phone': '(207) 555-0123',
            'email': 'info@mainecoastplumbing.com',
            'address': 'Portland, ME',
            'rating': '4.8',
            'reviews': '127'
        }
        
        result = generator.generate_demo_website(sample_business)
        print(json.dumps(result, indent=2))
        print(f"\n🎨 Demo created! Open: {result['html_file']}")
    else:
        print("Usage: python minerva_visual_generator.py test") 