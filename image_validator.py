#!/usr/bin/env python3
"""
Image Validator for Minerva - Ensures hero images match business types
Prevents electrician images showing up for plumbers, etc.
"""

import requests
import logging
from typing import Dict, List, Optional
import json
import os

logger = logging.getLogger(__name__)

class ImageValidator:
    """
    Validates that hero images are appropriate for business types
    """
    
    def __init__(self):
        # Curated, verified image collections for each business type
        self.verified_images = {
            'plumbing': [
                {
                    'url': 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=1200&h=600',
                    'description': 'Professional plumber working on pipes',
                    'verified': True
                },
                {
                    'url': 'https://images.unsplash.com/photo-1584622781564-1d987eb5741c?auto=format&fit=crop&w=1200&h=600',
                    'description': 'Plumbing tools and fixtures',
                    'verified': True
                },
                {
                    'url': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&h=600',
                    'description': 'Water pipe installation',
                    'verified': True
                }
            ],
            
            'electrical': [
                {
                    'url': 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&h=600',
                    'description': 'Electrician working on electrical panel',
                    'verified': True
                },
                {
                    'url': 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?auto=format&fit=crop&w=1200&h=600',
                    'description': 'Electrical wiring and tools',
                    'verified': True
                }
            ],
            
            'restaurant': [
                {
                    'url': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&h=600',
                    'description': 'Modern restaurant interior',
                    'verified': True
                },
                {
                    'url': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&h=600',
                    'description': 'Restaurant table setting',
                    'verified': True
                }
            ],
            
            'landscaping': [
                {
                    'url': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1200&h=600',
                    'description': 'Beautiful landscaped garden',
                    'verified': True
                },
                {
                    'url': 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&h=600',
                    'description': 'Professional lawn care',
                    'verified': True
                }
            ],
            
            'dental': [
                {
                    'url': 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&h=600',
                    'description': 'Clean modern dental office',
                    'verified': True
                },
                {
                    'url': 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=1200&h=600',
                    'description': 'Dental equipment and tools',
                    'verified': True
                }
            ]
        }
        
        # Fallback professional images if specific type not available
        self.fallback_images = [
            {
                'url': 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=1200&h=600',
                'description': 'Professional office building',
                'verified': True
            },
            {
                'url': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&h=600',
                'description': 'Modern business workspace',
                'verified': True
            }
        ]
    
    def get_validated_image(self, business_type: str) -> Dict:
        """
        Get a validated, relevant image for the business type
        """
        try:
            # Get images for this business type
            type_images = self.verified_images.get(business_type, [])
            
            if not type_images:
                logger.warning(f"⚠️ No specific images for {business_type}, using fallback")
                type_images = self.fallback_images
            
            # For now, use the first image (later we can randomize)
            selected_image = type_images[0]
            
            # Validate the URL is still accessible
            if self.validate_image_url(selected_image['url']):
                logger.info(f"✅ Validated image for {business_type}: {selected_image['description']}")
                return selected_image
            else:
                # Try fallback images
                for fallback in self.fallback_images:
                    if self.validate_image_url(fallback['url']):
                        logger.warning(f"⚠️ Using fallback image for {business_type}")
                        return fallback
                
                # If all else fails, return a basic placeholder
                return {
                    'url': 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" fill="%23f3f4f6"><rect width="100%" height="100%"/><text x="50%" y="50%" text-anchor="middle" fill="%23374151">Professional Service Image</text></svg>',
                    'description': 'Professional service placeholder',
                    'verified': False
                }
                
        except Exception as e:
            logger.error(f"❌ Image validation failed: {e}")
            return self.fallback_images[0]
    
    def validate_image_url(self, url: str) -> bool:
        """
        Check if an image URL is accessible and returns an image
        """
        try:
            response = requests.head(url, timeout=5)
            
            # Check if URL is accessible
            if response.status_code != 200:
                return False
            
            # Check if it's actually an image
            content_type = response.headers.get('content-type', '')
            if not content_type.startswith('image/'):
                return False
            
            return True
            
        except Exception as e:
            logger.warning(f"⚠️ Could not validate image URL {url}: {e}")
            return False
    
    def test_all_images(self) -> Dict:
        """
        Test all stored images to verify they're still working
        """
        results = {
            'total_tested': 0,
            'successful': 0,
            'failed': [],
            'by_type': {}
        }
        
        print("🧪 Testing all validated images...")
        
        for business_type, images in self.verified_images.items():
            type_results = {'tested': 0, 'working': 0, 'broken': []}
            
            print(f"\n🔍 Testing {business_type} images:")
            
            for img in images:
                type_results['tested'] += 1
                results['total_tested'] += 1
                
                if self.validate_image_url(img['url']):
                    type_results['working'] += 1
                    results['successful'] += 1
                    print(f"  ✅ {img['description']}")
                else:
                    type_results['broken'].append(img)
                    results['failed'].append({
                        'business_type': business_type,
                        'image': img
                    })
                    print(f"  ❌ {img['description']} - URL broken")
            
            results['by_type'][business_type] = type_results
        
        print(f"\n📊 Results: {results['successful']}/{results['total_tested']} images working")
        
        if results['failed']:
            print(f"⚠️ {len(results['failed'])} broken images need attention")
        
        return results

if __name__ == "__main__":
    validator = ImageValidator()
    
    # Test all images
    test_results = validator.test_all_images()
    
    # Show examples for each business type
    print("\n🎨 Example validated images:")
    for business_type in ['plumbing', 'electrical', 'restaurant', 'landscaping', 'dental']:
        image = validator.get_validated_image(business_type)
        print(f"  {business_type}: {image['description']}") 