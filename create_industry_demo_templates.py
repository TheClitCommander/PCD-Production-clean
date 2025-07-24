#!/usr/bin/env python3
"""
Industry-Specific Demo Generator
Creates beautiful, professional website demos for different industries
"""

import json
import os
import sys
from datetime import datetime
import html

# Industry-specific content and styling
INDUSTRY_TEMPLATES = {
    "plumbing": {
        "hero_title": "Expert Plumbing Services",
        "hero_subtitle": "24/7 Emergency Response • Licensed & Insured • Same-Day Service",
        "services": [
            "Emergency Plumbing Repairs",
            "Drain Cleaning & Unclogging",
            "Water Heater Installation",
            "Pipe Repair & Replacement",
            "Bathroom & Kitchen Plumbing",
            "Sewer Line Services"
        ],
        "colors": {
            "primary": "#2563eb",
            "secondary": "#1e40af",
            "accent": "#3b82f6",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
            "service1": "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400",
            "service2": "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400"
        }
    },
    "landscaping": {
        "hero_title": "Transform Your Outdoor Space",
        "hero_subtitle": "Professional Landscaping • Design & Installation • Maintenance Services",
        "services": [
            "Landscape Design & Planning",
            "Lawn Care & Maintenance",
            "Tree & Shrub Planting",
            "Hardscaping & Patios",
            "Irrigation Systems",
            "Seasonal Cleanup"
        ],
        "colors": {
            "primary": "#16a34a",
            "secondary": "#15803d",
            "accent": "#22c55e",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800",
            "service1": "https://images.unsplash.com/photo-1574516919501-9b9353e5059d?w=400",
            "service2": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"
        }
    },
    "restaurant": {
        "hero_title": "Exceptional Dining Experience",
        "hero_subtitle": "Fresh Ingredients • Local Flavors • Memorable Moments",
        "services": [
            "Dine-In Experience",
            "Takeout & Delivery",
            "Catering Services",
            "Private Events",
            "Wine Selection",
            "Daily Specials"
        ],
        "colors": {
            "primary": "#dc2626",
            "secondary": "#b91c1c",
            "accent": "#ef4444",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
            "service1": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
            "service2": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400"
        }
    },
    "dental": {
        "hero_title": "Your Smile, Our Priority",
        "hero_subtitle": "Comprehensive Dental Care • Modern Technology • Comfortable Experience",
        "services": [
            "General Dentistry",
            "Cosmetic Dentistry",
            "Teeth Whitening",
            "Dental Implants",
            "Orthodontics",
            "Emergency Dental Care"
        ],
        "colors": {
            "primary": "#0891b2",
            "secondary": "#0e7490",
            "accent": "#06b6d4",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800",
            "service1": "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=400",
            "service2": "https://images.unsplash.com/photo-1581056771107-24ca5f033842?w=400"
        }
    },
    "auto": {
        "hero_title": "Expert Auto Service",
        "hero_subtitle": "Quality Repairs • Fast Service • Honest Pricing",
        "services": [
            "Oil Changes & Maintenance",
            "Brake Repair & Service",
            "Engine Diagnostics",
            "Tire Installation",
            "AC Repair",
            "State Inspections"
        ],
        "colors": {
            "primary": "#ea580c",
            "secondary": "#c2410c",
            "accent": "#fb923c",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800",
            "service1": "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400",
            "service2": "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400"
        }
    },
    "consulting": {
        "hero_title": "Strategic Business Solutions",
        "hero_subtitle": "Expert Consulting • Growth Strategies • Results-Driven Approach • Proven Success",
        "services": [
            "Business Strategy Development",
            "Marketing & Brand Consulting", 
            "Operations Optimization",
            "Financial Analysis & Planning",
            "Digital Transformation",
            "Leadership Development"
        ],
        "colors": {
            "primary": "#0f172a",
            "secondary": "#1e293b", 
            "accent": "#3b82f6",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1553028826-f4804a6dfd3f?w=800",
            "service1": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400",
            "service2": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"
        }
    },
    "marketing": {
        "hero_title": "Results-Driven Marketing",
        "hero_subtitle": "Digital Marketing • Brand Development • Lead Generation • ROI-Focused Campaigns",
        "services": [
            "Digital Marketing Strategy",
            "Social Media Management",
            "Content Creation & Marketing",
            "SEO & Search Marketing",
            "Email Marketing Campaigns",
            "Brand Development & Design"
        ],
        "colors": {
            "primary": "#7c3aed",
            "secondary": "#5b21b6",
            "accent": "#a855f7",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
            "service1": "https://images.unsplash.com/photo-1553028826-f4804a6dfd3f?w=400",
            "service2": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400"
        }
    },
    "legal": {
        "hero_title": "Trusted Legal Services",
        "hero_subtitle": "Experienced Attorneys • Personal Attention • Proven Results • Client-Focused Approach",
        "services": [
            "Personal Injury Law",
            "Family Law & Divorce",
            "Business Legal Services",
            "Estate Planning & Wills",
            "Real Estate Law",
            "Criminal Defense"
        ],
        "colors": {
            "primary": "#1f2937",
            "secondary": "#111827",
            "accent": "#dc2626",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800",
            "service1": "https://images.unsplash.com/photo-1521791055366-0d553872125f?w=400",
            "service2": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"
        }
    },
    "medical": {
        "hero_title": "Comprehensive Healthcare",
        "hero_subtitle": "Expert Medical Care • Compassionate Service • Modern Facilities • Patient-Centered Approach",
        "services": [
            "Primary Care Services",
            "Preventive Medicine",
            "Diagnostic Services",
            "Specialist Consultations",
            "Health Screenings",
            "Wellness Programs"
        ],
        "colors": {
            "primary": "#059669",
            "secondary": "#047857",
            "accent": "#10b981",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800",
            "service1": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400",
            "service2": "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400"
        }
    },
    "fitness": {
        "hero_title": "Achieve Your Fitness Goals",
        "hero_subtitle": "Personal Training • Group Classes • Nutrition Coaching • Results-Guaranteed Programs",
        "services": [
            "Personal Training",
            "Group Fitness Classes",
            "Nutrition Counseling",
            "Weight Loss Programs",
            "Strength Training",
            "Fitness Assessments"
        ],
        "colors": {
            "primary": "#dc2626",
            "secondary": "#b91c1c",
            "accent": "#ef4444",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
            "service1": "https://images.unsplash.com/photo-1549476464-37392f717541?w=400",
            "service2": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400"
        }
    },
    "beauty": {
        "hero_title": "Beauty & Wellness Services",
        "hero_subtitle": "Professional Treatments • Relaxing Atmosphere • Skilled Stylists • Personalized Care",
        "services": [
            "Hair Styling & Cuts",
            "Color & Highlights",
            "Facial Treatments",
            "Nail Services",
            "Spa Treatments",
            "Bridal Services"
        ],
        "colors": {
            "primary": "#ec4899",
            "secondary": "#db2777",
            "accent": "#f472b6",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800",
            "service1": "https://images.unsplash.com/photo-1522336284037-91e2bd562e9b?w=400",
            "service2": "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400"
        }
    },
    "realestate": {
        "hero_title": "Your Real Estate Partner",
        "hero_subtitle": "Local Market Expertise • Proven Results • Client-First Service • Professional Excellence",
        "services": [
            "Home Buying & Selling",
            "Property Valuations",
            "Investment Properties",
            "First-Time Buyer Programs",
            "Commercial Real Estate",
            "Property Management"
        ],
        "colors": {
            "primary": "#0369a1",
            "secondary": "#0284c7",
            "accent": "#0ea5e9",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800",
            "service1": "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=400",
            "service2": "https://images.unsplash.com/photo-1448630360428-65456885c650?w=400"
        }
    },
    "construction": {
        "hero_title": "Quality Construction Services",
        "hero_subtitle": "Licensed Contractors • Quality Craftsmanship • On-Time Delivery • Competitive Pricing",
        "services": [
            "Home Renovations",
            "Kitchen & Bath Remodeling",
            "Roofing & Siding",
            "Custom Home Building",
            "Commercial Construction",
            "Emergency Repairs"
        ],
        "colors": {
            "primary": "#ea580c",
            "secondary": "#c2410c",
            "accent": "#fb923c",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800",
            "service1": "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400",
            "service2": "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400"
        }
    },
    "electrical": {
        "hero_title": "Expert Electrical Services",
        "hero_subtitle": "Licensed Electricians • 24/7 Emergency Service • Safety First • Reliable Solutions",
        "services": [
            "Electrical Repairs",
            "Panel Upgrades",
            "Outlet & Switch Installation",
            "Lighting Solutions",
            "Electrical Inspections",
            "Smart Home Installation"
        ],
        "colors": {
            "primary": "#fbbf24",
            "secondary": "#f59e0b",
            "accent": "#fcd34d",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800",
            "service1": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
            "service2": "https://images.unsplash.com/photo-1609205264519-02d5b95e4a8c?w=400"
        }
    },
    "hvac": {
        "hero_title": "Heating & Cooling Experts",
        "hero_subtitle": "HVAC Installation • Repair & Maintenance • Energy Efficient Solutions • 24/7 Service",
        "services": [
            "HVAC Installation",
            "Heating System Repair",
            "Air Conditioning Service",
            "Duct Cleaning",
            "Energy Efficiency Upgrades",
            "Emergency HVAC Service"
        ],
        "colors": {
            "primary": "#0891b2",
            "secondary": "#0e7490",
            "accent": "#06b6d4",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800",
            "service1": "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400",
            "service2": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"
        }
    },
    "accounting": {
        "hero_title": "Professional Accounting Services",
        "hero_subtitle": "Tax Preparation • Financial Planning • Bookkeeping • Business Advisory Services",
        "services": [
            "Tax Preparation & Planning",
            "Bookkeeping Services",
            "Financial Statement Preparation",
            "Business Advisory",
            "Payroll Services",
            "QuickBooks Setup & Training"
        ],
        "colors": {
            "primary": "#047857",
            "secondary": "#065f46",
            "accent": "#10b981",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800",
            "service1": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
            "service2": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400"
        }
    },
    "cleaning": {
        "hero_title": "Professional Cleaning Services",
        "hero_subtitle": "Reliable & Thorough • Eco-Friendly Products • Flexible Scheduling • Satisfaction Guaranteed",
        "services": [
            "Residential Cleaning",
            "Commercial Cleaning",
            "Deep Cleaning Services",
            "Move-In/Move-Out Cleaning",
            "Post-Construction Cleanup",
            "Regular Maintenance Cleaning"
        ],
        "colors": {
            "primary": "#0ea5e9",
            "secondary": "#0284c7",
            "accent": "#38bdf8",
            "text": "#1f2937",
            "background": "#ffffff"
        },
        "images": {
            "hero": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
            "service1": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400",
            "service2": "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=400"
        }
    }
}

def get_best_template_match(industry):
    """Get the best matching template for an industry with intelligent fallbacks"""
    industry_lower = industry.lower()
    
    # Direct match
    if industry_lower in INDUSTRY_TEMPLATES:
        return INDUSTRY_TEMPLATES[industry_lower]
    
    # Intelligent fallbacks for common variations
    fallback_mapping = {
        # Professional Services
        "law": "legal", "lawyer": "legal", "attorney": "legal", "litigation": "legal",
        "cpa": "accounting", "bookkeeping": "accounting", "tax": "accounting", "finance": "accounting",
        "business": "consulting", "strategy": "consulting", "management": "consulting",
        "advertising": "marketing", "branding": "marketing", "digital": "marketing", "seo": "marketing",
        
        # Healthcare
        "healthcare": "medical", "doctor": "medical", "clinic": "medical", "therapy": "medical",
        "dentist": "dental", "orthodontist": "dental", "oral": "dental",
        
        # Home Services  
        "contractor": "construction", "renovation": "construction", "remodeling": "construction",
        "builder": "construction", "carpentry": "construction", "masonry": "construction",
        "electrician": "electrical", "wiring": "electrical", "lighting": "electrical",
        "heating": "hvac", "cooling": "hvac", "airconditioning": "hvac", "ac": "hvac",
        "plumber": "plumbing", "pipes": "plumbing", "drain": "plumbing", "water": "plumbing",
        
        # Automotive
        "automotive": "auto", "mechanic": "auto", "car": "auto", "truck": "auto", "vehicle": "auto",
        
        # Food & Hospitality
        "cafe": "restaurant", "diner": "restaurant", "bistro": "restaurant", "catering": "restaurant",
        "food": "restaurant", "hospitality": "restaurant", "bar": "restaurant",
        
        # Personal Services
        "salon": "beauty", "spa": "beauty", "hair": "beauty", "nail": "beauty", "cosmetic": "beauty",
        "gym": "fitness", "personal training": "fitness", "workout": "fitness", "exercise": "fitness",
        "wellness": "fitness", "health": "fitness", "yoga": "fitness",
        
        # Property Services
        "property": "realestate", "realtor": "realestate", "homes": "realestate", "housing": "realestate",
        "janitorial": "cleaning", "maid": "cleaning", "housekeeping": "cleaning", "maintenance": "cleaning",
        
        # Landscaping variations
        "lawn": "landscaping", "garden": "landscaping", "yard": "landscaping", "tree": "landscaping",
        "irrigation": "landscaping", "outdoor": "landscaping"
    }
    
    # Check fallback mappings
    for keyword, template_key in fallback_mapping.items():
        if keyword in industry_lower:
            return INDUSTRY_TEMPLATES[template_key]
    
    # Default to professional services (consulting) for unknown industries
    print(f"⚠️ Warning: No specific template for '{industry}', using consulting template as fallback", file=sys.stderr)
    return INDUSTRY_TEMPLATES["consulting"]

def generate_demo_html(company_name, industry, style="modern"):
    """Generate a complete HTML demo for the company"""
    
    # Get best matching template with intelligent fallbacks
    template = get_best_template_match(industry)
    
    # Sanitize company name for HTML and create safe version for search
    safe_company_name = html.escape(company_name)
    # Create a version for content validation that handles special characters
    search_company_name = company_name.replace('&', 'and').replace("'", "")
    
    # Generate timestamp for unique demo ID
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create the HTML
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{search_company_name} - {template['hero_title']}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: {template['colors']['text']};
            background: {template['colors']['background']};
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }}
        
        /* Header */
        header {{
            background: {template['colors']['primary']};
            color: white;
            padding: 1rem 0;
            position: fixed;
            width: 100%;
            top: 0;
            z-index: 1000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        
        nav {{
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        
        .logo {{
            font-size: 1.5rem;
            font-weight: bold;
        }}
        
        .nav-links {{
            display: flex;
            list-style: none;
            gap: 2rem;
        }}
        
        .nav-links a {{
            color: white;
            text-decoration: none;
            transition: color 0.3s;
        }}
        
        .nav-links a:hover {{
            color: {template['colors']['accent']};
        }}
        
        /* Hero Section */
        .hero {{
            background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('{template['images']['hero']}');
            background-size: cover;
            background-position: center;
            height: 100vh;
            display: flex;
            align-items: center;
            text-align: center;
            color: white;
        }}
        
        .hero-content h1 {{
            font-size: 3.5rem;
            margin-bottom: 1rem;
            font-weight: 700;
        }}
        
        .hero-content p {{
            font-size: 1.3rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }}
        
        .cta-button {{
            background: {template['colors']['accent']};
            color: white;
            padding: 15px 30px;
            font-size: 1.1rem;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            display: inline-block;
        }}
        
        .cta-button:hover {{
            background: {template['colors']['secondary']};
            transform: translateY(-2px);
        }}
        
        /* Services Section */
        .services {{
            padding: 80px 0;
            background: #f8fafc;
        }}
        
        .section-title {{
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 3rem;
            color: {template['colors']['primary']};
        }}
        
        .services-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }}
        
        .service-card {{
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }}
        
        .service-card:hover {{
            transform: translateY(-5px);
        }}
        
        .service-card h3 {{
            color: {template['colors']['primary']};
            margin-bottom: 1rem;
            font-size: 1.3rem;
        }}
        
        /* Contact Section */
        .contact {{
            padding: 80px 0;
            background: {template['colors']['primary']};
            color: white;
            text-align: center;
        }}
        
        .contact-info {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-top: 2rem;
        }}
        
        .contact-item {{
            background: rgba(255,255,255,0.1);
            padding: 2rem;
            border-radius: 10px;
        }}
        
        .contact-item h3 {{
            margin-bottom: 1rem;
            color: {template['colors']['accent']};
        }}
        
        /* Footer */
        footer {{
            background: {template['colors']['text']};
            color: white;
            text-align: center;
            padding: 2rem 0;
        }}
        
        /* Responsive */
        @media (max-width: 768px) {{
            .nav-links {{
                display: none;
            }}
            
            .hero-content h1 {{
                font-size: 2.5rem;
            }}
            
            .hero-content p {{
                font-size: 1.1rem;
            }}
        }}
        
        /* Pleasant Cove Design Watermark */
        .watermark {{
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 5px;
            font-size: 0.8rem;
            z-index: 1000;
        }}
        
        .watermark a {{
            color: {template['colors']['accent']};
            text-decoration: none;
        }}
    </style>
</head>
<body>
    <!-- Watermark -->
    <div class="watermark">
        Demo by <a href="https://pleasantcovedesign.com">Pleasant Cove Design</a>
    </div>
    
    <!-- Header -->
    <header>
        <nav class="container">
            <div class="logo">{search_company_name}</div>
            <ul class="nav-links">
                <li><a href="#home">Home</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>
    
    <!-- Hero Section -->
    <section class="hero" id="home">
        <div class="container">
            <div class="hero-content">
                <h1>{search_company_name}</h1>
                <p>{template['hero_subtitle']}</p>
                <a href="#contact" class="cta-button">Get Free Quote</a>
            </div>
        </div>
    </section>
    
    <!-- Services Section -->
    <section class="services" id="services">
        <div class="container">
            <h2 class="section-title">Our Services</h2>
            <div class="services-grid">
"""
    
    # Add service cards
    for service in template['services']:
        html_content += f"""
                <div class="service-card">
                    <h3>{service}</h3>
                    <p>Professional {service.lower()} services with quality you can trust. Contact us for a free consultation and quote.</p>
                </div>"""
    
    html_content += f"""
            </div>
        </div>
    </section>
    
    <!-- Contact Section -->
    <section class="contact" id="contact">
        <div class="container">
            <h2 class="section-title">Get In Touch</h2>
            <p>Ready to get started? Contact us today for a free consultation!</p>
            
            <div class="contact-info">
                <div class="contact-item">
                    <h3>📞 Call Us</h3>
                    <p>(207) 555-0123</p>
                </div>
                <div class="contact-item">
                    <h3>✉️ Email</h3>
                    <p>info@{search_company_name.lower().replace(' ', '')}.com</p>
                </div>
                <div class="contact-item">
                    <h3>⏰ Hours</h3>
                    <p>Mon-Fri: 8AM-6PM<br>Sat: 9AM-4PM</p>
                </div>
            </div>
        </div>
    </section>
    
    <!-- Footer -->
    <footer>
        <div class="container">
            <p>&copy; 2025 {search_company_name}. All rights reserved. | Website by Pleasant Cove Design</p>
        </div>
    </footer>
    
    <script>
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {{
            anchor.addEventListener('click', function (e) {{
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({{
                    behavior: 'smooth'
                }});
            }});
        }});
        
        // Track demo interaction
        console.log('Demo loaded for {search_company_name} - {industry} industry');
        
        // Demo analytics (placeholder)
        document.addEventListener('click', function(e) {{
            if (e.target.classList.contains('cta-button')) {{
                console.log('CTA clicked - {search_company_name}');
                alert('This is a demo. In the real site, this would start the quote process!');
            }}
        }});
    </script>
</body>
</html>"""
    
    return html_content, timestamp

def save_demo_file(html_content, company_name, industry, timestamp):
    """Save the demo HTML file"""
    
    # Create demos directory if it doesn't exist
    demos_dir = "demos"
    if not os.path.exists(demos_dir):
        os.makedirs(demos_dir)
    
    # Generate filename
    safe_name = company_name.lower().replace(' ', '_').replace('&', 'and')
    filename = f"{safe_name}_{industry}_{timestamp}.html"
    filepath = os.path.join(demos_dir, filename)
    
    # Write the file
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return filepath, filename

def validate_demo_content(html_content, company_name, industry, template):
    """Validate that demo content matches the requested industry"""
    issues = []
    
    # Check if company name appears in content (handle special characters)
    search_name = company_name.replace('&', 'and').replace("'", "").lower()
    if search_name not in html_content.lower():
        issues.append(f"Company name '{company_name}' not found in content")
    
    # Check if industry-specific services appear
    service_count = 0
    for service in template['services']:
        if service.lower() in html_content.lower():
            service_count += 1
    
    if service_count < len(template['services']) // 2:  # At least half the services should appear
        issues.append(f"Only {service_count}/{len(template['services'])} industry services found in content")
    
    # Check if hero title appears
    if template['hero_title'].lower() not in html_content.lower():
        issues.append(f"Industry hero title '{template['hero_title']}' not found in content")
    
    return issues

def generate_demo(company_name, industry="general", style="modern"):
    """Main function to generate a demo"""
    try:
        # Get the template that will be used
        template = get_best_template_match(industry)
        
        # Generate the HTML content
        html_content, timestamp = generate_demo_html(company_name, industry, style)
        
        # Validate content matches industry
        validation_issues = validate_demo_content(html_content, company_name, industry, template)
        
        # Save the file
        filepath, filename = save_demo_file(html_content, company_name, industry, timestamp)
        
        # Generate URLs (assuming local development server)
        demo_url = f"http://localhost:8005/{filename}"
        
        result = {
            "success": True,
            "demo_url": demo_url,
            "demo_path": filepath,
            "filename": filename,
            "style": style,
            "industry": industry,
            "company_name": company_name,
            "timestamp": timestamp,
            "template_used": template['hero_title'],
            "message": f"Demo generated successfully for {company_name}"
        }
        
        # Add validation warnings if any
        if validation_issues:
            result["validation_warnings"] = validation_issues
            result["message"] += f" (⚠️ {len(validation_issues)} validation warnings)"
        
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "company_name": company_name,
            "industry": industry
        }

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python3 create_industry_demo_templates.py <company_name> <industry> [style]")
        sys.exit(1)
    
    company_name = sys.argv[1]
    industry = sys.argv[2]
    style = sys.argv[3] if len(sys.argv) > 3 else "modern"
    
    result = generate_demo(company_name, industry, style)
    print(json.dumps(result, indent=2)) 