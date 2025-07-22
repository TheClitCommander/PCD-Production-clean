#!/usr/bin/env python3
"""
Minerva Visual Generator - Creates professional website mockups for leads
Now with cloud hosting and analytics support
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
import uuid
import boto3
from botocore.exceptions import ClientError
from image_validator import ImageValidator

logger = logging.getLogger(__name__)

class MinervaVisualGenerator:
    """
    Generates professional website mockups for businesses
    With cloud hosting and click tracking
    """
    
    def __init__(self, output_dir="demos"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        # Initialize image validator for reliable, relevant images
        self.image_validator = ImageValidator()
        
        # Cloud storage configuration
        self.use_cloud_storage = os.getenv('USE_CLOUD_STORAGE', 'false').lower() == 'true'
        self.cloudflare_r2_bucket = os.getenv('CLOUDFLARE_R2_BUCKET')
        self.cloudflare_r2_endpoint = os.getenv('CLOUDFLARE_R2_ENDPOINT')
        self.aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        
        # Analytics configuration
        self.analytics_webhook = os.getenv('ANALYTICS_WEBHOOK_URL')
        self.base_public_url = os.getenv('BASE_PUBLIC_URL', 'http://localhost:8005')
        
        # Initialize cloud storage client if configured
        self.s3_client = None
        if self.use_cloud_storage and self.aws_access_key:
            try:
                self.s3_client = boto3.client(
                    's3',
                    endpoint_url=self.cloudflare_r2_endpoint,
                    aws_access_key_id=self.aws_access_key,
                    aws_secret_access_key=self.aws_secret_key,
                    region_name='auto'
                )
                logger.info("✅ Cloud storage initialized")
            except Exception as e:
                logger.error(f"❌ Cloud storage init failed: {e}")
        
        # Business type templates with improved styling
        self.templates = {
            'plumbing': {
                'hero_title': '{business_name} - Expert Plumbing Services',
                'tagline': 'Fast, Reliable, Local Plumbing Solutions',
                'services': ['Emergency Repairs', 'Drain Cleaning', 'Water Heater Installation', 'Leak Detection'],
                'color_primary': '#1e40af',
                'color_secondary': '#dc2626',
                'hero_image': 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=1200&h=600',  # Professional plumber working
                'cta_text': 'Call Now for Emergency Service'
            },
            
            'restaurant': {
                'hero_title': '{business_name} - Authentic Dining Experience',
                'tagline': 'Fresh Ingredients, Bold Flavors, Unforgettable Meals',
                'services': ['Dine-In', 'Takeout', 'Catering', 'Private Events'],
                'color_primary': '#dc2626',
                'color_secondary': '#f59e0b',
                'hero_image': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&h=600',  # Restaurant interior
                'cta_text': 'Reserve Your Table Today'
            },
            
            'landscaping': {
                'hero_title': '{business_name} - Professional Landscaping',
                'tagline': 'Transform Your Outdoor Space Into Paradise',
                'services': ['Lawn Care', 'Garden Design', 'Tree Services', 'Hardscaping'],
                'color_primary': '#059669',
                'color_secondary': '#f59e0b',
                'hero_image': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&h=600',  # Beautiful landscaped garden
                'cta_text': 'Get Your Free Estimate'
            },
            
            'electrical': {
                'hero_title': '{business_name} - Licensed Electricians',
                'tagline': 'Safe, Professional Electrical Services',
                'services': ['Wiring & Rewiring', 'Panel Upgrades', 'Lighting Installation', 'Emergency Repairs'],
                'color_primary': '#f59e0b',
                'color_secondary': '#6b7280',
                'hero_image': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&h=600',  # Electrician working on panel
                'cta_text': 'Schedule Electrical Service'
            },
            
            'dental': {
                'hero_title': '{business_name} - Complete Dental Care',
                'tagline': 'Healthy Smiles, Exceptional Care',
                'services': ['General Dentistry', 'Cleanings & Exams', 'Cosmetic Dentistry', 'Emergency Care'],
                'color_primary': '#2563eb',
                'color_secondary': '#ffffff',
                'hero_image': 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&h=600',  # Clean dental office
                'cta_text': 'Book Your Appointment'
            },
            
            'default': {
                'hero_title': '{business_name} - Professional Services',
                'tagline': 'Quality Service You Can Trust',
                'services': ['Professional Service', 'Expert Solutions', 'Customer Support', 'Quality Guarantee'],
                'color_primary': '#7c3aed',
                'color_secondary': '#06b6d4',
                'hero_image': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=1200&h=600',  # Professional office building
                'cta_text': 'Contact Us Today'
            }
        }
        
        logger.info("🎨 Minerva Visual Generator initialized")
    
    def generate_demo_website(self, business_data: Dict) -> Dict:
        """
        Generate a professional website mockup for a business
        With cloud hosting and analytics tracking
        """
        try:
            # Extract business information
            business_name = business_data.get('name', 'Your Business')
            business_type = self._detect_business_type(business_data)
            rating = business_data.get('rating', '5.0')
            phone = business_data.get('phone', '(555) 123-4567')
            email = business_data.get('email', 'info@yourbusiness.com')
            address = business_data.get('address', 'Your Business Address')
            
            # Generate unique demo ID with tracking token
            demo_id = self._generate_demo_id(business_name)
            tracking_token = str(uuid.uuid4())
            
            # Get template for business type
            template = self.templates.get(business_type, self.templates['default'])
            
            # Get validated, relevant hero image
            validated_image = self.image_validator.get_validated_image(business_type)
            
            # Update template with validated image
            template = template.copy()  # Don't modify the original
            template['hero_image'] = validated_image['url']
            template['image_description'] = validated_image['description']
            
            logger.info(f"🎨 Using validated image for {business_type}: {validated_image['description']}")
            
            # Generate HTML content
            html_content = self._create_html_mockup(
                business_name=business_name,
                template=template,
                rating=rating,
                phone=phone,
                email=email,
                address=address,
                demo_id=demo_id,
                tracking_token=tracking_token
            )
            
            # Save locally
            local_file = os.path.join(self.output_dir, f"{demo_id}.html")
            with open(local_file, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            # Upload to cloud storage if configured
            public_url = self._upload_to_cloud(demo_id, html_content) if self.use_cloud_storage else None
            
            # Generate secure preview URL with tracking
            preview_url = f"{self.base_public_url}/preview/{demo_id}?token={tracking_token}"
            
            # Track demo generation
            self._track_event('demo_generated', {
                'demo_id': demo_id,
                'business_name': business_name,
                'business_type': business_type,
                'tracking_token': tracking_token,
                'image_used': validated_image['description']
            })
            
            result = {
                'demo_id': demo_id,
                'tracking_token': tracking_token,
                'business_name': business_name,
                'business_type': business_type,
                'html_file': local_file,
                'preview_url': preview_url,
                'public_url': public_url or f"file://{os.path.abspath(local_file)}",
                'secure_url': preview_url,
                'created_at': datetime.now().isoformat(),
                'template_used': business_type,
                'image_validated': validated_image['verified'],
                'expires_at': self._calculate_expiry(),
                'content': {
                    'hero_title': template['hero_title'].format(business_name=business_name),
                    'tagline': template['tagline'],
                    'services': template['services'],
                    'cta_text': template['cta_text'],
                    'hero_image_description': validated_image['description']
                }
            }
            
            logger.info(f"✅ Demo created: {demo_id}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Demo generation failed: {e}")
            return {'error': str(e)}
    
    def _upload_to_cloud(self, demo_id: str, html_content: str) -> Optional[str]:
        """Upload demo to cloud storage and return public URL"""
        if not self.s3_client or not self.cloudflare_r2_bucket:
            return None
        
        try:
            key = f"demos/{demo_id}.html"
            
            self.s3_client.put_object(
                Bucket=self.cloudflare_r2_bucket,
                Key=key,
                Body=html_content,
                ContentType='text/html',
                CacheControl='max-age=86400'  # 24 hour cache
            )
            
            # Generate public URL
            public_url = f"https://{self.cloudflare_r2_bucket}.r2.dev/{key}"
            logger.info(f"☁️ Demo uploaded to cloud: {public_url}")
            return public_url
            
        except ClientError as e:
            logger.error(f"❌ Cloud upload failed: {e}")
            return None
    
    def _track_event(self, event_type: str, data: Dict):
        """Track analytics events for demo engagement"""
        if not self.analytics_webhook:
            return
        
        try:
            import requests
            
            payload = {
                'event': event_type,
                'timestamp': datetime.now().isoformat(),
                'data': data
            }
            
            requests.post(
                self.analytics_webhook,
                json=payload,
                timeout=5
            )
            
            logger.info(f"📊 Tracked event: {event_type}")
            
        except Exception as e:
            logger.warning(f"⚠️ Analytics tracking failed: {e}")
    
    def track_demo_view(self, demo_id: str, tracking_token: str, user_agent: str = None) -> Dict:
        """Track when someone views a demo"""
        try:
            self._track_event('demo_viewed', {
                'demo_id': demo_id,
                'tracking_token': tracking_token,
                'user_agent': user_agent,
                'timestamp': datetime.now().isoformat()
            })
            
            return {
                'tracked': True,
                'demo_id': demo_id,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ View tracking failed: {e}")
            return {'tracked': False, 'error': str(e)}
    
    def track_cta_click(self, demo_id: str, tracking_token: str, cta_type: str) -> Dict:
        """Track when someone clicks a CTA in the demo"""
        try:
            self._track_event('cta_clicked', {
                'demo_id': demo_id,
                'tracking_token': tracking_token,
                'cta_type': cta_type,
                'timestamp': datetime.now().isoformat()
            })
            
            return {
                'tracked': True,
                'demo_id': demo_id,
                'cta_type': cta_type,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ CTA tracking failed: {e}")
            return {'tracked': False, 'error': str(e)}
    
    def _calculate_expiry(self) -> str:
        """Calculate demo expiry date (7 days from now)"""
        from datetime import timedelta
        expiry = datetime.now() + timedelta(days=7)
        return expiry.isoformat()
    
    def _detect_business_type(self, business_data: Dict) -> str:
        """
        Detect business type from name/description with improved accuracy
        """
        name = business_data.get('name', '').lower()
        business_type = business_data.get('businessType', '').lower()
        description = business_data.get('description', '').lower()
        
        # Combine all text for analysis
        all_text = f"{name} {business_type} {description}"
        
        # Enhanced keyword matching with scoring
        type_scores = {
            'plumbing': 0,
            'restaurant': 0,
            'landscaping': 0,
            'electrical': 0,
            'dental': 0
        }
        
        # Plumbing keywords (weighted by relevance)
        plumbing_keywords = {
            'plumb': 5, 'plumber': 5, 'plumbing': 5,
            'pipe': 3, 'drain': 4, 'water': 2,
            'leak': 4, 'faucet': 4, 'toilet': 3,
            'sewer': 4, 'heating': 2, 'hvac': 2
        }
        
        # Restaurant keywords
        restaurant_keywords = {
            'restaurant': 5, 'food': 3, 'dining': 4,
            'cafe': 5, 'bistro': 5, 'bar': 4,
            'grill': 4, 'kitchen': 3, 'menu': 4,
            'pizza': 4, 'burger': 3, 'deli': 4
        }
        
        # Landscaping keywords
        landscaping_keywords = {
            'landscape': 5, 'landscaping': 5, 'lawn': 4,
            'garden': 4, 'yard': 3, 'tree': 3,
            'grass': 3, 'mowing': 4, 'irrigation': 4,
            'hardscape': 4, 'outdoor': 2
        }
        
        # Electrical keywords
        electrical_keywords = {
            'electric': 5, 'electrical': 5, 'electrician': 5,
            'wire': 3, 'wiring': 4, 'lighting': 3,
            'panel': 4, 'outlet': 3, 'breaker': 4,
            'voltage': 4, 'install': 2
        }
        
        # Dental keywords
        dental_keywords = {
            'dental': 5, 'dentist': 5, 'teeth': 4,
            'oral': 4, 'smile': 3, 'cleaning': 3,
            'braces': 4, 'cavity': 4, 'root': 2
        }
        
        # Score each business type
        keyword_sets = {
            'plumbing': plumbing_keywords,
            'restaurant': restaurant_keywords,
            'landscaping': landscaping_keywords,
            'electrical': electrical_keywords,
            'dental': dental_keywords
        }
        
        for business_type_key, keywords in keyword_sets.items():
            for keyword, weight in keywords.items():
                if keyword in all_text:
                    type_scores[business_type_key] += weight
        
        # Get the highest scoring type
        best_type = max(type_scores, key=type_scores.get)
        best_score = type_scores[best_type]
        
        # Require minimum confidence score
        if best_score >= 3:
            logger.info(f"🎯 Business type detected: {best_type} (confidence: {best_score})")
            return best_type
        else:
            logger.warning(f"⚠️ Low confidence business type detection. Using default. Scores: {type_scores}")
            return 'default'
    
    def _generate_demo_id(self, business_name: str) -> str:
        """Generate unique demo ID"""
        clean_name = ''.join(c.lower() for c in business_name if c.isalnum() or c.isspace()).replace(' ', '_')
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return f"{clean_name}_{timestamp}"
    
    def _create_html_mockup(self, business_name: str, template: Dict, rating: str, 
                           phone: str, email: str, address: str, demo_id: str, tracking_token: str) -> str:
        """Create HTML mockup with analytics tracking"""
        
        hero_title = template['hero_title'].format(business_name=business_name)
        
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{business_name} - Professional Website</title>
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
            background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('{template['hero_image']}');
            background-size: cover;
            background-position: center;
            height: 70vh;
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
            font-weight: 700;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }}
        
        .hero p {{
            font-size: 1.5rem;
            margin-bottom: 2rem;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }}
        
        .cta-button {{
            background: {template['color_primary']};
            color: white;
            padding: 1rem 2rem;
            font-size: 1.2rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }}
        
        .cta-button:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }}
        
        .section {{
            padding: 4rem 2rem;
            max-width: 1200px;
            margin: 0 auto;
        }}
        
        .services-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }}
        
        .service-card {{
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.2s;
        }}
        
        .service-card:hover {{
            transform: translateY(-5px);
        }}
        
        .contact-info {{
            background: #f8fafc;
            padding: 3rem 2rem;
            text-align: center;
        }}
        
        .rating {{
            color: {template['color_secondary']};
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 1rem;
        }}
        
        .footer {{
            background: #1f2937;
            color: white;
            text-align: center;
            padding: 2rem;
        }}
        
        .watermark {{
            font-size: 0.9rem;
            opacity: 0.7;
            margin-top: 1rem;
        }}
        
        @media (max-width: 768px) {{
            .hero h1 {{
                font-size: 2.5rem;
            }}
            
            .hero p {{
                font-size: 1.2rem;
            }}
            
            .section {{
                padding: 2rem 1rem;
            }}
        }}
    </style>
    
    <!-- Analytics Tracking -->
    <script>
        // Track page view
        fetch('/api/track/view', {{
            method: 'POST',
            headers: {{ 'Content-Type': 'application/json' }},
            body: JSON.stringify({{
                demo_id: '{demo_id}',
                tracking_token: '{tracking_token}',
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }})
        }}).catch(console.error);
        
        // Track CTA clicks
        function trackCTA(ctaType) {{
            fetch('/api/track/cta', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{
                    demo_id: '{demo_id}',
                    tracking_token: '{tracking_token}',
                    cta_type: ctaType,
                    timestamp: new Date().toISOString()
                }})
            }}).catch(console.error);
        }}
    </script>
</head>
<body>
    <!-- Hero Section -->
    <section class="hero">
        <div class="hero-content">
            <h1>{hero_title}</h1>
            <p>{template['tagline']}</p>
            <a href="tel:{phone}" class="cta-button" onclick="trackCTA('phone')">{template['cta_text']}</a>
        </div>
    </section>
    
    <!-- Services Section -->
    <section class="section">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 2rem; color: {template['color_primary']};">Our Services</h2>
        <div class="services-grid">"""
        
        for service in template['services']:
            html_content += f"""
            <div class="service-card">
                <h3 style="color: {template['color_primary']}; margin-bottom: 1rem;">{service}</h3>
                <p>Professional {service.lower()} services you can trust.</p>
            </div>"""
        
        html_content += f"""
        </div>
    </section>
    
    <!-- Appointment Booking Section -->
    <section class="appointment-section" style="padding: 80px 20px; background: #f8f9fa; text-align: center;">
        <div style="max-width: 800px; margin: 0 auto;">
            <h2 style="color: {template['color_primary']}; font-size: 2.5rem; margin-bottom: 1rem;">Schedule Your Free Consultation</h2>
            <p style="font-size: 1.2rem; color: #666; max-width: 600px; margin: 0 auto 40px;">
                Ready to get started? Book a free 15-minute consultation to discuss your project needs.
            </p>
            
            <!-- Appointment Widget Container -->
            <div id="appointment-widget-container" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); overflow: hidden;">
                <div id="appointment-widget" style="min-height: 400px; padding: 40px;">
                    <!-- Loading State -->
                    <div id="appointment-loading" style="text-align: center; padding: 60px 20px;">
                        <div style="width: 50px; height: 50px; border: 3px solid #f3f3f3; border-top: 3px solid {template['color_primary']}; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                        <p style="color: #666;">Loading available appointment times...</p>
                    </div>
                    
                    <!-- Error State (hidden by default) -->
                    <div id="appointment-error" style="display: none; text-align: center; padding: 40px 20px;">
                        <h3 style="color: #e74c3c; margin-bottom: 1rem;">Booking Temporarily Unavailable</h3>
                        <p style="color: #666; margin-bottom: 2rem;">Please call us directly to schedule your consultation.</p>
                        <a href="tel:{phone}" class="cta-button" onclick="trackCTA('phone_fallback')" 
                           style="background: {template['color_primary']}; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                           Call {phone}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="contact-info">
        <div class="rating">⭐ {rating} Star Rating</div>
        <h2 style="color: {template['color_primary']}; margin-bottom: 2rem;">Get In Touch</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
            <div>
                <h3>📞 Phone</h3>
                <p><a href="tel:{phone}" onclick="trackCTA('phone')" style="color: {template['color_primary']}; text-decoration: none;">{phone}</a></p>
            </div>
            <div>
                <h3>📧 Email</h3>
                <p><a href="mailto:{email}" onclick="trackCTA('email')" style="color: {template['color_primary']}; text-decoration: none;">{email}</a></p>
            </div>
            <div>
                <h3>📍 Location</h3>
                <p>{address}</p>
            </div>
        </div>
        <a href="tel:{phone}" class="cta-button" onclick="trackCTA('contact')">Contact Us Today</a>
    </section>
    
    <!-- Footer -->
    <footer class="footer">
        <p>&copy; 2024 {business_name}. All rights reserved.</p>
        <div class="watermark">
            Website mockup created by <strong>Pleasant Cove Design</strong><br>
            Ready to make this real? Let's build your professional website!
        </div>
    </footer>

    <!-- Appointment Widget JavaScript -->
    <script>
        // Appointment Widget Integration
        (function() {{
            // Add CSS animations
            const style = document.createElement('style');
            style.textContent = `
                @keyframes spin {{
                    0% {{ transform: rotate(0deg); }}
                    100% {{ transform: rotate(360deg); }}
                }}
            `;
            document.head.appendChild(style);

            // Initialize appointment widget
            function initAppointmentWidget() {{
                console.log('🗓️ Initializing appointment widget...');
                
                // Try to load available slots
                fetch('http://localhost:3000/api/appointments/slots')
                    .then(response => {{
                        if (!response.ok) {{
                            throw new Error(`HTTP ${{response.status}}`);
                        }}
                        return response.json();
                    }})
                    .then(data => {{
                        console.log('✅ Appointment slots loaded:', data);
                        renderAppointmentSlots(data.slots || []);
                    }})
                    .catch(error => {{
                        console.error('❌ Failed to load appointment slots:', error);
                        showAppointmentError();
                    }});
            }}

            function renderAppointmentSlots(slots) {{
                const container = document.getElementById('appointment-widget');
                document.getElementById('appointment-loading').style.display = 'none';
                
                if (slots.length === 0) {{
                    container.innerHTML = `
                        <div style="text-align: center; padding: 40px 20px;">
                            <h3 style="color: #666; margin-bottom: 1rem;">No Available Slots</h3>
                            <p style="color: #666; margin-bottom: 2rem;">Please call us to schedule your consultation.</p>
                            <a href="tel:{phone}" class="cta-button" onclick="trackCTA('phone_no_slots')" 
                               style="background: {template['color_primary']}; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                               Call {phone}
                            </a>
                        </div>
                    `;
                    return;
                }}

                // Render appointment slots
                let slotsHTML = '<div style="text-align: left;"><h3 style="margin-bottom: 20px; text-align: center;">Available Times</h3>';
                slots.slice(0, 6).forEach(slot => {{
                    const date = new Date(slot.time);
                    const dateStr = date.toLocaleDateString();
                    const timeStr = date.toLocaleTimeString([], {{hour: '2-digit', minute:'2-digit'}});
                    
                    slotsHTML += `
                        <div class="slot-option" onclick="selectSlot('${{slot.id}}', '${{dateStr}} at ${{timeStr}}')" 
                             style="padding: 15px; margin: 10px 0; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.3s;">
                            <strong>${{dateStr}}</strong> at ${{timeStr}}
                        </div>
                    `;
                }});
                slotsHTML += '</div>';
                
                container.innerHTML = slotsHTML;
                
                // Add hover effects
                const slotOptions = container.querySelectorAll('.slot-option');
                slotOptions.forEach(slot => {{
                    slot.addEventListener('mouseenter', () => {{
                        slot.style.borderColor = '{template['color_primary']}';
                        slot.style.backgroundColor = '#f8f9fa';
                    }});
                    slot.addEventListener('mouseleave', () => {{
                        slot.style.borderColor = '#e0e0e0';
                        slot.style.backgroundColor = 'white';
                    }});
                }});
            }}

            function showAppointmentError() {{
                document.getElementById('appointment-loading').style.display = 'none';
                document.getElementById('appointment-error').style.display = 'block';
            }}

            // Global function for slot selection
            window.selectSlot = function(slotId, slotTime) {{
                trackCTA('appointment_slot_selected');
                alert(`Great! You selected ${{slotTime}}. We'll call you shortly to confirm your free consultation.`);
                
                // In a real implementation, this would open a booking form
                // For now, we'll simulate the booking
                console.log(`Slot selected: ${{slotId}} - ${{slotTime}}`);
            }};

            // Initialize when page loads
            if (document.readyState === 'loading') {{
                document.addEventListener('DOMContentLoaded', initAppointmentWidget);
            }} else {{
                initAppointmentWidget();
            }}
        }})();
    </script>
</body>
</html>"""
        
        return html_content

# Test mode for CLI usage
if __name__ == "__main__":
    import sys
    
    generator = MinervaVisualGenerator()
    
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # Test with sample data
        sample_business = {
            'name': 'Maine Coast Plumbing',
            'businessType': 'plumbing',
            'rating': '4.8',
            'phone': '(207) 555-0123',
            'email': 'info@mainecoastplumbing.com',
            'address': '123 Harbor Street, Portland, ME 04101'
        }
        
        result = generator.generate_demo_website(sample_business)
        print(json.dumps(result, indent=2))
        
        if not result.get('error'):
            print(f"\n🎨 Demo created! Open: {result['html_file']}")
    else:
        print("Usage: python minerva_visual_generator.py test") 