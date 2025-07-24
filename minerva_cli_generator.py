#!/usr/bin/env python3
"""
Minerva CLI Generator - Simplified command-line interface for demo generation
Supports template-style storefront and stylized presets
"""

import os
import sys
import json
import argparse
import random
from datetime import datetime
from typing import Dict, List, Optional

# Template-style prompts for professional demos
OCCUPATION_PROMPTS = {
    "bakery": {
        "presets": {
            "storefront": {
                "prompt": "Template-style storefront hero banner for an artisan bakery, clean layout, neutral palette, professional website design",
                "description": "Welcome to {{company_name}}—freshly baked goodness baked daily just for you!"
            },
            "stylized": {
                "prompt": "UI concept hero banner with heart-shaped artisan loaf on pastel background, stylish, minimal, modern web design",
                "description": "Indulge in artisan bread crafted with love at {{company_name}}."
            }
        }
    },
    "plumbing": {
        "presets": {
            "storefront": {
                "prompt": "Template-style storefront hero banner for a professional plumbing service, clean layout, neutral palette, trustworthy design",
                "description": "Your neighborhood plumbing experts—fast, reliable service when you need it!"
            },
            "stylized": {
                "prompt": "UI concept hero banner with modern plumbing tools on clean background, professional, sleek web design",
                "description": "Professional plumbing solutions for {{company_name}}—we fix it right the first time."
            }
        }
    },
    "landscaping": {
        "presets": {
            "storefront": {
                "prompt": "Template-style storefront hero banner for a premium landscaping company, clean layout, neutral palette, nature-inspired",
                "description": "Transforming outdoor spaces into lush, vibrant landscapes."
            },
            "stylized": {
                "prompt": "UI concept hero banner with geometric garden elements on gradient background, modern, eco-friendly design",
                "description": "Creating beautiful outdoor environments at {{company_name}}—where nature meets design."
            }
        }
    },
    "dental": {
        "presets": {
            "storefront": {
                "prompt": "Template-style storefront hero banner for a modern dental practice, clean layout, neutral palette, medical professional",
                "description": "Gentle, comprehensive dental care for the whole family at {{company_name}}."
            },
            "stylized": {
                "prompt": "UI concept hero banner with minimalist dental icons on soft blue background, modern healthcare design",
                "description": "Your smile is our priority—expert dental care at {{company_name}}."
            }
        }
    },
    "general": {
        "presets": {
            "storefront": {
                "prompt": "Template-style storefront hero banner for a professional business, clean layout, neutral palette, trustworthy design",
                "description": "Professional services from {{company_name}}—your trusted local business."
            },
            "stylized": {
                "prompt": "UI concept hero banner with modern business elements on clean background, professional web design",
                "description": "Quality service and exceptional results from {{company_name}}."
            }
        }
    }
}

def get_prompts_for_business(industry: str, style: str = "storefront") -> Dict[str, str]:
    """Get the appropriate prompts for a business type and style"""
    business_key = industry.lower() if industry else "general"
    config = OCCUPATION_PROMPTS.get(business_key, OCCUPATION_PROMPTS["general"])
    
    if style in config["presets"]:
        return config["presets"][style]
    
    # Default to storefront style
    return config["presets"]["storefront"]

def generate_demo_html(company_name: str, industry: str, style: str = "storefront") -> str:
    """Generate a simple demo HTML page"""
    prompts = get_prompts_for_business(industry, style)
    description = prompts["description"].replace("{{company_name}}", company_name)
    
    # Simple HTML template with mobile-first design
    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{company_name} - Professional {industry.title()} Services</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
        }}
        
        .hero {{
            position: relative;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 100px 20px;
            min-height: 60vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }}
        
        .hero-content {{
            max-width: 800px;
            margin: 0 auto;
        }}
        
        .hero h1 {{
            font-size: 3rem;
            margin-bottom: 1rem;
            font-weight: 700;
        }}
        
        .hero p {{
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }}
        
        .cta-button {{
            display: inline-block;
            padding: 15px 30px;
            background: #ff6b6b;
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            transition: transform 0.3s ease;
        }}
        
        .cta-button:hover {{
            transform: translateY(-2px);
        }}
        
        .features {{
            padding: 80px 20px;
            background: #f8f9fa;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        
        .features-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 40px;
        }}
        
        .feature {{
            text-align: center;
            padding: 30px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }}
        
        .feature h3 {{
            color: #667eea;
            margin-bottom: 15px;
        }}
        
        @media (max-width: 768px) {{
            .hero h1 {{
                font-size: 2rem;
            }}
            
            .hero p {{
                font-size: 1rem;
            }}
            
            .hero {{
                padding: 60px 20px;
                min-height: 50vh;
            }}
        }}
    </style>
</head>
<body>
    <section class="hero">
        <div class="hero-content">
            <h1>{company_name}</h1>
            <p>{description}</p>
            <a href="#contact" class="cta-button">Get Started Today</a>
        </div>
    </section>
    
    <section class="features">
        <div class="container">
            <div class="features-grid">
                <div class="feature">
                    <h3>Professional Service</h3>
                    <p>Expert solutions tailored to your needs with years of experience in the industry.</p>
                </div>
                <div class="feature">
                    <h3>Local Expertise</h3>
                    <p>Proudly serving our community with personalized, friendly service you can trust.</p>
                </div>
                <div class="feature">
                    <h3>Quality Guaranteed</h3>
                    <p>We stand behind our work with comprehensive warranties and satisfaction guarantees.</p>
                </div>
            </div>
        </div>
    </section>
</body>
</html>"""
    
    return html_template

def main():
    parser = argparse.ArgumentParser(description='Generate professional website demos with template-style design')
    parser.add_argument('--company-name', required=True, help='Name of the company')
    parser.add_argument('--industry', required=True, help='Industry/business type')
    parser.add_argument('--style', choices=['storefront', 'stylized'], default='storefront', 
                       help='Style preset: storefront (clean template) or stylized (UI concept)')
    parser.add_argument('--output-mode', choices=['api', 'file'], default='file',
                       help='Output mode: api (JSON response) or file (save to disk)')
    parser.add_argument('--output-dir', default='demos', help='Output directory for demo files')
    
    args = parser.parse_args()
    
    try:
        # Generate the demo HTML
        html_content = generate_demo_html(args.company_name, args.industry, args.style)
        
        if args.output_mode == 'api':
            # API mode: return JSON response
            company_slug = args.company_name.lower().replace(' ', '-').replace('&', 'and')
            demo_filename = f"{company_slug}-{args.style}-{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
            
            # Save to output directory
            os.makedirs(args.output_dir, exist_ok=True)
            demo_path = os.path.join(args.output_dir, demo_filename)
            
            with open(demo_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            # Return JSON response
            result = {
                "success": True,
                "demo_url": f"http://localhost:8005/{demo_filename}",
                "demo_path": demo_path,
                "style": args.style,
                "company_name": args.company_name,
                "industry": args.industry,
                "message": f"Professional {args.style} demo created for {args.company_name}"
            }
            
            print(json.dumps(result))
            
        else:
            # File mode: save to disk
            company_slug = args.company_name.lower().replace(' ', '-').replace('&', 'and')
            demo_filename = f"{company_slug}-{args.style}.html"
            demo_path = os.path.join(args.output_dir, demo_filename)
            
            os.makedirs(args.output_dir, exist_ok=True)
            
            with open(demo_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            print(f"✅ Demo generated: {demo_path}")
    
    except Exception as e:
        if args.output_mode == 'api':
            error_result = {
                "success": False,
                "error": str(e),
                "message": f"Failed to generate demo for {args.company_name}"
            }
            print(json.dumps(error_result))
        else:
            print(f"❌ Error generating demo: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 